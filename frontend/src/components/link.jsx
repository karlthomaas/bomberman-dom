import {MiniFramework} from "../utils/mini-framework";

/** @jsx MiniFramework.createElement */
export const Link = ({ href, text }) => {
  const handleRedirect = () => {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  return (
  <div onClick={handleRedirect}>{text}</div>
  )
}