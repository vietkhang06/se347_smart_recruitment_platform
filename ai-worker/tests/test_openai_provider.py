import unittest
from unittest.mock import MagicMock, patch

import httpx

from app.services.providers import (
    DETERMINISTIC_EMBEDDING_FALLBACK_MODEL,
    DETERMINISTIC_EMBEDDING_MODEL,
    OpenAIProvider,
)


class TestOpenAIProvider(unittest.TestCase):

    def test_empty_api_key_uses_fallback_and_reports_deterministic_model(self):
        provider = OpenAIProvider(api_key="")
        embeddings, model = provider.generate_embeddings_with_model(["Software Engineer with Python"])
        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 1536)
        self.assertEqual(model, DETERMINISTIC_EMBEDDING_MODEL)

    def test_none_texts_raises_value_error(self):
        provider = OpenAIProvider(api_key="test-key")
        with self.assertRaises(ValueError):
            provider.generate_embeddings(None)

    def test_empty_texts_returns_empty_list(self):
        provider = OpenAIProvider(api_key="test-key")
        self.assertEqual(provider.generate_embeddings([]), [])

    @patch("app.services.providers.httpx.post")
    def test_successful_openai_api_call_and_batch(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_vec1 = [0.01] * 1536
        mock_vec2 = [0.02] * 1536
        mock_response.json.return_value = {
            "data": [{"embedding": mock_vec1}, {"embedding": mock_vec2}]
        }
        mock_post.return_value = mock_response

        provider = OpenAIProvider(api_key="sk-valid-key")
        embeddings, model = provider.generate_embeddings_with_model(["First input", "Second input"])

        self.assertEqual(model, "text-embedding-3-small")
        self.assertEqual(len(embeddings), 2)
        self.assertEqual(len(embeddings[0]), 1536)
        self.assertEqual(embeddings[0], mock_vec1)
        self.assertEqual(embeddings[1], mock_vec2)
        mock_post.assert_called_once()

    @patch("app.services.providers.httpx.post")
    def test_connect_error_falls_back_resiliently(self, mock_post):
        mock_post.side_effect = httpx.ConnectError("Connection refused")

        provider = OpenAIProvider(api_key="sk-broken-key", allow_fallback=True)
        embeddings, model = provider.generate_embeddings_with_model(["Test input under network partition"])

        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 1536)
        self.assertEqual(model, DETERMINISTIC_EMBEDDING_FALLBACK_MODEL)

    @patch("app.services.providers.httpx.post")
    def test_timeout_falls_back_or_raises_when_fallback_disabled(self, mock_post):
        mock_post.side_effect = httpx.TimeoutException("Request timed out")

        provider_fallback = OpenAIProvider(api_key="sk-key", allow_fallback=True)
        embeddings, model = provider_fallback.generate_embeddings_with_model(["Timeout input"])
        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 1536)
        self.assertEqual(model, DETERMINISTIC_EMBEDDING_FALLBACK_MODEL)

        provider_strict = OpenAIProvider(api_key="sk-key", allow_fallback=False)
        with self.assertRaises(RuntimeError):
            provider_strict.generate_embeddings_with_model(["Timeout input"])

    @patch("app.services.providers.httpx.post")
    def test_http_401_429_500_fall_back_resiliently(self, mock_post):
        for status_code in (401, 429, 500):
            mock_response = MagicMock()
            mock_response.status_code = status_code
            mock_post.return_value = mock_response

            provider = OpenAIProvider(api_key="sk-key", allow_fallback=True)
            embeddings, model = provider.generate_embeddings_with_model(["HTTP error input"])
            self.assertEqual(len(embeddings), 1)
            self.assertEqual(len(embeddings[0]), 1536)
            self.assertEqual(model, DETERMINISTIC_EMBEDDING_FALLBACK_MODEL)

    @patch("app.services.providers.httpx.post")
    def test_wrong_dimension_batch_mismatch_and_non_finite_trigger_fallback(self, mock_post):
        # 1. Wrong dimension
        mock_wrong_dim = MagicMock()
        mock_wrong_dim.status_code = 200
        mock_wrong_dim.json.return_value = {"data": [{"embedding": [0.05] * 512}]}
        mock_post.return_value = mock_wrong_dim

        provider = OpenAIProvider(api_key="sk-key", allow_fallback=True)
        embeddings, model = provider.generate_embeddings_with_model(["Wrong dim"])
        self.assertEqual(len(embeddings[0]), 1536)
        self.assertEqual(model, DETERMINISTIC_EMBEDDING_FALLBACK_MODEL)

        # 2. Batch count mismatch (requested 2, received 1)
        mock_short_batch = MagicMock()
        mock_short_batch.status_code = 200
        mock_short_batch.json.return_value = {"data": [{"embedding": [0.05] * 1536}]}
        mock_post.return_value = mock_short_batch

        embeddings, model = provider.generate_embeddings_with_model(["Item 1", "Item 2"])
        self.assertEqual(len(embeddings), 2)
        self.assertEqual(model, DETERMINISTIC_EMBEDDING_FALLBACK_MODEL)

        # 3. Non-finite values (NaN / Inf)
        mock_nan = MagicMock()
        mock_nan.status_code = 200
        bad_vec = [0.05] * 1536
        bad_vec[0] = float("nan")
        mock_nan.json.return_value = {"data": [{"embedding": bad_vec}]}
        mock_post.return_value = mock_nan

        embeddings, model = provider.generate_embeddings_with_model(["NaN value"])
        self.assertEqual(len(embeddings[0]), 1536)
        self.assertEqual(model, DETERMINISTIC_EMBEDDING_FALLBACK_MODEL)


if __name__ == "__main__":
    unittest.main()
