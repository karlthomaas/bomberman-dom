## Mini-framework

School task, where I had to create a DIY framework that features state management, event handling and DOM Routing
System.

Because I am a React user, it seemed like a good idea to create a mini version of React.

### Run project locally

1. Clone the repository
```bash
git clone https://01.kood.tech/git/Karl-Thomas/mini-framework

cd mini-framework

npm install

npm start
```
## Framework explanation

### Create element

You can create an element by defining a JavaScript function that returns HTML. You also need to import MiniFramework and
add /** @jsx MiniFramework.createElement */ above component.

```javascript
import {MiniFramework} from "../utils/mini-framework";

/** @jsx MiniFramework.createElement */
const App = () => {
  return (
    <div>
      <h1>Hello, World!</h1>
    </div>
  )
}
```

### Adding attributes

Events can be created by adding camelCase attributes to the element and event handlers need to be written in curly
braces

```javascript
import {MiniFramework} from "../utils/mini-framework";

/** @jsx MiniFramework.createElement */
const App = () => {
  const helloWorld = () => {
    console.log("Hello, World!")
  }
  return (
    <div>
      <button onClick={helloWorld}>Click me</button>
    </div>
  )
}
```

### State management

State management can be done by using the useState hook. The hook returns an array with two elements: the state and a
function to update the state.

```javascript
import {MiniFramework} from "../utils/mini-framework";

/** @jsx MiniFramework.createElement */
const Counter = () => {
    const [count, setCount] = MiniFramework.useState(0)
    const increment = () => {
        setCount(count + 1)
    }
    return (
        <div>
        <h1>{count}</h1>
        <button onClick={increment}>Increment</button>
        </div>
    )
}
```

### DOM Routing System

Creating new routes can be done by passing a component with pathname to Router component props.
```javascript
import {MiniFramework} from "./utils/mini-framework";
import {Router} from "./components/router";
import {Home} from "./router/home";

/** @jsx MiniFramework.createElement */
function App() {
  return (
    <Router
      routes={[
        {path: "/", component: () => <Home/>},
        {path: "/about", component: () => <div>About</div>},
      ]}
    />
  )
}

const root = document.getElementById('root')
MiniFramework.render(<App/>, root)
```

Instead of redirecting with anchor tag, you can use the Link component. It takes a pathname and text as properties.
```javascript
import {MiniFramework} from "../utils/mini-framework";
import {Link} from "../components/link";

export const About = () => {
    return (
        <div>
            <h1>About</h1>
            <Link pathname="/" text="home" />
        </div>
    )
}
```

### Framework explanation
The framework is built with the help of Babel and Webpack. Babel is used to transpile JSX to JavaScript and Webpack is
used to bundle the code. The framework logic is quite comprehensive and can be found in the utils folder.


