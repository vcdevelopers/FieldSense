import requests
resp = requests.get('http://127.0.0.1:8000/api/field-tracking/admin/live/', headers={'X-User-Role': 'ADMIN'})
data = resp.json()
for emp in data:
    for t in emp.get('timeline', []):
        print("ID:", t['id'])
        print("ATT_URL:", t.get('attachment_url'))
        print("REP_DATA:", t.get('report_data'))
        print("---")
