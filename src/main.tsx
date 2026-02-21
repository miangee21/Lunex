import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

// Restore saved theme before render to prevent flash
const savedTheme = (localStorage.getItem("lunex-theme") ?? "dark") as "light" | "dark";
document.documentElement.classList.toggle("dark", savedTheme === "dark");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);