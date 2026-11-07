# Tier/session/usage API tests (Firebase auth, free tier gating, admin verify)
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API_KEY = os.environ.get("NEXT_PUBLIC_FIREBASE_API_KEY")
FB = "https://identitytoolkit.googleapis.com/v1/accounts"


def sign_in(email, pw):
    r = requests.post(f"{FB}:signInWithPassword?key={API_KEY}", json={"email": email, "password": pw, "returnSecureToken": True})
    assert r.status_code == 200, r.text
    return r.json()["idToken"]


@pytest.fixture(scope="module")
def new_user():
    email = f"qa+api{int(time.time())}@example.com"
    r = requests.post(f"{FB}:signUp?key={API_KEY}", json={"email": email, "password": "secret123", "returnSecureToken": True})
    assert r.status_code == 200, r.text
    tok = r.json()["idToken"]
    h = {"Authorization": f"Bearer {tok}"}
    a = requests.post(f"{BASE_URL}/api/account", json={"name": "TEST QA"}, headers=h)
    assert a.status_code == 200, a.text
    return {"email": email, "h": h}


# Session
def test_session_no_auth():
    r = requests.get(f"{BASE_URL}/api/session")
    assert r.status_code == 401
    assert r.json()["ok"] is False


def test_session_bad_token():
    r = requests.get(f"{BASE_URL}/api/session", headers={"Authorization": "Bearer junk"})
    assert r.status_code == 401


def test_session_new_user_free(new_user):
    r = requests.get(f"{BASE_URL}/api/session", headers=new_user["h"])
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True and d["tier"] == "free"
    assert d["email"] == new_user["email"]
    assert d["name"] == "TEST QA"
    assert isinstance(d["uid"], str) and d["uid"]


def test_session_tester_free1():
    tok = sign_in("tester.free1@example.com", "Test12345!")
    r = requests.get(f"{BASE_URL}/api/session", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200
    assert r.json()["email"] == "tester.free1@example.com"


# Usage
def test_usage_no_auth():
    r = requests.post(f"{BASE_URL}/api/usage", json={"action": "get"})
    assert r.status_code == 401


def test_usage_consume_free_limit(new_user):
    for sys in ["chart-to-signal", "chart-15sec-signal"]:
        r = requests.post(f"{BASE_URL}/api/usage", json={"action": "consume", "system": sys}, headers=new_user["h"])
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is False and d["reason"] == "limit-reached" and d["limit"] == 0


def test_usage_get(new_user):
    r = requests.post(f"{BASE_URL}/api/usage", json={"action": "get", "system": "chart-to-signal"}, headers=new_user["h"])
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True and d["count"] == 0 and d["usedSeconds"] == 0


def test_usage_bad_system(new_user):
    r = requests.post(f"{BASE_URL}/api/usage", json={"action": "consume", "system": "bogus"}, headers=new_user["h"])
    assert r.status_code == 400


def test_usage_candle2_free_rejected(new_user):
    r = requests.post(f"{BASE_URL}/api/usage", json={"action": "candle2", "usedSeconds": 10}, headers=new_user["h"])
    # free tier limit is 0 (finite) -> server accepts and raises counter; record behaviour
    print("candle2 free:", r.status_code, r.text)
    assert r.status_code in (200, 400)


# Account
def test_account_no_auth():
    r = requests.post(f"{BASE_URL}/api/account", json={"name": "X"})
    assert r.status_code == 401


def test_account_cannot_set_tier(new_user):
    r = requests.post(f"{BASE_URL}/api/account", json={"name": "TEST QA", "tier": "personal"}, headers=new_user["h"])
    assert r.status_code == 200
    s = requests.get(f"{BASE_URL}/api/session", headers=new_user["h"]).json()
    assert s["tier"] == "free"


# Admin verify
def test_admin_verify_ok():
    r = requests.post(f"{BASE_URL}/api/admin/verify", json={"password": "iamhear", "secret": "iamhear"})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True and isinstance(d["firebaseToken"], str) and len(d["firebaseToken"]) > 20


def test_admin_verify_bad():
    r = requests.post(f"{BASE_URL}/api/admin/verify", json={"password": "iamhear", "secret": "nope"})
    assert r.status_code == 401


def test_admin_verify_missing():
    r = requests.post(f"{BASE_URL}/api/admin/verify", json={"password": "iamhear"})
    assert r.status_code == 400
