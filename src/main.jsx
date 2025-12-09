
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";  // Only here
import App from "./App";
// import axios from 'axios';
// axios.defaults.adapter = 'xhr';
// Import the CSS files in the right order
// import './styles/global.css'; // Import global styles first
import './main.css'; // Import Tailwind CSS

const root = document.getElementById("root");

ReactDOM.createRoot(root).render(
  <BrowserRouter> {/* Wrap once */}
    <App />
  </BrowserRouter>
);
