from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def test_conversational_flow():
    messages = []
    
    # Turn 1
    messages.append({"role": "user", "content": "Mujhe ek technician chahiye"})
    print(f"\nUser: {messages[-1]['content']}")
    response = client.post("/process_request", json={"messages": messages})
    res_data = response.json()
    print(f"AI: {res_data['reply']} (Complete: {res_data['is_complete']})")
    messages.append({"role": "assistant", "content": res_data['reply']})
    
    # Turn 2
    messages.append({"role": "user", "content": "AC theek karwana hai G-10 mein"})
    print(f"\nUser: {messages[-1]['content']}")
    response = client.post("/process_request", json={"messages": messages})
    res_data = response.json()
    print(f"AI: {res_data['reply']} (Complete: {res_data['is_complete']})")
    messages.append({"role": "assistant", "content": res_data['reply']})
    
    # Turn 3
    messages.append({"role": "user", "content": "Kal subah aa jaye"})
    print(f"\nUser: {messages[-1]['content']}")
    response = client.post("/process_request", json={"messages": messages})
    res_data = response.json()
    print(f"AI: {res_data['reply']} (Complete: {res_data['is_complete']})")
    
    if res_data['is_complete']:
        print("\nBooking Details:")
        print(json.dumps(res_data['action_data'], indent=2))

if __name__ == "__main__":
    test_conversational_flow()
