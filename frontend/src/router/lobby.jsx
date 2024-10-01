/** @jsx MiniFramework.createElement */
import { MiniFramework } from "../utils/mini-framework";
import Cookies from 'universal-cookie';

function useRef(initialValue) {
  const [ref] = MiniFramework.useState({ current: initialValue });
  return ref;
}

function generateRandomId() {
  return Math.random().toString(36).substr(2, 9);
}

export const Lobby = () => {
  const [players, setPlayers] = MiniFramework.useState([]);
  const [socket, setSocket] = MiniFramework.useState(null);
  const [nickname, setNickname] = MiniFramework.useState('');
  const [isJoined, setIsJoined] = MiniFramework.useState(false);
  const [messages, setMessages] = MiniFramework.useState([]);
  const [currentMessage, setCurrentMessage] = MiniFramework.useState('');
  const [timer, setTimer] = MiniFramework.useState(null);
  const [lobbyTimer, setLobbyTimer] = MiniFramework.useState(true);

  const setPlayersRef = useRef(setPlayers);
  const setMessagesRef = useRef(setMessages);
  const setTimerRef = useRef(setTimer); 
  const setLobbyTimerRef = useRef(setLobbyTimer);
  MiniFramework.useEffect(() => {
    setPlayersRef.current = setPlayers;
    setMessagesRef.current = setMessages;
    setTimerRef.current = setTimer;
    setLobbyTimerRef.current = setLobbyTimer;
  }, [setPlayers, setMessages, setTimer, setLobbyTimer]);

  const generateCookie = () => {
    const cookies = new Cookies();
    let userId = cookies.get('userId');
    if (!userId) {
      userId = generateRandomId();
      cookies.set('userId', userId, { path: '/' });
    }
  };

  const handleWebSocketMessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'playerList') {
      console.log('Received player list:', data.players);
      setPlayersRef.current(data.players);
    } else if (data.type === 'gameStart') {
      window.location.href = '/game';
    } else if (data.type === 'chat') {
      console.log('Received chat message:', data);
      setMessagesRef.current(prevMessages => [...prevMessages, data]);
    } else if (data.type === 'timer') {
      console.log('Received timer update:', data.gameState.Timer);
      setTimerRef.current(Math.ceil(data.gameState.Timer.TimeRemaining / 1000000000));
      setLobbyTimerRef.current(data.gameState.Timer.LobbyTimer);
    }
  };

  MiniFramework.useEffect(() => {
    generateCookie();
    
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
        text: currentMessage.trim()
      };
      console.log('Sending chat message:', messageData);
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
            {timer !== null && (
              <p className="mt-2 font-semibold">
                {players.length < 4
                  ? `Waiting for players: ${timer} ${timer === 1 ? 'second' : 'seconds'}`
                  : `Game starting in: ${timer} ${timer === 1 ? 'second' : 'seconds'}`}
              </p>
            )}
          </div>
          <div className="chat mb-4 flex flex-col max-w-screen-lg">
            <h3 className="text-xl font-semibold mb-2">Chat:</h3>
            <div className="messages mb-2">
              {messages.map((msg, index) => (
                <div key={index}>{`${msg.nickname}: ${msg.text}`}</div>
              ))}
            </div>
            <div className="flex flex-row">
              <input
                type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
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
        </div>
      )}
    </div>
  );
};