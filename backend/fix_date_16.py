import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute("UPDATE field_tracking_adhocmeeting SET date='2026-06-08' WHERE id=16")
conn.commit()
print('Fixed meeting 16 date')
