from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def test_sso_flow():
    payload = {
        "type": "success",
        "data": {
            "scopes": [
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email",
                "openid",
                "profile",
                "email"
            ],
            "serverAuthCode": None,
            "idToken": "fake-token",
            "user": {
                "photo": "https://lh3.googleusercontent.com/a/ACg8ocJEZt-OR85zE9KQETLGMHWjVwyZWJvMOui4Akpjftb9NJAitQ=s96-c",
                "givenName": "Jazeb",
                "familyName": "Javed",
                "email": "jazebjaved52@gmail.com",
                "name": "Jazeb Javed",
                "id": "111359634341155102078"
            }
        }
    }

    print("\nSending SSO payload...")
    response = client.post("/sso_login", json=payload)
    res_data = response.json()
    print("Response from /sso_login:")
    print(json.dumps(res_data, indent=2))

if __name__ == "__main__":
    test_sso_flow()
