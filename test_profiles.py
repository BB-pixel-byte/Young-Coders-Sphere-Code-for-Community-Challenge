import pytest


class TestCommunityProfile:
    def test_submit_and_retrieve(self, client, volunteer_user):
        r = client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [1, 2, 7],
            "organizations": ["Neighborhood Watch", "Garden Club"],
            "teaching_skill_ids": [1],
            "learning_goal_ids": [5, 6],
            "availability_horizon": "3_to_5"
        })
        assert r.status_code == 200
        assert r.json()["message"] == "Community profile saved!"

        r = client.get(f"/profiles/{volunteer_user}")
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["id"] == volunteer_user
        assert len(data["skills"]) == 3
        assert data["skills"][1]["name"] == "Patch drywall"
        assert data["organizations"] == ["Garden Club", "Neighborhood Watch"]
        assert len(data["teaching"]) == 1
        assert data["teaching"][0]["name"] == "Fix leaky faucet"
        assert len(data["learning_goals"]) == 2
        assert data["availability_horizon"] == "3_to_5"

    def test_resave_replaces_cleanly(self, client, volunteer_user):
        client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [1, 2, 3, 4],
            "organizations": ["A", "B", "C"],
            "teaching_skill_ids": [1, 2],
            "learning_goal_ids": [7, 8, 9],
            "availability_horizon": "1_to_3"
        })

        client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [5],
            "organizations": ["X"],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "5_plus"
        })

        r = client.get(f"/profiles/{volunteer_user}")
        data = r.json()
        assert len(data["skills"]) == 1
        assert data["skills"][0]["name"] == "Trim hedges/trees"
        assert data["organizations"] == ["X"]
        assert data["teaching"] == []
        assert data["learning_goals"] == []
        assert data["availability_horizon"] == "5_plus"

    def test_empty_profile(self, client, volunteer_user):
        r = client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [],
            "organizations": [],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "1_year"
        })
        assert r.status_code == 200

        r = client.get(f"/profiles/{volunteer_user}")
        data = r.json()
        assert data["skills"] == []
        assert data["organizations"] == []
        assert data["teaching"] == []
        assert data["learning_goals"] == []
        assert data["availability_horizon"] == "1_year"

    def test_senior_can_have_profile(self, client, senior_user):
        r = client.post("/profiles/community", json={
            "user_id": senior_user,
            "skill_ids": [9],
            "organizations": ["Senior Center"],
            "teaching_skill_ids": [11],
            "learning_goal_ids": [10],
            "availability_horizon": "5_plus"
        })
        assert r.status_code == 200

        r = client.get(f"/profiles/{senior_user}")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "senior"

    def test_coordinator_profile(self, client, coordinator_user):
        r = client.post("/profiles/community", json={
            "user_id": coordinator_user,
            "skill_ids": [],
            "organizations": ["City Council"],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "5_plus"
        })
        assert r.status_code == 200


class TestProfileValidation:
    def test_invalid_horizon_rejected(self, client, volunteer_user):
        r = client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [1],
            "organizations": [],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "never"
        })
        assert r.status_code == 400

    def test_nonexistent_user_rejected(self, client):
        r = client.post("/profiles/community", json={
            "user_id": 99999,
            "skill_ids": [1],
            "organizations": [],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "1_year"
        })
        assert r.status_code == 404

    def test_nonexistent_user_get(self, client):
        r = client.get("/profiles/99999")
        assert r.status_code == 404

    def test_invalid_skill_id_rejected(self, client, volunteer_user):
        r = client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [999],
            "organizations": [],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "1_year"
        })
        assert r.status_code == 400

    def test_invalid_teaching_skill_rejected(self, client, volunteer_user):
        r = client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [1],
            "organizations": [],
            "teaching_skill_ids": [999],
            "learning_goal_ids": [],
            "availability_horizon": "1_year"
        })
        assert r.status_code == 400

    def test_duplicate_valid_skill_ids_accepted(self, client, volunteer_user):
        r = client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [1, 1, 2, 2],
            "organizations": [],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "1_year"
        })
        assert r.status_code == 200

        r = client.get(f"/profiles/{volunteer_user}")
        assert len(r.json()["skills"]) == 2  # deduped in DB by UNIQUE
