import sqlite3
import json

conn = sqlite3.connect('db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cur.execute("SELECT id, meeting_title, status, date FROM field_tracking_adhocmeeting WHERE status='In Progress'")
rows = [dict(r) for r in cur.fetchall()]
print(json.dumps(rows, indent=2))

cur.execute("UPDATE field_tracking_adhocmeeting SET status='Completed' WHERE status='In Progress'")
conn.commit()
print("Updated all In Progress to Completed.")
