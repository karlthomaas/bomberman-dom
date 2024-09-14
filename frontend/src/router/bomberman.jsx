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
    powerUps: []
  };

  MiniFramework.useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${Date.now()}`);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const newGameState = JSON.parse(event.data);
      console.log('Received new game state:', newGameState);
      updateGameState(newGameState);
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
    const handleKeyPress = (e) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const direction = {
          'ArrowUp': 'ArrowUp',
          'ArrowDown': 'ArrowDown',
          'ArrowLeft': 'ArrowLeft',
          'ArrowRight': 'ArrowRight'
        }[e.key];

        if (direction) {
          socket.send(JSON.stringify({ action: 'move', direction }));
        } else if (e.key === ' ') {
          socket.send(JSON.stringify({ action: 'plant_bomb' }));
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
          cellElement.className = 'w-10 h-10 border border-gray-300 flex items-center justify-center';
          cellElement.textContent = getCellContent(x, y);
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
    if (gameState.walls.some(w => w.x === x && w.y === y)) return "🧱";
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
        >
          {/* Grid cells will be dynamically added here */}
        </div>
        <div id="players-container" className="absolute top-0 left-0">
          {/* Player elements will be dynamically added here */}
        </div>
      </div>
      <div className="debug-info mt-4">
        <h3>Game State:</h3>
        <pre id="debug-info"></pre>
      </div>
    </div>
  );
};