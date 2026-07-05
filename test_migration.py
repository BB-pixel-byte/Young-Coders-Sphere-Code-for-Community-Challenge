import os
import sqlite3


def test_migration_from_volunteer_skills(monkeypatch):
    db_path = os.path.join(os.path.dirname(__file__), "migration_test.db")
    if os.path.exists(db_path):
        os.remove(db_path)
    monkeypatch.setenv("CHOREMAP_DB_PATH", db_path)

    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, points INTEGER DEFAULT 0)")
    conn.execute("CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY, name TEXT, category TEXT)")
    conn.execute("CREATE TABLE IF NOT EXISTS volunteer_skills (id INTEGER PRIMARY KEY, volunteer_id INTEGER, skill_id INTEGER)")
    conn.execute("INSERT INTO users (id, name, email, role) VALUES (1, 'Alice', 'a@t.com', 'volunteer')")
    conn.execute("INSERT INTO users (id, name, email, role) VALUES (2, 'Bob', 'b@t.com', 'volunteer')")
    conn.execute("INSERT INTO skills (id, name, category) VALUES (1, 'Fix leaky faucet', 'Home Repairs')")
    conn.execute("INSERT INTO skills (id, name, category) VALUES (2, 'Patch drywall', 'Home Repairs')")
    conn.execute("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (1, 1)")
    conn.execute("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (1, 2)")
    conn.execute("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (2, 1)")
    conn.commit()
    conn.close()

    from models.database import init_db
    init_db()

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    tbl = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='volunteer_skills'").fetchall()
    assert not tbl

    rows = c.execute("SELECT user_id, skill_id FROM user_skills ORDER BY user_id, skill_id").fetchall()
    assert rows == [(1, 1), (1, 2), (2, 1)]
    conn.close()

    os.remove(db_path)


def test_migration_filters_orphan_rows(monkeypatch):
    db_path = os.path.join(os.path.dirname(__file__), "migration_orphan.db")
    if os.path.exists(db_path):
        os.remove(db_path)
    monkeypatch.setenv("CHOREMAP_DB_PATH", db_path)

    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, points INTEGER DEFAULT 0)")
    conn.execute("CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY, name TEXT, category TEXT)")
    conn.execute("CREATE TABLE IF NOT EXISTS volunteer_skills (id INTEGER PRIMARY KEY, volunteer_id INTEGER, skill_id INTEGER)")
    conn.execute("INSERT INTO users (id, name, email, role) VALUES (1, 'Alice', 'a@t.com', 'volunteer')")
    conn.execute("INSERT INTO skills (id, name, category) VALUES (1, 'Fix leaky faucet', 'Home Repairs')")
    conn.execute("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (1, 1)")
    conn.execute("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (999, 1)")
    conn.execute("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (1, 999)")
    conn.commit()
    conn.close()

    from models.database import init_db
    init_db()

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    rows = c.execute("SELECT user_id, skill_id FROM user_skills").fetchall()
    assert rows == [(1, 1)]
    tbl = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='volunteer_skills'").fetchall()
    assert not tbl
    conn.close()

    os.remove(db_path)


def test_migration_idempotent(monkeypatch):
    db_path = os.path.join(os.path.dirname(__file__), "migration_idem.db")
    if os.path.exists(db_path):
        os.remove(db_path)
    monkeypatch.setenv("CHOREMAP_DB_PATH", db_path)

    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, points INTEGER DEFAULT 0)")
    conn.execute("CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY, name TEXT, category TEXT)")
    conn.execute("CREATE TABLE IF NOT EXISTS volunteer_skills (id INTEGER PRIMARY KEY, volunteer_id INTEGER, skill_id INTEGER)")
    conn.execute("INSERT INTO users (id, name, email, role) VALUES (1, 'Alice', 'a@t.com', 'volunteer')")
    conn.execute("INSERT INTO skills (id, name, category) VALUES (1, 'Fix leaky faucet', 'Home Repairs')")
    conn.execute("INSERT INTO volunteer_skills (volunteer_id, skill_id) VALUES (1, 1)")
    conn.commit()
    conn.close()

    from models.database import init_db
    init_db()
    init_db()

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    rows = c.execute("SELECT user_id, skill_id FROM user_skills").fetchall()
    assert rows == [(1, 1)]
    conn.close()

    os.remove(db_path)
