# AI Service Orchestrator for Informal Economy

An Agentic AI System built for **Hackathon AI Seekho** that automates the end-to-end lifecycle of a service request in the informal economy. It connects users with service providers (e.g., plumbers, electricians, beauticians) by understanding natural language requests, discovering the best providers, and simulating the booking process.

## 🚀 Features

- **Multi-lingual Intent Understanding**: Processes user requests in Urdu, Roman Urdu, and English using Google Gemini to extract service type, location, and preferred time.
- **Provider Discovery & Ranking**: Searches the database for matching providers and uses an AI agent to rank them based on rating and relevance, providing clear reasoning for the recommendation.
- **Action & Booking Simulation**: Automatically creates a booking in the system and simulates the confirmation process.
- **Follow-Up Automation**: Simulates scheduling reminders and follow-ups for completed or upcoming bookings.
- **Agentic Workflow**: Fully traceable multi-agent pipeline where every decision, tool usage, and action is logged and returned in the API response.

## 🛠️ Tech Stack

- **Backend Framework**: FastAPI (Python 3.12)
- **Database**: SQLite with SQLAlchemy ORM
- **AI Integration**: Google Gemini API (`google-genai` SDK)
- **Architecture**: Custom Multi-Agent Orchestrator

## 📁 Project Structure

```
backend/
├── agents.py       # Core Multi-Agent logic (Intent, Discovery, Booking, Follow-up)
├── database.py     # SQLite connection and session setup
├── main.py         # FastAPI application and API endpoints
├── models.py       # SQLAlchemy ORM models (Provider, Booking)
├── requirements.txt# Python dependencies
├── seed.py         # Script to populate the database with mock providers
└── test.py         # Simple test script to verify the API workflow
```

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have Python 3.10+ installed.

### 2. Clone and Setup Environment
Navigate to the project backend directory and create a virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Variables
Create a `.env` file in the `backend` directory and add your Google Gemini API Key:
```env
GEMINI_API_KEY="your-gemini-api-key-here"
```

### 5. Initialize the Database
Run the seed script to create the SQLite database (`orchestrator.db`) and populate it with mock service providers:
```bash
python seed.py
```

### 6. Run the Application
Start the FastAPI server:
```bash
python main.py
```
The server will start at `http://0.0.0.0:8000`.

## 🌐 API Usage

The system exposes a single primary endpoint to interact with the orchestrator.

### `POST /process_request`
Processes a natural language service request through the multi-agent pipeline.

**Request:**
```json
{
  "user_input": "Mujhe kal subah G-13 mein AC technician chahiye"
}
```

**Response:**
Returns a comprehensive JSON object detailing the extracted intent, recommended provider, simulated booking status, and a full array of `Traceable Logs` documenting every step the AI agents took.

## 🧪 Testing
You can quickly test the agent pipeline by running:
```bash
python test.py
```
This will send a sample request to the local server and print out the formatted JSON response.