import {MiniFramework} from "./utils/mini-framework";
import {Router} from "./components/router";
import { Bomberman } from './router/bomberman';
import { Lobby } from './router/lobby';
/** @jsx MiniFramework.createElement */
function App() {
  return (
    <Router
      routes={[
        {path: "/game", component: () => <Bomberman/>},
        {path: "/", component: () => <Lobby/>},
      ]}
    />
  )
}

const root = document.querySelector('body')
MiniFramework.render(<App/>, root)
