import { useEffect, useState } from "react";
import "./App.css";
import api from "./api";

function App() {
  const [message, setMessage] = useState("Connecting to backend...");

  useEffect(() => {
    api
      .get("/health/")
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch((error) => {
        console.error("Backend connection error:", error);
        setMessage("Backend connection failed");
      });
  }, []);

  return (
    <div className="app">
      <h1>FullStackApp</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;