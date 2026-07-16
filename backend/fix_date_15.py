import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute("UPDATE field_tracking_adhocmeeting SET date='2026-06-08' WHERE id=15")
conn.commit()
print('Updated meeting 15 date to today')
