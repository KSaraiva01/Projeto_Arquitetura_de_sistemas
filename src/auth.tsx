// Contexto de autenticação simples (protótipo).
// A sessão é guardada em sessionStorage só para facilitar os testes:
// dar F5 na página não derruba o usuário nem obriga logar de novo.
import { createContext, useContext, useState, type ReactNode } from "react";
import type { AuthState } from "./types";

const STORAGE_KEY = "infohub.auth";

function readStoredAuth(): AuthState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  auth: AuthState | null;
  login: (auth: AuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => readStoredAuth());

  function login(authState: AuthState) {
    setAuth(authState);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authState));
    } catch {
      /* ambiente sem sessionStorage: ignora */
    }
  }

  function logout() {
    setAuth(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
