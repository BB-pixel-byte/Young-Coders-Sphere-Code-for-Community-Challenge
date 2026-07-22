import csv
import hashlib
import hmac
import io
import os
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

try:
    from ..models.database import get_db
except ImportError:  # pragma: no cover - fallback for direct script execution
    from models.database import get_db


router = APIRouter()
TOKEN_LIFETIME_SECONDS = 12 * 60 * 60


class VisitEvent(BaseModel):
    visitor_id: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    session_id: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    path: str = Field(default="/", max_length=240)
    referrer_host: str = Field(default="", max_length=200)


class AnalyticsLogin(BaseModel):
    password: str = Field(min_length=1, max_length=256)


def _admin_password() -> str:
    password = os.environ.get("ANALYTICS_PASSWORD", "").strip()
    if not password:
        raise HTTPException(
            status_code=503,
            detail="Private analytics is not configured yet.",
        )
    return password


def _create_token(password: str) -> tuple[str, int]:
    expires_at = int(time.time()) + TOKEN_LIFETIME_SECONDS
    payload = str(expires_at)
    signature = hmac.new(
        password.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{payload}.{signature}", expires_at


def require_analytics_admin(
    authorization: str | None = Header(default=None),
) -> None:
    password = _admin_password()
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Analytics access required")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        expires_text, supplied_signature = token.split(".", 1)
        expires_at = int(expires_text)
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid analytics access")

    expected_signature = hmac.new(
        password.encode("utf-8"), expires_text.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if expires_at < int(time.time()) or not hmac.compare_digest(
        supplied_signature, expected_signature
    ):
        raise HTTPException(status_code=401, detail="Analytics access expired")


@router.post("/visit", status_code=204)
def record_visit(event: VisitEvent):
    """Record anonymous, device-level traffic without names, email or IP data."""
    path = event.path if event.path.startswith("/") else "/"
    referrer = event.referrer_host.lower().removeprefix("www.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO analytics_visitors (visitor_id)
            VALUES (?)
            ON CONFLICT(visitor_id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
            """,
            (event.visitor_id,),
        )
        cursor.execute(
            """
            INSERT INTO analytics_sessions (session_id, visitor_id)
            VALUES (?, ?)
            ON CONFLICT(session_id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
            """,
            (event.session_id, event.visitor_id),
        )

        duplicate = cursor.execute(
            """
            SELECT id FROM analytics_page_views
            WHERE session_id = ? AND path = ?
              AND viewed_at >= datetime('now', '-5 seconds')
            LIMIT 1
            """,
            (event.session_id, path),
        ).fetchone()
        if not duplicate:
            cursor.execute(
                """
                INSERT INTO analytics_page_views
                    (visitor_id, session_id, path, referrer_host)
                VALUES (?, ?, ?, ?)
                """,
                (event.visitor_id, event.session_id, path, referrer),
            )
            cursor.execute(
                """UPDATE analytics_sessions
                   SET page_views = page_views + 1, last_seen = CURRENT_TIMESTAMP
                   WHERE session_id = ?""",
                (event.session_id,),
            )
        conn.commit()
    finally:
        conn.close()
    return Response(status_code=204)


@router.post("/login")
def analytics_login(credentials: AnalyticsLogin):
    expected = _admin_password()
    if not hmac.compare_digest(credentials.password, expected):
        raise HTTPException(status_code=401, detail="Incorrect analytics password")
    token, expires_at = _create_token(expected)
    return {
        "token": token,
        "expires_at": expires_at,
        "expires_in": TOKEN_LIFETIME_SECONDS,
    }


def _time_filter(column: str, days: int) -> tuple[str, list[str]]:
    if not days:
        return "", []
    return f" AND {column} >= datetime('now', ?)", [f"-{days} days"]


def _scalar(cursor, query: str, params=()) -> int:
    row = cursor.execute(query, params).fetchone()
    return int(row[0] or 0)


def _summary(days: int) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    try:
        view_filter, view_params = _time_filter("viewed_at", days)
        session_filter, session_params = _time_filter("started_at", days)
        user_filter, user_params = _time_filter("created_at", days)
        posted_filter, posted_params = _time_filter("created_at", days)
        claimed_filter, claimed_params = _time_filter(
            "COALESCE(claimed_at, created_at)", days
        )
        completed_filter, completed_params = _time_filter(
            "COALESCE(completed_at, created_at)", days
        )

        unique_visitors = _scalar(
            cursor,
            f"SELECT COUNT(DISTINCT visitor_id) FROM analytics_page_views WHERE 1=1{view_filter}",
            view_params,
        )
        sessions = _scalar(
            cursor,
            f"SELECT COUNT(*) FROM analytics_sessions WHERE 1=1{session_filter}",
            session_params,
        )
        page_views = _scalar(
            cursor,
            f"SELECT COUNT(*) FROM analytics_page_views WHERE 1=1{view_filter}",
            view_params,
        )
        returning_visitors = _scalar(
            cursor,
            f"""
            SELECT COUNT(*) FROM (
                SELECT visitor_id FROM analytics_sessions
                WHERE 1=1{session_filter}
                GROUP BY visitor_id HAVING COUNT(*) >= 2
            )
            """,
            session_params,
        )

        registered = _scalar(
            cursor,
            f"SELECT COUNT(*) FROM users WHERE 1=1{user_filter}",
            user_params,
        )
        roles = {"senior": 0, "volunteer": 0}
        for row in cursor.execute(
            f"SELECT role, COUNT(*) AS total FROM users WHERE 1=1{user_filter} GROUP BY role",
            user_params,
        ).fetchall():
            roles[row["role"]] = row["total"]

        active_query = f"""
            SELECT COUNT(DISTINCT user_id) FROM (
                SELECT senior_id AS user_id
                FROM chores WHERE 1=1{posted_filter}
                UNION
                SELECT volunteer_id AS user_id
                FROM chores
                WHERE volunteer_id IS NOT NULL{claimed_filter}
            )
        """
        activated = _scalar(
            cursor, active_query, [*posted_params, *claimed_params]
        )
        posted = _scalar(
            cursor,
            f"SELECT COUNT(*) FROM chores WHERE 1=1{posted_filter}",
            posted_params,
        )
        claimed = _scalar(
            cursor,
            f"SELECT COUNT(*) FROM chores WHERE volunteer_id IS NOT NULL{claimed_filter}",
            claimed_params,
        )
        completed = _scalar(
            cursor,
            f"SELECT COUNT(*) FROM chores WHERE status = 'done'{completed_filter}",
            completed_params,
        )

        visitor_conversion = round(registered / unique_visitors * 100, 1) if unique_visitors else 0
        activation_rate = round(activated / registered * 100, 1) if registered else 0
        completion_rate = round(completed / posted * 100, 1) if posted else 0

        today = datetime.now(timezone.utc).date()
        first_day = today - timedelta(days=13)
        daily = {
            (first_day + timedelta(days=offset)).isoformat(): {
                "date": (first_day + timedelta(days=offset)).isoformat(),
                "visitors": 0,
                "registrations": 0,
            }
            for offset in range(14)
        }
        for row in cursor.execute(
            """
            SELECT date(viewed_at) AS day, COUNT(DISTINCT visitor_id) AS total
            FROM analytics_page_views
            WHERE viewed_at >= date('now', '-13 days')
            GROUP BY date(viewed_at)
            """
        ).fetchall():
            if row["day"] in daily:
                daily[row["day"]]["visitors"] = row["total"]
        for row in cursor.execute(
            """
            SELECT date(created_at) AS day, COUNT(*) AS total
            FROM users
            WHERE created_at >= date('now', '-13 days')
            GROUP BY date(created_at)
            """
        ).fetchall():
            if row["day"] in daily:
                daily[row["day"]]["registrations"] = row["total"]

        sources = [
            {"source": row["source"], "visitors": row["visitors"]}
            for row in cursor.execute(
                f"""
                SELECT
                    CASE
                        WHEN referrer_host IS NULL OR referrer_host = ''
                            THEN 'Direct / shared link'
                        ELSE referrer_host
                    END AS source,
                    COUNT(DISTINCT visitor_id) AS visitors
                FROM analytics_page_views
                WHERE 1=1{view_filter}
                GROUP BY source
                ORDER BY visitors DESC, source ASC
                LIMIT 6
                """,
                view_params,
            ).fetchall()
        ]

        last_updated = cursor.execute(
            """
            SELECT MAX(recorded_at) FROM (
                SELECT MAX(viewed_at) AS recorded_at FROM analytics_page_views
                UNION ALL SELECT MAX(created_at) FROM users
                UNION ALL SELECT MAX(created_at) FROM chores
                UNION ALL SELECT MAX(claimed_at) FROM chores
                UNION ALL SELECT MAX(completed_at) FROM chores
            )
            """
        ).fetchone()[0]

        return {
            "period_days": days,
            "last_updated": last_updated,
            "traffic": {
                "unique_visitors": unique_visitors,
                "sessions": sessions,
                "page_views": page_views,
                "returning_visitors": returning_visitors,
            },
            "users": {
                "registered": registered,
                "activated": activated,
                "seniors": roles.get("senior", 0),
                "volunteers": roles.get("volunteer", 0),
            },
            "chores": {
                "posted": posted,
                "claimed": claimed,
                "completed": completed,
            },
            "rates": {
                "visitor_to_account": visitor_conversion,
                "account_activation": activation_rate,
                "chore_completion": completion_rate,
            },
            "daily": list(daily.values()),
            "sources": sources,
        }
    finally:
        conn.close()


@router.get("/summary", dependencies=[Depends(require_analytics_admin)])
def analytics_summary(days: int = Query(default=0, ge=0, le=3650)):
    return _summary(days)


@router.get("/export.csv", dependencies=[Depends(require_analytics_admin)])
def export_analytics(days: int = Query(default=0, ge=0, le=3650)):
    summary = _summary(days)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Chore4More pilot analytics"])
    writer.writerow(["Period", "All time" if not days else f"Last {days} days"])
    writer.writerow(["Last updated (UTC)", summary["last_updated"] or "No activity yet"])
    writer.writerow([])
    writer.writerow(["Metric", "Value"])
    for section in ("traffic", "users", "chores", "rates"):
        for metric, value in summary[section].items():
            writer.writerow([metric.replace("_", " ").title(), value])
    writer.writerow([])
    writer.writerow(["Date (UTC)", "Unique visitors", "Registrations"])
    for point in summary["daily"]:
        writer.writerow([point["date"], point["visitors"], point["registrations"]])

    filename = "chore4more-analytics-all-time.csv" if not days else f"chore4more-analytics-{days}-days.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
