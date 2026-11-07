# Account API tests (Firebase email/password auth + /api/account profile)
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API_KEY = os.environ.get("NEXT_PUBLIC_FIREBASE_API_KEY")
FB = "https://identitytoolkit.googleapis.com/v1/accounts"


@pytest.fixture(scope="module")
def fb_user():
    email = f"cftest+api{int(time.time())}@example.com"
    r = requests.post(f"{FB}:signUp?key={API_KEY}", json={"email": email, "password": "secret123", "returnSecureToken": True})
    assert r.status_code == 200, r.text
    d = r.json()
    print("Created API test user:", email)
    return {"email": email, "token": d["idToken"]}


# Auth guard
def test_get_account_no_token():
    r = requests.get(f"{BASE_URL}/api/account")
    assert r.status_code == 401
    assert r.json()["error"] == "unauthorized"


def test_get_account_bad_token():
    r = requests.get(f"{BASE_URL}/api/account", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_post_account_no_token():
    r = requests.post(f"{BASE_URL}/api/account", json={"name": "X"})
    assert r.status_code == 401


# Profile create/read
def test_post_account_missing_name(fb_user):
    r = requests.post(f"{BASE_URL}/api/account", json={}, headers={"Authorization": f"Bearer {fb_user['token']}"})
    assert r.status_code == 400
    assert r.json()["error"] == "name-required"


def test_post_then_get_profile(fb_user):
    h = {"Authorization": f"Bearer {fb_user['token']}"}
    r = requests.post(f"{BASE_URL}/api/account", json={"name": "TEST Api User"}, headers=h)
    assert r.status_code == 200 and r.json()["ok"] is True
    g = requests.get(f"{BASE_URL}/api/account", headers=h)
    assert g.status_code == 200
    d = g.json()
    assert d["name"] == "TEST Api User"
    assert d["email"] == fb_user["email"]
    assert isinstance(d["createdAt"], int)
    created = d["createdAt"]
    # Update keeps createdAt
    requests.post(f"{BASE_URL}/api/account", json={"name": "TEST Renamed"}, headers=h)
    d2 = requests.get(f"{BASE_URL}/api/account", headers=h).json()
    assert d2["name"] == "TEST Renamed"
    assert d2["createdAt"] == created
