import os
import pytest
from unittest.mock import patch


@pytest.fixture
def test_image():
    path = os.path.join(os.path.dirname(__file__), "test_photo.jpg")
    with open(path, "wb") as f:
        f.write(b"fake-image-data")
    yield path
    if os.path.exists(path):
        os.remove(path)


MOCK_AI = {
    "tools_needed": ["wrench", "plunger"],
    "steps": ["Step 1: Turn off water", "Step 2: Fix leak", "Step 3: Test"],
    "skills_needed": ["Fix leaky faucet", "Basic plumbing"],
    "difficulty": "medium",
    "estimated_time": "45 minutes",
    "safety_notes": "Wear gloves and eye protection",
    "chore_title": "Fix bathroom sink",
}


@pytest.fixture
def mock_ai():
    with patch("routes.chores.analyze_chore_images", return_value=MOCK_AI):
        yield


class TestChorePost:
    def test_post_with_photos(self, client, senior_user, test_image, mock_ai):
        with open(test_image, "rb") as f1, open(test_image, "rb") as f2:
            r = client.post("/chores/post", data={
                "senior_id": str(senior_user),
                "title": "Leaky faucet",
                "description": "Bathroom sink is dripping",
            }, files=[
                ("images", ("photo1.jpg", f1, "image/jpeg")),
                ("images", ("photo2.jpg", f2, "image/jpeg")),
            ])
        assert r.status_code == 200
        data = r.json()
        assert data["chore_id"] > 0
        assert data["ai_analysis"]["difficulty"] == "medium"
        assert "wrench" in data["ai_analysis"]["tools_needed"]
        assert data["ai_analysis"]["safety_notes"] == "Wear gloves and eye protection"

    def test_post_too_many_images(self, client, senior_user, test_image, mock_ai):
        with open(test_image, "rb") as f:
            files_data = [("images", (f"p{i}.jpg", f, "image/jpeg")) for i in range(4)]
            r = client.post("/chores/post", data={
                "senior_id": str(senior_user), "title": "Test", "description": "",
            }, files=files_data)
        assert r.status_code == 400

    def test_post_nonexistent_senior(self, client, test_image, mock_ai):
        with open(test_image, "rb") as f:
            r = client.post("/chores/post", data={
                "senior_id": "99999", "title": "Test", "description": "",
            }, files=[("images", ("p.jpg", f, "image/jpeg"))])
        assert r.status_code == 404

    def test_post_stores_media(self, client, senior_user, test_image, mock_ai):
        with open(test_image, "rb") as f:
            r = client.post("/chores/post", data={
                "senior_id": str(senior_user), "title": "Test", "description": "",
            }, files=[("images", ("photo.jpg", f, "image/jpeg"))])
        chore_id = r.json()["chore_id"]

        r = client.get(f"/chores/{chore_id}")
        data = r.json()
        assert len(data["media"]) == 1
        assert data["media"][0]["media_type"] == "photo"
        assert "photo.jpg" in data["media"][0]["file_path"]


class TestChoreRetrieval:
    def test_get_all_open(self, client, senior_user, test_image, mock_ai):
        with open(test_image, "rb") as f:
            for i in range(2):
                client.post("/chores/post", data={
                    "senior_id": str(senior_user),
                    "title": f"Chore {i}",
                    "description": "",
                }, files=[("images", ("p.jpg", f, "image/jpeg"))])

        r = client.get("/chores/all")
        assert r.status_code == 200
        chores = r.json()
        assert len(chores) == 2
        assert chores[0]["ai_difficulty"] == "medium"
        assert isinstance(chores[0]["ai_tools"], list)
        assert isinstance(chores[0]["ai_steps"], list)
        assert isinstance(chores[0]["ai_skills_needed"], list)
        assert len(chores[0]["media"]) == 1

    def test_get_by_id(self, client, senior_user, test_image, mock_ai):
        with open(test_image, "rb") as f:
            r = client.post("/chores/post", data={
                "senior_id": str(senior_user), "title": "Test", "description": "",
            }, files=[("images", ("p.jpg", f, "image/jpeg"))])
        chore_id = r.json()["chore_id"]

        r = client.get(f"/chores/{chore_id}")
        assert r.status_code == 200
        assert r.json()["title"] == "Test"

    def test_get_nonexistent(self, client):
        r = client.get("/chores/99999")
        assert r.status_code == 404

    def test_parsed_json_fields(self, client, senior_user, test_image, mock_ai):
        with open(test_image, "rb") as f:
            r = client.post("/chores/post", data={
                "senior_id": str(senior_user), "title": "Test", "description": "",
            }, files=[("images", ("p.jpg", f, "image/jpeg"))])
        chore_id = r.json()["chore_id"]

        r = client.get(f"/chores/{chore_id}")
        data = r.json()
        assert data["ai_tools"] == ["wrench", "plunger"]
        assert len(data["ai_steps"]) == 3
        assert data["ai_skills_needed"] == ["Fix leaky faucet", "Basic plumbing"]


