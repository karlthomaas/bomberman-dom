import {MiniFramework} from "../utils/mini-framework";

/** @jsx MiniFramework.createElement */
export const Router = (props) => {
  const [currentRoute, setCurrentRoute] = MiniFramework.useState(window.location.pathname)

  // Add event listener manually
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => setCurrentRoute(() => window.location.pathname));
  }

  // Find the route that matches the current location
  const route = props.routes.find(r => r.path === currentRoute);

  // Render the component for the current route
  return route ? route.component() : <div>404 Not Found</div>;
}