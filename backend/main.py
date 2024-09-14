from fastapi import FastAPI, WebSocket
from typing import Dict, List
import json
import asyncio
import random

app = FastAPI()

GRID_SIZE = 15
EXPLOSION_DURATION = 1  # seconds
EXPLOSION_RANGE = 1  # tiles in each direction

# Dictionary to hold WebSocket connections and user data
connected_clients: Dict[int, WebSocket] = {}
game_state = {
    "players": [],
    "bombs": [],
    "walls": [],
    "powerUps": [],
    "explosions": []
}


def generate_walls():
    walls = []
    for y in range(GRID_SIZE):
        for x in range(GRID_SIZE):
            # Add fixed walls in a grid pattern
            if x % 2 == 1 and y % 2 == 1:
                walls.append({"x": x, "y": y})
            # Add random breakable walls
            elif (x > 1 or y > 1) and random.random() < 0.4:  # 40% chance for a breakable wall
                walls.append({"x": x, "y": y})
    return walls

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await websocket.accept()
    connected_clients[client_id] = websocket
    
    try:
        # Initialize player
        player = {"id": client_id, "x": 1, "y": 1, "health": 3}
        game_state["players"].append(player)
        
        # Generate walls if they don't exist
        if not game_state["walls"]:
            game_state["walls"] = generate_walls()
        
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
        asyncio.create_task(plant_bomb(client_id))
    
    await broadcast_game_state()

async def plant_bomb(client_id: int):
    print("Planting bomb")  
    player = next((p for p in game_state["players"] if p["id"] == client_id), None)
    print("Player found")
    if player:
        bomb = {"x": player["x"], "y": player["y"], "playerId": client_id}
        game_state["bombs"].append(bomb)
        print("Bomb planted")
        await asyncio.sleep(3)  # Bomb explodes after 3 seconds
        await explode_bomb(bomb)

async def explode_bomb(bomb):
    print("Exploding bomb")
    game_state["bombs"].remove(bomb)
    explosions = []
    directions = [(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)]
    
    for dx, dy in directions:
        x, y = bomb["x"] + dx, bomb["y"] + dy
        if 0 <= x < GRID_SIZE and 0 <= y < GRID_SIZE:
            explosions.append({"x": x, "y": y})
            # Remove walls if they exist at the explosion coordinates
            game_state["walls"] = [w for w in game_state["walls"] if not (w["x"] == x and w["y"] == y)]
    
    game_state["explosions"] = explosions
    await broadcast_game_state()
    
    # Check for player damage
    for player in game_state["players"]:
        if any(e["x"] == player["x"] and e["y"] == player["y"] for e in explosions):
            player["health"] -= 1
            if player["health"] <= 0:
                game_state["players"].remove(player)
    
    await asyncio.sleep(EXPLOSION_DURATION)
    game_state["explosions"] = []
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

async def broadcast_game_state():
    if connected_clients:
        message = json.dumps(game_state)
        await asyncio.gather(
            *[ws.send_text(message) for ws in connected_clients.values()]
        )