class TestChoreClaimComplete:
    @pytest.fixture
    def open_chore(self, client, senior_user, test_image, mock_ai):
        with open(test_image, "rb") as f:
            r = client.post("/chores/post", data={
                "senior_id": str(senior_user), "title": "Claimable chore", "description": "",
            }, files=[("images", ("p.jpg", f, "image/jpeg"))])
        return r.json()["chore_id"]

    def test_claim_and_complete(self, client, open_chore, volunteer_user):
        r = client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        assert r.status_code == 200

        r = client.get(f"/chores/{open_chore}")
        assert r.json()["status"] == "claimed"
        assert r.json()["volunteer_id"] == volunteer_user

        r = client.post(f"/chores/{open_chore}/complete", params={"volunteer_id": volunteer_user})
        assert r.status_code == 200

    def test_claim_does_not_award_points(self, client, open_chore, volunteer_user):
        r = client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        assert r.status_code == 200

        r = client.get(f"/users/{volunteer_user}")
        assert r.status_code == 200
        assert r.json()["points"] == 0

        r = client.get(f"/chores/{open_chore}")
        assert r.json()["status"] == "claimed"

    def test_double_claim_rejected(self, client, open_chore, volunteer_user):
        client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        r = client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        assert r.status_code == 400

    def test_complete_before_claim_rejected(self, client, open_chore):
        r = client.post(f"/chores/{open_chore}/complete")
        assert r.status_code == 400

    def test_complete_without_volunteer_id(self, client, open_chore, volunteer_user):
        """Backward-compatible: complete derives volunteer from claimed chore."""
        client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        r = client.post(f"/chores/{open_chore}/complete")
        assert r.status_code == 200
        assert r.json()["message"] == "Chore marked ready for senior review"

    def test_complete_wrong_volunteer_rejected(self, client, open_chore, volunteer_user):
        client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        r = client.post(f"/chores/{open_chore}/complete", params={"volunteer_id": 99999})
        assert r.status_code == 400

    def test_double_complete_rejected(self, client, open_chore, volunteer_user):
        client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        client.post(f"/chores/{open_chore}/complete", params={"volunteer_id": volunteer_user})
        r = client.post(f"/chores/{open_chore}/complete", params={"volunteer_id": volunteer_user})
        assert r.status_code == 400

    def test_complete_race_gate(self, client, open_chore, volunteer_user):
        """Lost race: pre-check passes (status=claimed) but UPDATE rowcount=0."""
        from unittest.mock import patch, MagicMock

        client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})

        mock_cursor = MagicMock()
        mock_cursor.execute.return_value = mock_cursor
        mock_cursor.fetchone.return_value = {
            "id": open_chore, "status": "claimed", "volunteer_id": volunteer_user
        }
        mock_cursor.rowcount = 0

        mock_conn = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        with patch("routes.chores.get_db", return_value=mock_conn):
            r = client.post(f"/chores/{open_chore}/complete", params={"volunteer_id": volunteer_user})

        assert r.status_code == 400
        assert "race" in r.json()["detail"].lower()

    def test_complete_does_not_award_points_before_senior_review(self, client, open_chore, volunteer_user):
        client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        client.post(f"/chores/{open_chore}/complete", params={"volunteer_id": volunteer_user})

        r = client.get(f"/users/{volunteer_user}")
        assert r.json()["points"] == 0

        r = client.get(f"/chores/{open_chore}")
        assert r.json()["status"] == "pending_review"

    def test_senior_approval_awards_points(self, client, open_chore, volunteer_user, senior_user):
        client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": volunteer_user})
        client.post(f"/chores/{open_chore}/complete", params={"volunteer_id": volunteer_user})

        r = client.post(
            f"/chores/{open_chore}/review",
            params={"senior_id": senior_user, "approved": True},
            data={"review_text": "Looks good", "review_rating": "5"},
        )
        assert r.status_code == 200

        r = client.get(f"/users/{volunteer_user}")
        assert r.json()["points"] == 50

        r = client.get(f"/chores/{open_chore}")
        assert r.json()["status"] == "done"

    def test_claim_non_volunteer_rejected(self, client, open_chore, senior_user):
        r = client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": senior_user})
        assert r.status_code == 400

    def test_claim_nonexistent_volunteer_rejected(self, client, open_chore):
        r = client.post(f"/chores/{open_chore}/claim", params={"volunteer_id": 99999})
        assert r.status_code == 404


