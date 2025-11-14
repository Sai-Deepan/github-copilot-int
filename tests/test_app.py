import pytest
from fastapi.testclient import TestClient
from copy import deepcopy

from src.app import app, activities


client = TestClient(app)


# Keep a copy of the initial activities to restore between tests
ORIGINAL_ACTIVITIES = deepcopy(activities)


@pytest.fixture(autouse=True)
def restore_activities():
    # Runs before each test, yields to test, then restores activities
    yield
    activities.clear()
    activities.update(deepcopy(ORIGINAL_ACTIVITIES))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # ensure one known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "teststudent@mergington.edu"

    # Ensure email not already registered
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]

    # Sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert "Signed up" in resp.json()["message"]

    # Confirm present
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email in resp.json()[activity]["participants"]

    # Unregister
    resp = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 200
    assert "Unregistered" in resp.json()["message"]

    # Confirm removed
    resp = client.get("/activities")
    assert resp.status_code == 200
    assert email not in resp.json()[activity]["participants"]


def test_signup_existing_returns_400():
    activity = "Chess Club"
    existing = ORIGINAL_ACTIVITIES[activity]["participants"][0]

    resp = client.post(f"/activities/{activity}/signup?email={existing}")
    assert resp.status_code == 400


def test_unregister_not_registered_returns_404():
    activity = "Chess Club"
    email = "notregistered@mergington.edu"

    resp = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 404


def test_activity_not_found():
    resp = client.post("/activities/NotAnActivity/signup?email=test@mergington.edu")
    assert resp.status_code == 404

    resp = client.delete("/activities/NotAnActivity/unregister?email=test@mergington.edu")
    assert resp.status_code == 404
