import requests

url = "http://127.0.0.1:8000/api/field-tracking/admin/live/?date=2026-06-19"
response = requests.get(url) # wait, I need auth!

print("Done")
