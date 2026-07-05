import sqlite3

conn = sqlite3.connect("choremap.db")
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE chores ADD COLUMN spatial_asset_path TEXT")
    conn.commit()
    print("Spatial schema updated successfully!")
except sqlite3.OperationalError:
    print("Spatial column already exists.")

conn.close()