import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";
import { getLocationWithFallback } from "./location.js";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
  const [coords, setCoords] = useState(() => {
    const cached = localStorage.getItem("coords");
    return cached ? JSON.parse(cached) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setUser(null); return; }

    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch(() => { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); });
  }, []);

  useEffect(() => {
    getLocationWithFallback().then((next) => {
      setCoords(next);
      localStorage.setItem("coords", JSON.stringify(next));
      const token = localStorage.getItem("token");
      if (token) {
        api.patch("/auth/me/location", next).catch(() => {});
      }
    });
  }, []);

  function login(userData) {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  }
  function logout() {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  return (
    <UserContext.Provider value={{ user, login, logout, coords, setCoords }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
