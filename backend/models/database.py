import os
import sqlite3


def get_db():
    db_path = os.environ.get("CHOREMAP_DB_PATH", "choremap.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            password TEXT,
            points INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            senior_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'other',
            urgency TEXT DEFAULT 'flexible',
            location TEXT,
            image_path TEXT,
            ai_tools TEXT,
            ai_steps TEXT,
            ai_skills_needed TEXT,
            ai_difficulty TEXT,
            ai_estimated_time TEXT,
            ai_safety_notes TEXT,
            status TEXT DEFAULT 'open',
            volunteer_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (senior_id) REFERENCES users(id)
        )
    """)

    for col, col_def in [
        ("ai_difficulty", "TEXT"),
        ("ai_estimated_time", "TEXT"),
        ("ai_safety_notes", "TEXT"),
        ("category", "TEXT DEFAULT 'other'"),
        ("urgency", "TEXT DEFAULT 'flexible'"),
        ("location", "TEXT"),
        ("claimed_at", "TIMESTAMP"),
        ("completed_at", "TIMESTAMP"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE chores ADD COLUMN {col} {col_def}")
        except sqlite3.OperationalError:
            pass

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analytics_visitors (
            visitor_id TEXT PRIMARY KEY,
            first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analytics_sessions (
            session_id TEXT PRIMARY KEY,
            visitor_id TEXT NOT NULL,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            page_views INTEGER DEFAULT 0,
            FOREIGN KEY (visitor_id) REFERENCES analytics_visitors(visitor_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analytics_page_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            path TEXT NOT NULL,
            referrer_host TEXT,
            viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (visitor_id) REFERENCES analytics_visitors(visitor_id),
            FOREIGN KEY (session_id) REFERENCES analytics_sessions(session_id)
        )
    """)

    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_analytics_views_time "
        "ON analytics_page_views(viewed_at)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor "
        "ON analytics_sessions(visitor_id)"
    )

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chore_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chore_id INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            media_type TEXT NOT NULL CHECK(media_type IN ('photo','video')),
            FOREIGN KEY (chore_id) REFERENCES chores(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            skill_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (skill_id) REFERENCES skills(id),
            UNIQUE(user_id, skill_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            organization_name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, organization_name)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_teaching (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            skill_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (skill_id) REFERENCES skills(id),
            UNIQUE(user_id, skill_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_learning_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            skill_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (skill_id) REFERENCES skills(id),
            UNIQUE(user_id, skill_id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_availability_horizon (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            horizon_bucket TEXT NOT NULL CHECK(horizon_bucket IN ('1_year','1_to_3','3_to_5','5_plus')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            points_needed INTEGER NOT NULL,
            business_name TEXT NOT NULL,
            description TEXT
        )
    """)

    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='volunteer_skills'
    """)
    if cursor.fetchone():
        cursor.execute("""
            INSERT OR IGNORE INTO user_skills (user_id, skill_id)
            SELECT vs.volunteer_id, vs.skill_id
            FROM volunteer_skills vs
            JOIN users u ON u.id = vs.volunteer_id
            JOIN skills s ON s.id = vs.skill_id
        """)
        cursor.execute("DROP TABLE volunteer_skills")
        print("Migrated volunteer_skills -> user_skills")

    cursor.execute("SELECT COUNT(*) FROM skills")
    if cursor.fetchone()[0] == 0:
        default_skills = [
            ("Fix leaky faucet", "Home Repairs"),
            ("Patch drywall", "Home Repairs"),
            ("Basic electrical work", "Home Repairs"),
            ("Mow lawn", "Yard & Outdoor"),
            ("Trim hedges/trees", "Yard & Outdoor"),
            ("Garden planting", "Yard & Outdoor"),
            ("Deep cleaning", "Cleaning & Organizing"),
            ("Decluttering/organizing", "Cleaning & Organizing"),
            ("Set up devices/WiFi", "Tech Help"),
            ("Help with phone/computer", "Tech Help"),
            ("Drive seniors to appointments", "Transportation"),
            ("Grocery runs", "Transportation"),
        ]
        cursor.executemany(
            "INSERT INTO skills (name, category) VALUES (?, ?)", default_skills
        )

    cursor.execute("SELECT COUNT(*) FROM rewards")
    if cursor.fetchone()[0] == 0:
        default_rewards = [
            (
                "Free coffee",
                50,
                "Main Street Cafe",
                "Enjoy a complimentary coffee at Main Street Cafe",
            ),
            (
                "10% off groceries",
                100,
                "Neighborhood Market",
                "Save 10% on your next grocery purchase",
            ),
            (
                "Free car wash",
                150,
                "Sparkle Auto Wash",
                "Get your car sparkling clean with a free exterior wash",
            ),
            (
                "Movie ticket",
                200,
                "Downtown Cinema",
                "One free admission to any regular screening",
            ),
            (
                "$25 restaurant voucher",
                300,
                "Local Bistro",
                "$25 off your meal at Local Bistro",
            ),
            (
                "Free haircut",
                250,
                "Community Barber Shop",
                "One complimentary haircut service",
            ),
        ]
        cursor.executemany(
            "INSERT INTO rewards (title, points_needed, business_name, description) VALUES (?, ?, ?, ?)",
            default_rewards,
        )

    conn.commit()
    conn.close()
    print("Database initialized!")
