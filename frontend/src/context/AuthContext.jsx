import { useState, useEffect } from "react";
import AuthContext from "./AuthContextBase";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("wealthio_user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Failed to parse user from local storage", error);
      return null;
    }
  });

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem("wealthio_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("wealthio_user");
  };

  return (
    <AuthContext.Provider value={{ user, login: loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
