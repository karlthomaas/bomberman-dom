from fastapi import FastAPI, WebSocket
from typing import Dict, List
import json
import asyncio

app = FastAPI()

# Dictionary to hold WebSocket connections and user data
connected_clients: Dict[int, WebSocket] = {}
game_state = {
    "players": [],
    "bombs": [],
    "walls": [],
    "powerUps": []
}

GRID_SIZE = 15

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await websocket.accept()
    connected_clients[client_id] = websocket
    
    try:
        # Initialize player
        player = {"id": client_id, "x": 1, "y": 1}
        game_state["players"].append(player)
        
        while True:
            data = await websocket.receive_text()
            print(data)
            await handle_message(client_id, data)
    finally:
        # Clean up when a client disconnects
        del connected_clients[client_id]
        game_state["players"] = [p for p in game_state["players"] if p["id"] != client_id]
        await broadcast_game_state()

async def handle_message(client_id: int, message: str):
    data = json.loads(message)
    action = data.get("action")
    
    if action == "move":
        await move_player(client_id, data["direction"])
    elif action == "plant_bomb":
        await plant_bomb(client_id)
    
    await broadcast_game_state()

async def move_player(client_id: int, direction: str):
    player = next((p for p in game_state["players"] if p["id"] == client_id), None)
    if not player:
        return

    new_x, new_y = player["x"], player["y"]
    
    if direction == "ArrowUp":
        new_y = max(0, player["y"] - 1)
    elif direction == "ArrowDown":
        new_y = min(GRID_SIZE - 1, player["y"] + 1)
    elif direction == "ArrowLeft":
        new_x = max(0, player["x"] - 1)
    elif direction == "ArrowRight":
        new_x = min(GRID_SIZE - 1, player["x"] + 1)
    
    # Check for collisions with walls (implement this based on your wall data structure)
    if not any(w["x"] == new_x and w["y"] == new_y for w in game_state["walls"]):
        player["x"], player["y"] = new_x, new_y

async def plant_bomb(client_id: int):
    player = next((p for p in game_state["players"] if p["id"] == client_id), None)
    if player:
        bomb = {"x": player["x"], "y": player["y"], "playerId": client_id}
        game_state["bombs"].append(bomb)

async def broadcast_game_state():
    if connected_clients:
        message = json.dumps(game_state)
        await asyncio.gather(
            *[ws.send_text(message) for ws in connected_clients.values()]
        )
