/** @jsx MiniFramework.createElement */
import { MiniFramework } from "../utils/mini-framework";

const GRID_SIZE = 15;
const CELL_SIZE = 35; // px

export const Bomberman = () => {
  const [socket, setSocket] = MiniFramework.useState(null);
  let gameState = {
    players: [],
    bombs: [],
    walls: [],
    powerUps: [],
    explosions: []
  };  

  MiniFramework.useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/game`);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received new game state:', data);
      
      if (data.type === 'gameStateUpdate') {
        updateGameState(data.state);
      } else if (data.type === 'redirectToLobby') {
        console.log('Redirecting to lobby');
        window.location.href = '/';
      } else {
        console.log('Received unknown message type:', data);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  MiniFramework.useEffect(() => {
    let lastMoveTime = 0;
    const moveInterval = 500 / 3; // 3 moves per second

    const handleKeyPress = (e) => {
      const currentTime = Date.now();
      if (currentTime - lastMoveTime >= moveInterval) {
        if (socket && socket.readyState === WebSocket.OPEN) {
          const direction = {
            'ArrowUp': 'ArrowUp',
            'ArrowDown': 'ArrowDown',
            'ArrowLeft': 'ArrowLeft',
            'ArrowRight': 'ArrowRight'
          }[e.key];

          if (direction) {
            socket.send(JSON.stringify({ action: 'move', direction }));
            lastMoveTime = currentTime;
          } else if (e.key === ' ') {
            socket.send(JSON.stringify({ action: 'plant_bomb' }));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [socket]);

  const updateGameState = (newState) => {
    gameState = newState;
    updateGrid();
    updatePlayers();
    updateDebugInfo();
  };

  const updateGrid = () => {
    const gridElement = document.getElementById('game-board');
    if (gridElement) {
      gridElement.innerHTML = '';
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const cellElement = document.createElement('div');
          cellElement.className = 'w-10 h-10 flex items-center justify-center';
          
          const cellContent = getCellContent(x, y);
          if (cellContent === "🧱") {
            cellElement.className += ' bg-gray-700'; // Dark background for walls
          } else {
            cellElement.className += ' bg-green-200'; // Light background for empty cells
          }
          cellElement.textContent = cellContent;
          
          // Add explosion effect
          if (gameState.explosions.some(e => e.x === x && e.y === y)) {
            cellElement.style.backgroundColor = 'red';
            cellElement.style.transition = 'background-color 1s';
            setTimeout(() => {
              cellElement.style.backgroundColor = cellContent === "🧱" ? '#374151' : '#E5F3E5';
            }, 1000);
          }
          
          gridElement.appendChild(cellElement);
        }
      }
    }
  };

  const updatePlayers = () => {
    const playersContainer = document.getElementById('players-container');
    if (playersContainer) {
      playersContainer.innerHTML = '';
      gameState.players.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.id = `player-${player.id}`;
        playerElement.style.position = 'absolute';
        playerElement.style.left = `${player.x * CELL_SIZE}px`;
        playerElement.style.top = `${player.y * CELL_SIZE}px`;
        playerElement.style.width = `${CELL_SIZE}px`;
        playerElement.style.height = `${CELL_SIZE}px`;
        playerElement.style.backgroundColor = getPlayerColor(index);
        playerElement.style.borderRadius = '50%';
        playerElement.style.transition = 'all 0.1s ease-out';
        playerElement.style.zIndex = '10';
        
        // Add health indicator
        const healthElement = document.createElement('div');
        healthElement.textContent = `HP: ${player.health}`;
        healthElement.style.position = 'absolute';
        healthElement.style.top = '-20px';
        healthElement.style.left = '0';
        healthElement.style.width = '100%';
        healthElement.style.textAlign = 'center';
        healthElement.style.fontSize = '12px';
        playerElement.appendChild(healthElement);
        
        playersContainer.appendChild(playerElement);
      });
    }
  };

  const getPlayerColor = (index) => {
    const colors = ['blue', 'red', 'green', 'yellow'];
    return colors[index % colors.length];
  };

  const getCellContent = (x, y) => {
    if (gameState.bombs.some(b => b.x === x && b.y === y)) return "💣";
    const wall = gameState.walls.find(w => w.x === x && w.y === y);
    console.log(wall);
    if (wall) return wall.breakable ? "🧱" : "⬛";
    return "";
  };

  const updateDebugInfo = () => {
    const debugElement = document.getElementById('debug-info');
    if (debugElement) {
      debugElement.textContent = JSON.stringify(gameState, null, 2);
    }
  };

  return (
    <div className="bomberman-game p-4">
      <div id="game-container" className="relative">
        <div 
          id="game-board" 
          className="grid grid-cols-15 gap-0"
          style={{
            width: `${GRID_SIZE * CELL_SIZE}px`,
            height: `${GRID_SIZE * CELL_SIZE}px`,
          }}
        >
          {/* Grid cells will be dynamically added here */}
        </div>
        <div id="players-container" className="absolute top-0 left-0">
          {/* Player elements will be dynamically added here */}
        </div>
      </div>
      <div className="debug-info overflow-y-scroll fixed top-0 left-0">
        <h3>Game State:</h3>
        <pre id="debug-info"></pre>
      </div>
    </div>
  );
};