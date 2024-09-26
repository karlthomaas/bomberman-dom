/** @jsx MiniFramework.createElement */
import { MiniFramework } from "../utils/mini-framework";


function useRef(initialValue) {
  const [ref] = MiniFramework.useState({ current: initialValue });
  return ref;
}

export const Lobby = () => {
  const [players, setPlayers] = MiniFramework.useState([]);
  const [socket, setSocket] = MiniFramework.useState(null);
  const setPlayersRef = useRef(setPlayers);
  
  MiniFramework.useEffect(() => {
    setPlayersRef.current = setPlayers;
  }, [setPlayers]);


  MiniFramework.useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/lobby`);
    
    ws.onopen = () => {
      console.log('Lobby WebSocket connection established');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'playerList') {
        setPlayersRef.current(data.players);
      } else if (data.type === 'gameStart') {
        window.location.href = '/game';
      }
    };

    ws.onclose = () => {
      console.log('Lobby WebSocket connection closed');
    };
  }, []);

  const startGame = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'startGame' }));
    }
  };

  return (
    <div className="lobby p-4">
      <h1 className="text-3xl font-bold mb-4">Bomberman Lobby</h1>
      <div className="player-list mb-4">
        <h2 className="text-xl font-semibold mb-2">Players:</h2>
        <ul>
          {players.map((player, index) => (
            <li key={index} className="mb-1">{player}</li>
          ))}
        </ul>
      </div>
      <button 
        onClick={startGame}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Start Game
      </button>
    </div>
  );
};
