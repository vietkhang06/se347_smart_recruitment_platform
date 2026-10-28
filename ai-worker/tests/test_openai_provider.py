import unittest
from unittest.mock import patch, MagicMock
import urllib.error

from app.services.providers import OpenAIProvider, DeterministicTestProvider


class TestOpenAIProvider(unittest.TestCase):

    def test_empty_api_key_uses_fallback(self):
        provider = OpenAIProvider(api_key="")
        embeddings = provider.generate_embeddings(["Software Engineer with Python"])
        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 1536)

    def test_none_texts_raises_value_error(self):
        provider = OpenAIProvider(api_key="test-key")
        with self.assertRaises(ValueError):
            provider.generate_embeddings(None)

    def test_empty_texts_returns_empty_list(self):
        provider = OpenAIProvider(api_key="test-key")
        self.assertEqual(provider.generate_embeddings([]), [])

    @patch("urllib.request.urlopen")
    def test_successful_openai_api_call(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_vector = [0.01] * 1536
        import json
        mock_response.read.return_value = json.dumps({
            "data": [{"embedding": mock_vector}]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        provider = OpenAIProvider(api_key="sk-valid-key")
        embeddings = provider.generate_embeddings(["Test input"])

        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 1536)
        self.assertEqual(embeddings[0], mock_vector)

    @patch("urllib.request.urlopen")
    def test_network_failure_falls_back_resiliently(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        provider = OpenAIProvider(api_key="sk-broken-key")
        embeddings = provider.generate_embeddings(["Test input under network partition"])

        # Should fall back cleanly to 1536d deterministic vector
        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 1536)

    @patch("urllib.request.urlopen")
    def test_wrong_dimension_from_api_triggers_fallback(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        import json
        # Mock returns 512 dimensions instead of 1536
        mock_response.read.return_value = json.dumps({
            "data": [{"embedding": [0.05] * 512}]
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        provider = OpenAIProvider(api_key="sk-key")
        embeddings = provider.generate_embeddings(["Test input wrong dimension"])

        # Should detect invalid dimension and fall back to 1536d deterministic vector
        self.assertEqual(len(embeddings), 1)
        self.assertEqual(len(embeddings[0]), 1536)


if __name__ == "__main__":
    unittest.main()
