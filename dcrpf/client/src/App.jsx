import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Sdashboard from "./pages/Sdashboard";
import BusOperatorDashboard from "./pages/BusOperatorDashboard";
import Register from "./pages/Register";
import Login from "./pages/Login";

const App = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    navigate(userData.role === "STUDENT" ? "/student" : "/operator");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <Routes>
      <Route path="/" element={<Login setUser={handleLogin} />} />
      <Route path="/student" element={<Sdashboard user={user} setUser={setUser} />} /> 
      <Route path="/operator" element={<BusOperatorDashboard user={user} setUser={setUser} />} /> 
      <Route path="/login" element={<Login setUser={handleLogin} />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
};

export default App;
