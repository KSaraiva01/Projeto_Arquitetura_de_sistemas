import type {
  ApiBoard,
  ApiCalendar,
  ApiChangeStageResult,
  ApiSession,
  ApiSessionUser,
  ApiStageBlocker,
} from "./api-types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api";

const ACCESS_TOKEN_KEY = "infohub.accessToken";

export interface ApiFieldError {
  field: string;
  message: string;
}

/** Erro vindo do envelope padronizado da API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
    readonly fields?: ApiFieldError[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * O access token vive em memória e é espelhado no localStorage para
 * sobreviver ao F5. O refresh token NÃO passa por aqui: ele fica no cookie
 * httpOnly que o backend define, fora do alcance de JavaScript.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;

  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window === "undefined") return null;

  accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  return accessToken;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* resposta sem corpo */
  }

  const error = (body as { error?: Record<string, unknown> } | null)?.error;

  return new ApiError(
    response.status,
    (error?.code as string) ?? "UNKNOWN_ERROR",
    (error?.message as string) ??
      "Não foi possível concluir a operação. Tente novamente.",
    error?.details as Record<string, unknown> | undefined,
    error?.fields as ApiFieldError[] | undefined,
  );
}

/**
 * Renovação de sessão.
 *
 * Guardamos a promessa em andamento para que várias requisições que tomem
 * 401 ao mesmo tempo compartilhem um único refresh, em vez de dispararem
 * vários — o que invalidaria os tokens umas das outras, já que o backend
 * rotaciona o refresh token a cada uso.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          setAccessToken(null);
          return false;
        }

        const session = (await response.json()) as ApiSession;
        setAccessToken(session.accessToken);
        return true;
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Interno: evita laço infinito de refresh. */
  retry?: boolean;
}

async function request<T>(
  path: string,
  { method = "GET", body, retry = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && retry) {
    const renewed = await refreshSession();
    if (renewed) {
      return request<T>(path, { method, body, retry: false });
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function toQueryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

export const api = {
  async login(email: string, password: string): Promise<ApiSession> {
    const session = await request<ApiSession>("/auth/login", {
      method: "POST",
      body: { email, password },
      retry: false,
    });

    setAccessToken(session.accessToken);
    return session;
  },

  async logout(): Promise<void> {
    try {
      await request<void>("/auth/logout", {
        method: "POST",
        body: {},
        retry: false,
      });
    } finally {
      setAccessToken(null);
    }
  },

  async me(): Promise<ApiSessionUser> {
    const { user } = await request<{ user: ApiSessionUser }>("/auth/me");
    return user;
  },

  forgotPassword(email: string) {
    return request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      retry: false,
    });
  },

  // -------------------------------------------------------------------------
  // Equipes e jornada
  // -------------------------------------------------------------------------

  /** RF-06 — equipes agrupadas por etapa, para o kanban. */
  board(filters: {
    search?: string;
    categoryId?: string;
    mentorId?: string;
    course?: string;
    status?: string;
    taskStatus?: string;
  } = {}) {
    return request<ApiBoard>(`/teams/board${toQueryString(filters)}`);
  },

  /** RN-01 — o que impede a equipe de chegar até `toStage`. */
  stageBlockers(teamId: string, toStage: number) {
    return request<{ isAdvancing: boolean; blockers: ApiStageBlocker[] }>(
      `/teams/${teamId}/stage-blockers?toStage=${toStage}`,
    );
  },

  /** RF-09 — mover a equipe de etapa (o arrastar do kanban). */
  changeStage(
    teamId: string,
    input: { toStage: number; reason?: string; force?: boolean },
  ) {
    return request<ApiChangeStageResult>(`/teams/${teamId}/stage`, {
      method: "PATCH",
      body: input,
    });
  },

  // -------------------------------------------------------------------------
  // Tarefas e calendário
  // -------------------------------------------------------------------------

  calendar(params: {
    from: string;
    to: string;
    teamId?: string;
    includeReminders?: boolean;
  }) {
    return request<ApiCalendar>(`/tasks/calendar${toQueryString(params)}`);
  },
};
