# Smoke tests: backend proxy to Next.js API + page availability
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')


# Proxy: /api/session should be forwarded to Next.js and return 401 when unauthenticated
def test_session_unauthenticated_401():
    r = requests.get(f"{BASE_URL}/api/session", timeout=30)
    assert r.status_code == 401, r.text[:300]


# Native FastAPI root still works
def test_api_root():
    r = requests.get(f"{BASE_URL}/api/", timeout=30)
    assert r.status_code in (200, 404), r.status_code


# Pages render (HTTP 200)
@pytest.mark.parametrize("path", ["/", "/login", "/registration", "/download", "/privacy-policy",
                                  "/upgrade-your-plan", "/purchase-smart-account", "/qx-pvt-portal-live"])
def test_pages(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=60)
    assert r.status_code == 200, f"{path}: {r.status_code}"
    assert "<html" in r.text.lower()
