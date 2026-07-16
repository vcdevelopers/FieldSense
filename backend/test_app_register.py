import requests
import json
import uuid

base_url = "http://127.0.0.1:8000/api"

def test_register():
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "fullName": "Mobile User Test",
        "email": email,
        "mobileNumber": "1234567890",
        "password": "testpassword123"
    }
    
    print(f"Registering {email}...")
    try:
        response = requests.post(f"{base_url}/app-register/", json=payload)
        print("Status:", response.status_code)
        print("Response:", response.json())
        
        if response.status_code == 201:
            print("\nAttempting to log in...")
            login_payload = {
                "email": email,
                "password": "testpassword123"
            }
            login_response = requests.post(f"{base_url}/auth/login/", json=login_payload)
            print("Login Status:", login_response.status_code)
            if login_response.status_code == 200:
                print("Login successful! Token:", login_response.json().get('token', {}).get('access')[:20] + "...")
            else:
                print("Login failed:", login_response.text)
    except Exception as e:
        print("Error connecting to server:", e)

if __name__ == "__main__":
    test_register()
