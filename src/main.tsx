import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./App.css";

// Restore saved theme before render to prevent flash
const savedTheme = (localStorage.getItem("lunex-theme") ?? "dark") as "light" | "dark";
document.documentElement.classList.toggle("dark", savedTheme === "dark");

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>
);