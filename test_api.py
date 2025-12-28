import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_login():
    """Test user authentication"""
    response = requests.post(f"{BASE_URL}/api/auth/login/", json={
        "username": "admin",
        "password": "admin123", 
        "organization": "demo"
    })
    
    if response.status_code == 200:
        data = response.json()
        print("Login successful!")
        print(f"User: {data['user']['username']} ({data['user']['role']})")
        return data['token']
    else:
        print("Login failed:", response.text)
        return None

def test_create_conversation(token):
    """Test creating a conversation"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(f"{BASE_URL}/api/conversations/", 
        headers=headers,
        json={
            "post_type": "update",
            "title": "Q4 Planning Update",
            "content": "We've completed the initial planning for Q4. Key priorities include product launch, team expansion, and market research. Next steps: finalize budget allocation and assign project leads."
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        print("Conversation created!")
        print(f"Title: {data['title']}")
        return data['id']
    else:
        print("Conversation creation failed:", response.text)
        return None

def test_get_conversations(token):
    """Test retrieving conversations"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/api/conversations/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        conversations = data.get('results', data)  # Handle paginated response
        print(f"Retrieved {len(conversations)} conversations")
        for conv in conversations:
            print(f"  - {conv['post_type']}: {conv['title']}")
    else:
        print("Failed to get conversations:", response.text)

if __name__ == "__main__":
    print("Testing Recall API...")
    
    # Test authentication
    token = test_login()
    if not token:
        exit(1)
    
    # Test conversation creation
    conv_id = test_create_conversation(token)
    
    # Test conversation retrieval
    test_get_conversations(token)
    
    print("\nAll tests passed! Your knowledge-first collaboration platform is working!")