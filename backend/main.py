from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
import random

app = FastAPI()

GRID_SIZE = 15
EXPLOSION_DURATION = 1  # seconds
EXPLOSION_RANGE = 1  # tiles in each direction
SPAWN_POSITIONS = [(0, 0), (GRID_SIZE-1, 0), (0, GRID_SIZE-1), (GRID_SIZE-1, GRID_SIZE-1)]

# Dictionary to hold WebSocket connections and user data
connected_clients: Dict[int, WebSocket] = {}
game_state = {
    "players": [],
    "bombs": [],
    "walls": [],
    "powerUps": [],
    "explosions": []
}

# List to hold lobby WebSocket connections
lobby_players: Dict[WebSocket, Dict] = {}

def generate_walls():
    walls = []
    for y in range(GRID_SIZE):
        for x in range(GRID_SIZE):
            # Add fixed walls in a grid pattern
            if x % 2 == 1 and y % 2 == 1:
                walls.append({"x": x, "y": y})
            # Add random breakable walls, avoiding spawn areas
            elif random.random() < 0.4:
                # Check if the current position is not in or adjacent to a spawn area
                if not any((x in range(sx, sx+2) and y in range(sy, sy+2)) for sx, sy in SPAWN_POSITIONS):
                    walls.append({"x": x, "y": y})
    return walls

def get_spawn_position(player_index):
    return SPAWN_POSITIONS[player_index % len(SPAWN_POSITIONS)]

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: int):
    await websocket.accept()
    connected_clients[client_id] = websocket
    
    try:
        # Initialize player
        player_index = len(game_state["players"])
        spawn_x, spawn_y = get_spawn_position(player_index)
        player = {"id": client_id, "x": spawn_x, "y": spawn_y, "health": 3}
        game_state["players"].append(player)
        
        # Generate walls if they don't exist
        if not game_state["walls"]:
            game_state["walls"] = generate_walls()
        
        await broadcast_game_state()
        
        while True:
            data = await websocket.receive_text()
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
    
    # Check for collisions with walls and bombs
    if not any(w["x"] == new_x and w["y"] == new_y for w in game_state["walls"]) and \
       not any(b["x"] == new_x and b["y"] == new_y for b in game_state["bombs"]):
        player["x"], player["y"] = new_x, new_y

async def broadcast_game_state():
    if connected_clients:
        message = json.dumps(game_state)
        await asyncio.gather(
            *[ws.send_text(message) for ws in connected_clients.values()]
        )

@app.websocket("/lobby")
async def lobby_websocket(websocket: WebSocket):
    await websocket.accept()
    lobby_players[websocket] = {"nickname": None}
    
    try:
        await broadcast_lobby_state()
        
        while True:
            data = await websocket.receive_json()
            if data.get("action") == "startGame":
                await start_game()
            elif data.get("action") == "setNickname":
                nickname = data.get("nickname")
                if nickname and isinstance(nickname, str):
                    lobby_players[websocket]["nickname"] = nickname
                    await websocket.send_json({"type": "nicknameSet"})
                    await broadcast_lobby_state()
            elif data.get("type") == "chat":
                await broadcast_chat_message(data)
    except WebSocketDisconnect:
        del lobby_players[websocket]
        await broadcast_lobby_state()

async def broadcast_chat_message(message):
    if lobby_players:
        chat_message = json.dumps(message)
        await asyncio.gather(
            *[client.send_text(chat_message) for client in lobby_players.keys()]
        )

async def broadcast_lobby_state():
    if lobby_players:
        player_list = [player["nickname"] or f"Player {i+1}" for i, player in enumerate(lobby_players.values())]
        message = json.dumps({"type": "playerList", "players": player_list})
        await asyncio.gather(
            *[client.send_text(message) for client in lobby_players.keys()]
        )

async def start_game():
    if lobby_players:
        message = json.dumps({"type": "gameStart"})
        await asyncio.gather(
            *[client.send_text(message) for client in lobby_players.keys()]
        )
    
    # Reset the game state
    global game_state
    game_state = {
        "players": [],
        "bombs": [],
        "walls": [],
        "powerUps": [],
        "explosions": []
    }
    
    # Generate new walls
    game_state["walls"] = generate_walls()

    # Add players to the game state
    for i, (_, player_info) in enumerate(lobby_players.items()):
        spawn_x, spawn_y = get_spawn_position(i)
        player = {
            "id": i,
            "x": spawn_x,
            "y": spawn_y,
            "health": 3,
            "nickname": player_info["nickname"] or f"Player {i+1}"
        }
        game_state["players"].append(player)

    # Clear lobby players after starting the game
    lobby_players.clear()