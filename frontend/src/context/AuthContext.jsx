import { useState } from "react";
import AuthContext from "./AuthContextBase";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const loginUser = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login: loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
