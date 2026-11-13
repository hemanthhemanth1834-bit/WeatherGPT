"""Central 8 KB request-body limit: oversized rejected, legitimate preserved."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
LIMIT = 8192


def _oversized_chat_body() -> bytes:
    query = "a" * (LIMIT + 200)
    return ('{"query":"' + query + '","language":"auto","persona":"general"}').encode(
        "utf-8"
    )


def test_oversized_json_body_is_rejected_before_routing():
    response = client.post(
        "/api/chat/query",
        content=_oversized_chat_body(),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert "exceeds 8192 bytes" in response.json()["detail"]


def test_small_legitimate_request_is_not_blocked():
    response = client.post(
        "/api/language/analyze",
        json={"text": "Will it rain in Vijayawada tomorrow?"},
    )
    assert response.status_code != 413
    assert response.status_code == 200


def test_boundary_sized_body_is_not_rejected_for_size():
    # A payload at the limit must reach validation, not the body guard.
    body = b'{"text":"' + b"a" * (LIMIT - 20) + b'"}'
    assert len(body) <= LIMIT
    response = client.post(
        "/api/language/analyze",
        content=body,
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code != 413


def test_get_requests_are_unaffected():
    response = client.get("/api/health/ready")
    assert response.status_code == 200


def test_invalid_content_length_header_returns_400():
    response = client.post(
        "/api/chat/query",
        content=b"{}",
        headers={"Content-Type": "application/json", "Content-Length": "not-a-number"},
    )
    assert response.status_code == 400