class TestChoreAIFallback:
    def test_fallback_on_no_images(self, client, senior_user):
        from services.ai_analyzer import _fallback_analysis
        with patch("routes.chores.analyze_chore_images", return_value=_fallback_analysis()):
            with open(os.path.join(os.path.dirname(__file__), "test_photo.jpg"), "wb") as f:
                f.write(b"x")
            with open(os.path.join(os.path.dirname(__file__), "test_photo.jpg"), "rb") as f:
                r = client.post("/chores/post", data={
                    "senior_id": str(senior_user), "title": "Fallback test", "description": "",
                }, files=[("images", ("p.jpg", f, "image/jpeg"))])
            assert r.status_code == 200
            assert r.json()["ai_analysis"]["difficulty"] == "medium"


class TestVolunteerMatching:
    def test_normalized_skill_match(self, client, volunteer_user):
        """Skills with case/whitespace differences should still match."""
        import json
        from models.database import get_db

        client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [1],  # "Fix leaky faucet"
            "organizations": [],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "3_to_5"
        })

        # Insert a chore with varied-case AI skills
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, role) VALUES (?, ?, ?)",
            ("Test Senior", "ts@test.com", "senior")
        )
        senior_id = cursor.lastrowid
        cursor.execute("""
            INSERT INTO chores (senior_id, title, ai_skills_needed, ai_tools, ai_steps, status)
            VALUES (?, ?, ?, ?, ?, 'open')
        """, (
            senior_id,
            "Leaky sink",
            json.dumps(["  FIX LEAKY FAUCET  ", "Basic plumbing"]),
            json.dumps(["wrench"]),
            json.dumps(["Step 1"]),
        ))
        chore_id = cursor.lastrowid
        conn.commit()
        conn.close()

        r = client.get(f"/volunteers/match/{chore_id}")
        assert r.status_code == 200
        data = r.json()
        assert len(data["matches"]) == 1
        match = data["matches"][0]
        assert "  FIX LEAKY FAUCET  " in match["matching_skills"]
        assert match["matching_skill_count"] == 1
        assert match["volunteer_id"] == volunteer_user

    def test_no_match_volunteer(self, client, volunteer_user):
        """Volunteer with no overlapping skills gets match_explanation but no matching_skills."""
        import json
        from models.database import get_db

        client.post("/profiles/community", json={
            "user_id": volunteer_user,
            "skill_ids": [7],  # "Deep cleaning"
            "organizations": [],
            "teaching_skill_ids": [],
            "learning_goal_ids": [],
            "availability_horizon": "1_year"
        })

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (name, email, role) VALUES (?, ?, ?)",
            ("S2", "s2@test.com", "senior")
        )
        senior_id = cursor.lastrowid
        cursor.execute("""
            INSERT INTO chores (senior_id, title, ai_skills_needed, ai_tools, ai_steps, status)
            VALUES (?, ?, ?, ?, ?, 'open')
        """, (
            senior_id,
            "Electrical work",
            json.dumps(["Basic electrical work"]),
            json.dumps(["screwdriver"]),
            json.dumps(["Step 1"]),
        ))
        chore_id = cursor.lastrowid
        conn.commit()
        conn.close()

        r = client.get(f"/volunteers/match/{chore_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["matches"][0]["matching_skill_count"] == 0
        assert data["matches"][0]["matching_skills"] == []


class TestRewards:
    def test_get_rewards(self, client):
        r = client.get("/rewards")
        assert r.status_code == 200
        rewards = r.json()
        assert len(rewards) == 6
        assert rewards[0]["title"] == "Free coffee"
        assert rewards[0]["points_needed"] == 50
        assert rewards[0]["business_name"] == "Main Street Cafe"
        assert all("id" in rw for rw in rewards)
        assert all("description" in rw for rw in rewards)

    def test_redeem_reward_spends_points(self, client, volunteer_user):
        r = client.post("/rewards/1/redeem", params={"volunteer_id": volunteer_user})
        assert r.status_code == 400

        from models.database import get_db
        conn = get_db()
        conn.execute("UPDATE users SET points = 50 WHERE id = ?", (volunteer_user,))
        conn.commit()
        conn.close()

        r = client.post("/rewards/1/redeem", params={"volunteer_id": volunteer_user})
        assert r.status_code == 200
        data = r.json()
        assert data["reward_title"] == "Free coffee"
        assert data["remaining_points"] == 0
        assert data["redemption_code"].startswith("CHORE-")

        r = client.get(f"/users/{volunteer_user}")
        assert r.json()["points"] == 0

        r = client.get(f"/rewards/redemptions/{data['redemption_code']}")
        assert r.status_code == 200
        assert r.json()["status"] == "active"
        assert r.json()["reward_title"] == "Free coffee"

        r = client.post(f"/rewards/redemptions/{data['redemption_code']}/use")
        assert r.status_code == 200

        r = client.get(f"/rewards/redemptions/{data['redemption_code']}")
        assert r.json()["status"] == "used"

        r = client.post(f"/rewards/redemptions/{data['redemption_code']}/use")
        assert r.status_code == 400
