import React from "react";
import ReactDOM from "react-dom/client";
import { attachConsole } from "@tauri-apps/plugin-log";
import App from "./App";
import "./index.css";

// Bridge browser console to Tauri's unified logging system
// This sends console.log/warn/error to the same log file as Rust logs
attachConsole();

const app = <App />;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  import.meta.env.DEV ? <React.StrictMode>{app}</React.StrictMode> : app,
);
