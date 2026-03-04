// index.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Initialize React application at the root of the HTML document.
const container = document.getElementById("root");
const root = createRoot(container);
root.render(React.createElement(App));