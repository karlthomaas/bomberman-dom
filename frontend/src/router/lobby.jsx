/** @jsx MiniFramework.createElement */
import { MiniFramework } from "../utils/mini-framework";

function useRef(initialValue) {
  const [ref] = MiniFramework.useState({ current: initialValue });
  return ref;
}


export const Lobby = () => {
  const [players, setPlayers] = MiniFramework.useState([]);
  const [socket, setSocket] = MiniFramework.useState(null);
  const [nickname, setNickname] = MiniFramework.useState('');
  const [isJoined, setIsJoined] = MiniFramework.useState(false);
  const [messages, setMessages] = MiniFramework.useState([]);
  const [currentMessage, setCurrentMessage] = MiniFramework.useState('');

  const setPlayersRef = useRef(setPlayers);
  const setMessagesRef = useRef(setMessages);
  MiniFramework.useEffect(() => {
    setPlayersRef.current = setPlayers;
    setMessagesRef.current = setMessages;
  }, [setPlayers, setMessages]);


  const handleWebSocketMessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'playerList') {
      console.log('Received player list:', data.players);
      setPlayersRef.current(data.players);
    } else if (data.type === 'gameStart') {
      window.location.href = '/game';
    } else if (data.type === 'chat') {
      setMessagesRef.current(prevMessages => [...prevMessages, data]);
    }
  };

  MiniFramework.useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/lobby`);
    
    ws.onopen = () => {
      console.log('Lobby WebSocket connection established');
      setSocket(ws);
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onclose = () => {
      console.log('Lobby WebSocket connection closed');
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const startGame = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: 'startGame' }));
    }
  };
  
  const joinLobby = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ action: 'joinLobby', nickname: nickname.trim() });
      socket.send(message);
      setIsJoined(true);
    }
  };

  const sendChatMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN && currentMessage.trim() !== '') {
      const messageData = {
        type: 'chat',
        userId: socket.userId,
        text: currentMessage.trim()
      };
      socket.send(JSON.stringify(messageData));
      setCurrentMessage('');
    }
  };

  return (
    <div className="lobby p-4">
      <h1 className="text-3xl font-bold mb-4">Bomberman Lobby</h1>
      {!isJoined ? (
        <div className="nickname-form mb-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
            className="border p-2 mr-2"
          />
          <button
            onClick={joinLobby}
            disabled={!socket || nickname.trim() === ''}
            className={`${socket && nickname.trim() !== '' ? 'bg-green-500 hover:bg-green-700' : 'bg-gray-400'} text-white font-bold py-2 px-4 rounded`}
          >
            Join Lobby
          </button>
        </div>
      ) : (
        <div>
          <div className="player-list mb-4">
            <h2 className="text-xl font-semibold mb-2">Players:</h2>
            <ul>
              {players.map((player, index) => (
                <li key={index} className="mb-1">{player.nickname}</li>
              ))}
            </ul>
          </div>
          <button 
            onClick={startGame}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Game
          </button>
          <div className="chat mb-4">
            <h3 className="text-xl font-semibold mb-2">Chat:</h3>
            <div className="messages mb-2">
              {messages.map((msg, index) => (
                <div key={index}>{`${msg.nickname}: ${msg.text}`}</div>
              ))}
            </div>
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendChatMessage();
                }
              }}
              placeholder="Send a message"
              className="border p-2 mr-2"
            />
            <button
              onClick={sendChatMessage}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Send Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
};