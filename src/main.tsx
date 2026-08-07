import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installNativeShellBehaviour } from "./native";

// Strip the WebView's browser affordances before the first paint, so the shell
// never flashes a web-page gesture (zoom, context menu, drag) at the user.
installNativeShellBehaviour();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
