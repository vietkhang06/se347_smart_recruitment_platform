#!/usr/bin/env python3
"""Read-only HTTP smoke checks for currently implemented MatchaJob endpoints.

No auth/application writes, file uploads, database mutations, or external provider calls
are performed. The script reports unavailable local services as BLOCKED, not FAILED.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class Result:
    name: str
    status: str  # PASS, FAIL, BLOCKED, WARN
    detail: str


results: list[Result] = []


def request_json(base_url: str, path: str, timeout: float) -> tuple[int, dict[str, str], Any]:
    url = base_url.rstrip("/") + "/" + path.lstrip("/")
    req = Request(url, headers={"Accept": "application/json, application/problem+json"}, method="GET")
    try:
        with urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            headers = {k.lower(): v for k, v in response.headers.items()}
            try:
                body: Any = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                body = raw
            return response.status, headers, body
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        headers = {k.lower(): v for k, v in exc.headers.items()}
        try:
            body = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            body = raw
        return exc.code, headers, body


def record(name: str, status: str, detail: str) -> None:
    results.append(Result(name, status, detail))
    print(f"[{status}] {name}: {detail}")


def check_ai_health(ai_base: str, timeout: float) -> None:
    service_has_responded = False
    for path, expected in (("/health", "healthy"), ("/health/ready", "ready")):
        try:
            code, _headers, body = request_json(ai_base, path, timeout)
        except (URLError, TimeoutError, OSError) as exc:
            record(f"AI Worker GET {path}", "BLOCKED", f"service unavailable at {ai_base}: {exc}")
            continue
        service_has_responded = True
        actual = body.get("status") if isinstance(body, dict) else None
        if code == 200 and actual == expected:
            record(f"AI Worker GET {path}", "PASS", f"HTTP {code}, status={actual}")
        else:
            record(f"AI Worker GET {path}", "FAIL", f"expected HTTP 200/status={expected}; got HTTP {code}, body={body!r}")

    if service_has_responded:
        try:
            code, headers, body = request_json(ai_base, "/__contract_test_not_found__", timeout)
            content_type = headers.get("content-type", "")
            is_problem = isinstance(body, dict) and body.get("status") == 404 and "title" in body and "detail" in body
            if code == 404 and "application/problem+json" in content_type and is_problem:
                record("AI Worker unknown route error contract", "PASS", "HTTP 404 with application/problem+json shape")
            else:
                record("AI Worker unknown route error contract", "FAIL", f"expected RFC 7807-like 404; got HTTP {code}, content-type={content_type!r}, body={body!r}")
        except (URLError, TimeoutError, OSError) as exc:
            record("AI Worker unknown route error contract", "BLOCKED", str(exc))


def check_page(body: Any) -> str | None:
    if not isinstance(body, dict):
        return "response body is not a JSON object"
    required = {"content", "page", "size", "totalElements", "totalPages", "last"}
    missing = required - set(body)
    if missing:
        return f"missing PageResponse fields: {sorted(missing)}"
    if not isinstance(body["content"], list):
        return "content must be an array"
    if not isinstance(body["page"], int) or not isinstance(body["size"], int):
        return "page/size must be integers"
    if not isinstance(body["totalElements"], int) or not isinstance(body["totalPages"], int):
        return "totalElements/totalPages must be integers"
    if not isinstance(body["last"], bool):
        return "last must be boolean"
    return None


def check_backend(backend_base: str, timeout: float, legacy_diagnostic: bool) -> None:
    endpoints = [
        ("GET /v1/jobs?page=0&size=1", "/v1/jobs?page=0&size=1", "page"),
        ("GET /v1/categories", "/v1/categories", "list"),
        ("GET /v1/skills", "/v1/skills", "list"),
    ]
    any_backend_response = False
    for name, path, shape in endpoints:
        try:
            code, _headers, body = request_json(backend_base, path, timeout)
        except (URLError, TimeoutError, OSError) as exc:
            record(f"Backend {name}", "BLOCKED", f"service unavailable at {backend_base}: {exc}")
            continue
        any_backend_response = True
        if code != 200:
            detail = f"expected HTTP 200; got HTTP {code}, body={body!r}"
            if code == 404:
                detail += "; this can indicate the known context-path/controller-prefix mismatch"
            record(f"Backend {name}", "FAIL", detail)
            continue
        if shape == "page":
            error = check_page(body)
            if error:
                record(f"Backend {name} response shape", "FAIL", error)
            else:
                record(f"Backend {name} response shape", "PASS", "HTTP 200 and PageResponse fields/types are present")
                content = body.get("content", [])
                if content and isinstance(content[0], dict):
                    job = content[0]
                    for field in ("id", "companyId", "title", "level", "workType", "status", "skills"):
                        if field not in job:
                            record("Backend JobSummaryResponse shape", "FAIL", f"first content item missing {field!r}")
                            break
                    else:
                        record("Backend JobSummaryResponse shape", "PASS", "core JobSummaryResponse fields are present")
        else:
            if isinstance(body, list):
                record(f"Backend {name} response shape", "PASS", f"HTTP 200 and JSON array with {len(body)} item(s)")
            else:
                record(f"Backend {name} response shape", "FAIL", f"expected JSON array; got {type(body).__name__}")

    if legacy_diagnostic and any_backend_response:
        try:
            code, _headers, body = request_json(backend_base, "/api/v1/jobs?page=0&size=1", timeout)
            if code == 200:
                record("Legacy double-prefix diagnostic", "WARN", "GET base+/api/v1/jobs returned 200. Current controller mapping may be exposing /api/api/v1/jobs; fix mapping rather than adopting the double-prefix URL.")
            elif code == 404:
                record("Legacy double-prefix diagnostic", "PASS", "Legacy double-prefix path returned 404; this is expected after base-path correction")
            else:
                record("Legacy double-prefix diagnostic", "WARN", f"diagnostic path returned HTTP {code}; body={body!r}")
        except (URLError, TimeoutError, OSError) as exc:
            record("Legacy double-prefix diagnostic", "BLOCKED", str(exc))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-base", default=os.getenv("MATCHAJOB_BACKEND_BASE_URL", "http://localhost:8081/api"), help="Backend context-path base URL, default http://localhost:8081/api")
    parser.add_argument("--ai-base", default=os.getenv("MATCHAJOB_AI_BASE_URL", "http://localhost:8001"), help="AI Worker host URL, default http://localhost:8001")
    parser.add_argument("--timeout", type=float, default=3.0, help="Per-request timeout in seconds")
    parser.add_argument("--no-backend", action="store_true", help="Skip Backend checks")
    parser.add_argument("--no-ai", action="store_true", help="Skip AI Worker health/error checks")
    parser.add_argument("--no-legacy-diagnostic", action="store_true", help="Skip diagnostic request for the previously observed double-prefix route")
    args = parser.parse_args()

    print("MatchaJob read-only HTTP contract smoke test")
    print(f"Backend base: {args.backend_base}")
    print(f"AI Worker base: {args.ai_base}")
    print("No endpoint mutations, uploads, or provider-scoring calls will be made.\n")

    if not args.no_ai:
        check_ai_health(args.ai_base, args.timeout)
    if not args.no_backend:
        check_backend(args.backend_base, args.timeout, not args.no_legacy_diagnostic)

    counts = {key: sum(r.status == key for r in results) for key in ("PASS", "FAIL", "BLOCKED", "WARN")}
    print("\nSummary: " + ", ".join(f"{key}={value}" for key, value in counts.items()))
    if counts["FAIL"]:
        return 1
    if counts["BLOCKED"]:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
