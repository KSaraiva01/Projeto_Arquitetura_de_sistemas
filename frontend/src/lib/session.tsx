"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api, getAccessToken } from "./api";
import type { ApiSessionUser } from "./api-types";

interface SessionState {
  user: ApiSessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

/**
 * Sessão do usuário logado.
 *
 * Na montagem tenta reconstruir a sessão: se houver access token guardado,
 * chama /auth/me; se ele estiver vencido, o cliente da API tenta o refresh
 * pelo cookie httpOnly antes de desistir.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Sem token guardado não vale a pena chamar a API: encerramos o
    // carregamento e seguimos como visitante.
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const current = await api.me();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh: load, signOut }),
    [user, loading, load, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession precisa estar dentro de <SessionProvider>.");
  }

  return context;
}

/**
 * Exige uma sessão ativa e, opcionalmente, um dos perfis informados.
 *
 * Enquanto carrega devolve `loading`; sem sessão manda para a home. O
 * backend continua sendo a autoridade — isto aqui é só para o usuário não
 * ficar olhando uma tela vazia.
 */
export function useRequireSession(roles?: Array<ApiSessionUser["role"]>) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (roles && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [user, loading, roles, router]);

  return { user, loading };
}
