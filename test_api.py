"""
Local API tests for SnapAlert backend.
Run: backend\.venv\Scripts\python test_api.py
"""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8000/api"


def get(path):
    r = urllib.request.urlopen(f"{BASE}{path}")
    return json.loads(r.read())


def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        r = urllib.request.urlopen(req)
        return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "detail": json.loads(e.read())}


def print_result(label, result):
    print(f"\n{'='*50}")
    print(f"  {label}")
    print(f"{'='*50}")
    print(json.dumps(result, indent=2, default=str))


# ── 1. Health Check ───────────────────────────────────────────────────────────
result = get("/health")
print_result("1. GET /api/health", result)
assert result["status"] == "ok", "Health check failed!"
print("  ✅ PASS")

# ── 2. Create User ────────────────────────────────────────────────────────────
user = post("/users", {
    "email": "test@snapalert.com",
    "name": "Test User",
    "phone_number": "+919346460532"
})
print_result("2. POST /api/users", user)
assert "id" in user, "User creation failed!"
user_id = user["id"]
print("  ✅ PASS")

# ── 3. Get User ───────────────────────────────────────────────────────────────
fetched = get(f"/users/{user_id}")
print_result("3. GET /api/users/{id}", fetched)
assert fetched["email"] == "test@snapalert.com", "Get user failed!"
print("  ✅ PASS")

# ── 4. List Users ─────────────────────────────────────────────────────────────
users_list = get("/users")
print_result("4. GET /api/users", users_list)
assert isinstance(users_list, list) and len(users_list) > 0, "List users failed!"
print("  ✅ PASS")

# ── 5. SnapAlert Settings ─────────────────────────────────────────────────────
settings = get(f"/snapalert/settings/{user_id}")
print_result("5. GET /api/snapalert/settings/{id}", settings)
assert settings["user_id"] == user_id, "Settings fetch failed!"
print("  ✅ PASS")

# ── 6. Update Preferences ─────────────────────────────────────────────────────
pref_result = post(f"/snapalert/preferences/{user_id}", {
    "city": "San Jose",
    "state": "CA",
    "min_price": 700000,
    "max_price": 1500000,
    "min_beds": 3,
    "min_baths": 2.0,
    "property_types": ["Single Family"],
    "keywords": ["pool", "garage", "modern"]
})
print_result("6. POST /api/snapalert/preferences/{id}", pref_result)
assert pref_result.get("status") == "updated", "Preference update failed!"
print("  ✅ PASS")

# ── 7. Alert History (empty) ──────────────────────────────────────────────────
alerts = get(f"/snapalert/alerts/{user_id}")
print_result("7. GET /api/snapalert/alerts/{id}", alerts)
assert isinstance(alerts, list), "Alert history failed!"
print("  ✅ PASS")

# ── 8. Stats ──────────────────────────────────────────────────────────────────
stats = get(f"/snapalert/stats/{user_id}")
print_result("8. GET /api/snapalert/stats/{id}", stats)
assert "total_alerts" in stats, "Stats failed!"
print("  ✅ PASS")

print("\n" + "="*50)
print("  ALL TESTS PASSED ✅")
print("="*50)
