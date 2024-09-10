import {MiniFramework} from "./utils/mini-framework";
import {Router} from "./components/router";
import {Home} from "./router/home";

/** @jsx MiniFramework.createElement */
function App() {
  return (
    <Router
      routes={[
        {path: "/", component: () => <Home/>},
      ]}
    />
  )
}

const root = document.querySelector('body')
MiniFramework.render(<App/>, root)
