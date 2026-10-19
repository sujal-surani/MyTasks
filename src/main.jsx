import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { FirestoreProvider } from "./context/FirestoreContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <FirestoreProvider>
        <App />
      </FirestoreProvider>
    </BrowserRouter>
  </StrictMode>
);
