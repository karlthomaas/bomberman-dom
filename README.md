# Bomberman Game

This project is a multiplayer Bomberman game with a React frontend and a Python backend using FastAPI and WebSockets.

## Project Structure

- `frontend/`: Contains the React frontend code
- `backend/`: Contains the Python backend code

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run start
   ```

   The frontend will be available at `http://localhost:9000`.

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS and Linux:
     ```
     source venv/bin/activate
     ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Start the backend server:
   ```
   fastapi dev
   ```

   The backend will be available at `http://localhost:8000`.

## Playing the Game

1. Open multiple browser windows and navigate to `http://localhost:1234`.
2. Each window represents a player in the game.
3. Use arrow keys to move your character.
4. Press the spacebar to plant bombs.
5. Collect power-ups to increase your abilities.
6. The last player standing wins!

## Development

- Frontend code is in `frontend/src/`
- Main game logic is in `frontend/src/router/bomberman.jsx`
- Backend code is in `backend/main.py`

Enjoy playing and developing Bomberman!
