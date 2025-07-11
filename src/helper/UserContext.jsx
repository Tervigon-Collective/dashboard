"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "./firebase";

/**
 * UserContext provides Firebase user, id token, and loading state.
 * @typedef {Object} UserContextValue
 * @property {import('firebase/auth').User|null} user
 * @property {string|null} token
 * @property {boolean} loading
 */
const UserContext = createContext(/** @type {UserContextValue} */ (null));

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use useCallback for stable reference
  const handleAuthStateChanged = useCallback(async (firebaseUser) => {
    if (firebaseUser) {
      setUser(firebaseUser);
      const idToken = await getIdToken(firebaseUser, true);
      setToken(idToken);
      localStorage.setItem("idToken", idToken);
    } else {
      setUser(null);
      setToken(null);
      localStorage.removeItem("idToken");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChanged);
    return () => unsubscribe();
  }, [handleAuthStateChanged]);

  return (
    <UserContext.Provider value={{ user, token, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
} 