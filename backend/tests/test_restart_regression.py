# Regression after server restart: proxy health, session auth guard, login user session
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API_KEY = os.environ.get("NEXT_PUBLIC_FIREBASE_API_KEY")
FB = "https://identitytoolkit.googleapis.com/v1/accounts"
EMAIL = "resettest.cf@example.com"
PW = "NewPass456!"


@pytest.fixture(scope="module")
def token():
    if not API_KEY:
        pytest.skip("NEXT_PUBLIC_FIREBASE_API_KEY not set")
    r = requests.post(f"{FB}:signInWithPassword?key={API_KEY}", json={"email": EMAIL, "password": PW, "returnSecureToken": True}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"firebase sign-in failed: {r.text[:200]}")
    return r.json()["idToken"]


# Pages load through ingress
@pytest.mark.parametrize("path", ["/", "/login", "/profile", "/auth-action?mode=resetPassword&oobCode=bogus"])
def test_pages_200(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=30)
    assert r.status_code == 200
    assert "<html" in r.text.lower()


# Session guard
def test_session_no_token_fast_401():
    t = time.time()
    r = requests.get(f"{BASE_URL}/api/session", timeout=10)
    assert r.status_code == 401
    assert r.json()["ok"] is False
    assert time.time() - t < 5


def test_session_bad_token_401():
    r = requests.get(f"{BASE_URL}/api/session", headers={"Authorization": "Bearer junk"}, timeout=10)
    assert r.status_code == 401


def test_account_post_no_token_401():
    r = requests.post(f"{BASE_URL}/api/account", json={"name": "X"}, timeout=10)
    assert r.status_code == 401


# Authenticated session for test user
def test_session_with_token(token):
    r = requests.get(f"{BASE_URL}/api/session", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("ok") is True
    print(d)
