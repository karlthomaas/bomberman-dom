from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio
import random
from starlette.requests import Request
from time import time

app = FastAPI()

GRID_SIZE = 15
EXPLOSION_DURATION = 1  # seconds
EXPLOSION_RANGE = 1  # tiles in each direction
SPAWN_POSITIONS = [(0, 0), (GRID_SIZE-1, 0), (0, GRID_SIZE-1), (GRID_SIZE-1, GRID_SIZE-1)]

lobby_players: Dict[str, Dict] = {}

connected_clients: Dict[str, Dict] = {}

# Global game state
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
            # Add fixed unbreakable walls in a grid pattern
            if x % 2 == 1 and y % 2 == 1:
                walls.append({"x": x, "y": y, "breakable": False})
            # Add random breakable walls, avoiding spawn areas and unbreakable walls
            elif random.random() < 0.4:
                # Check if the current position is not in or adjacent to a spawn area
                if not any((x in range(sx, sx+2) and y in range(sy, sy+2)) for sx, sy in SPAWN_POSITIONS):
                    walls.append({"x": x, "y": y, "breakable": True})
    return walls

def get_spawn_position(player_index):
    return SPAWN_POSITIONS[player_index % len(SPAWN_POSITIONS)]

@app.websocket("/ws/game")
async def game_websocket(websocket: WebSocket):
    await websocket.accept()
    
    user_id = websocket.cookies.get("userId")
    
    if not user_id:
        await websocket.close(code=4000)
        return
    
    connected_clients[user_id] = {"websocket": websocket}
    
    try:
        if not game_state["walls"]:
            game_state["walls"] = generate_walls()
        
        await broadcast_game_state()
        
        while True:
            data = await websocket.receive_json()
            await handle_message(user_id, data)
    finally:
        print(f"🚀 Player {user_id} disconnected")
        del connected_clients[user_id]
        game_state["players"] = [p for p in game_state["players"] if p["id"] != user_id]
        await broadcast_game_state()
        await check_player_count()

async def check_player_count():
    if len(game_state["players"]) <= 1:
        await reset_game_and_redirect_to_lobby()

async def reset_game_and_redirect_to_lobby():
    global game_state
    game_state = {
        "players": [],
        "bombs": [],
        "walls": [],
        "powerUps": [],
        "explosions": []
    }
    
    redirect_message = json.dumps({"type": "redirectToLobby"})
    await asyncio.gather(
        *[client_info["websocket"].send_text(redirect_message) for client_info in connected_clients.values()]
    )

async def handle_message(user_id: str, data: dict):
    action = data.get("action")
    
    if action == "move":
        await move_player(user_id, data["direction"])
    elif action == "plant_bomb":
        asyncio.create_task(plant_bomb(user_id))
    
    await broadcast_game_state()

async def plant_bomb(user_id: str):
    print("Planting bomb")  
    player = next((p for p in game_state["players"] if p["id"] == user_id), None)
    print("Player found")
    if player:
        bomb = {"x": player["x"], "y": player["y"], "playerId": user_id}
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
            # Remove only breakable walls if they exist at the explosion coordinates
            game_state["walls"] = [w for w in game_state["walls"] if not (w["x"] == x and w["y"] == y and w["breakable"])]
    
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


async def move_player(user_id: str, direction: str):
    player = next((p for p in game_state["players"] if p["id"] == user_id), None)
    if not player:
        return

    current_time = time()
    if not hasattr(player, 'last_move_time') or current_time - player["last_move_time"] >= 1/3:
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
            player["last_move_time"] = current_time

async def broadcast_game_state():
    if connected_clients:
        message = json.dumps({
            "type": "gameStateUpdate",
            "state": game_state
        })
        await asyncio.gather(
            *[client_info["websocket"].send_text(message) for client_info in connected_clients.values()]
        )

@app.websocket("/lobby")
async def lobby_websocket(websocket: WebSocket):
    await websocket.accept()
    
    # Extract userId from cookies
    user_id = websocket.cookies.get("userId")
    
    print(f"🚀 Lobby player {user_id} connected")
    
    if not user_id:
        await websocket.close(code=4000)  # Close connection if userId is not present
        return
    
    try:
        while True:
            data = await websocket.receive_json()
            print(f"🚀 Received data: {data}")
            if data.get("action") == "joinLobby":
                print(f"🚀 Lobby player {user_id} joined")
                nickname = data.get("nickname")
                if nickname and isinstance(nickname, str):
                    lobby_players[user_id] = {"websocket": websocket, "nickname": nickname}
                    await websocket.send_json({"type": "joinedLobby"})
                    await broadcast_lobby_state()
            elif data.get("action") == "startGame":
                await start_game()
            elif data.get("type") == "chat":
                await broadcast_chat_message(data, user_id)
    except WebSocketDisconnect:
        print("💀 WebSocket disconnected")
    finally:
        lobby_players.pop(user_id, None)
        await broadcast_lobby_state()

async def broadcast_chat_message(message, author_id):
    print(f"🚀 Broadcasting chat message from {author_id}: {message}, {lobby_players}")
    if lobby_players:
        sender = lobby_players.get(author_id)
        if sender:
            chat_message = json.dumps({
                "type": "chat",
                "userId": author_id,
                "nickname": sender["nickname"] or "Anonymous",
                "text": message.get("text", "")
            })
            await asyncio.gather(
                *[player["websocket"].send_text(chat_message) for player in lobby_players.values()]
            )

async def broadcast_lobby_state():
    if lobby_players:
        player_list = [
            {
                "userId": user_id,
                "nickname": player_info["nickname"] or f"Player {i+1}"
            }
            for i, (user_id, player_info) in enumerate(lobby_players.items())
        ]
        message = json.dumps({"type": "playerList", "players": player_list})
        await asyncio.gather(
            *[player_info["websocket"].send_text(message) for player_info in lobby_players.values()]
        )

async def start_game():
    if lobby_players:
        message = json.dumps({"type": "gameStart"})
        await asyncio.gather(
            *[player_info["websocket"].send_text(message) for player_info in lobby_players.values()]
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

    print("🚀 Starting new game")
    # Add players to the game state
    for i, (user_id, player_info) in enumerate(lobby_players.items()):
        spawn_x, spawn_y = get_spawn_position(i)
        
        player = {
            "id": user_id,
            "x": spawn_x,
            "y": spawn_y,
            "health": 3,
            "nickname": player_info["nickname"] or f"Player {i+1}"
        }
        game_state["players"].append(player)

    # Clear lobby players after starting the game
    lobby_players.clear()

    # Broadcast the initial game state to all connected clients
    await broadcast_game_state()

# ... existing code ...