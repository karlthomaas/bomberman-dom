import {MiniFramework} from "./utils/mini-framework";
import {Router} from "./components/router";
import {Home} from "./router/home";
import { Bomberman } from './router/bomberman';

/** @jsx MiniFramework.createElement */
function App() {
  return (
    <Router
      routes={[
        {path: "/", component: () => <Bomberman/>},
      ]}
    />
  )
}

const root = document.querySelector('body')
MiniFramework.render(<App/>, root)
