# Read-only smoke tests (no Firebase writes): proxy auth errors + public pages
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')


# Account API: POST without token -> 401 JSON
def test_account_post_no_token():
    r = requests.post(f"{BASE_URL}/api/account", json={"name": "TEST_x"}, timeout=30)
    assert r.status_code == 401, r.text[:300]
    d = r.json()
    assert d.get("ok") is False and d.get("error") == "unauthorized"


# Account API: POST with bogus token -> 401 (exercises Firebase Admin verifyIdToken)
def test_account_post_bad_token():
    r = requests.post(f"{BASE_URL}/api/account", json={"name": "TEST_x"},
                      headers={"Authorization": "Bearer bogus"}, timeout=30)
    assert r.status_code == 401, r.text[:300]
    assert r.json().get("error") == "unauthorized"


# Account API: GET without token
def test_account_get_no_token():
    r = requests.get(f"{BASE_URL}/api/account", timeout=30)
    assert r.status_code in (401, 405), r.text[:300]


# Session without token -> 401
def test_session_no_token():
    r = requests.get(f"{BASE_URL}/api/session", timeout=30)
    assert r.status_code == 401
    assert "application/json" in r.headers.get("content-type", "")


# Public pages
@pytest.mark.parametrize("path", ["/", "/login", "/registration", "/privacy-policy", "/download", "/upgrade-your-plan"])
def test_public_pages(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=60)
    assert r.status_code == 200, f"{path}: {r.status_code}"
    assert "<html" in r.text.lower()
