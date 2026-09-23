import type {
  ApiBoard,
  ApiCalendar,
  ApiChangeStageResult,
  ApiJourneyStage,
  ApiNote,
  ApiSession,
  ApiSessionUser,
  ApiStageBlocker,
  ApiTask,
  ApiTaskDetail,
  ApiTaskTemplate,
  ApiTeamCard,
  ApiTeamDetail,
} from "./api-types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api";

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

/** Mensagem para a tela: o primeiro campo inválido (422) é mais útil que o texto genérico. */
export function describeError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  return err.fields?.[0]?.message ?? err.message;
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

/** Faz a chamada autenticada (com um refresh em caso de 401) e devolve a resposta já validada. */
async function send(
  path: string,
  { method = "GET", body, retry = true }: RequestOptions = {},
): Promise<Response> {
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
      return send(path, { method, body, retry: false });
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

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

  /** Validação do e-mail: o token vem do link `/confirmar-email?token=…`. */
  confirmEmail(token: string) {
    return request<{ alreadyConfirmed: boolean; message: string }>("/auth/confirm-email", {
      method: "POST",
      body: { token },
      retry: false,
    });
  },

  /** Novo link de confirmação (login recusado com EMAIL_NOT_CONFIRMED). */
  resendConfirmation(email: string) {
    return request<{ message: string }>("/auth/resend-confirmation", {
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

  /** Cursos ativos (público — alimenta o cadastro e os filtros). */
  courses() {
    return request<{ data: Array<{ id: string; name: string }> }>("/courses");
  },

  /** Mentores ativos, para os filtros do admin (RF-03 — só ADMIN). */
  mentors() {
    return request<{ data: Array<{ id: string; name: string }> }>("/users?role=MENTOR&isActive=true&pageSize=100");
  },

  /** RF-07 — equipes em lista, com os mesmos filtros do quadro. */
  teams(filters: { search?: string; status?: string; course?: string; mentorId?: string; taskStatus?: string } = {}) {
    return request<{ data: ApiTeamCard[]; total: number }>(`/teams${toQueryString(filters)}`);
  },

  /** RF-08 — equipe com integrantes, jornada (inclusive etapas extras) e histórico. */
  team(teamId: string) {
    return request<ApiTeamDetail>(`/teams/${teamId}`);
  },

  /**
   * RF-09 — mover a equipe de etapa. O kanban manda a coluna (`toStage`);
   * o detalhe da equipe manda a etapa exata (`toStageId`), que pode ser extra.
   */
  changeStage(
    teamId: string,
    input: ({ toStage: number } | { toStageId: string }) & { reason?: string; force?: boolean },
  ) {
    return request<ApiChangeStageResult>(`/teams/${teamId}/stage`, {
      method: "PATCH",
      body: input,
    });
  },

  /** Etapa extra só nesta equipe. Sem `afterStageId`, entra no fim da jornada. */
  addStage(teamId: string, input: { name: string; description?: string; afterStageId?: string }) {
    return request<{ stageId: string; journey: ApiJourneyStage[] }>(`/teams/${teamId}/stages`, {
      method: "POST",
      body: input,
    });
  },

  /** Remove uma etapa extra que ainda não tenha tarefas nem histórico. */
  removeStage(teamId: string, stageId: string) {
    return request<{ journey: ApiJourneyStage[] }>(`/teams/${teamId}/stages/${stageId}`, {
      method: "DELETE",
    });
  },

  /** Coordenação encaminha a equipe ao InovAMF (`force` quando ainda não está pronta). */
  referTeam(teamId: string, force = false) {
    return request<{ team: ApiTeamCard; message: string }>(`/teams/${teamId}/refer`, {
      method: "POST",
      body: { force },
    });
  },

  /** RF-20 — lembrete manual por e-mail para a equipe inteira. */
  sendTeamReminder(teamId: string, input: { subject: string; message: string }) {
    return request<{ recipients: number; message: string }>(`/teams/${teamId}/reminders`, {
      method: "POST",
      body: input,
    });
  },

  /** RF-10 — anotações internas (nunca chegam ao aluno). */
  notes(teamId: string) {
    return request<{ data: ApiNote[] }>(`/teams/${teamId}/notes`);
  },

  addNote(teamId: string, content: string) {
    return request<{ id: string; note: ApiNote }>(`/teams/${teamId}/notes`, {
      method: "POST",
      body: { content },
    });
  },

  // -------------------------------------------------------------------------
  // Tarefas e calendário
  // -------------------------------------------------------------------------

  tasks(filters: { teamId?: string; status?: string; search?: string } = {}) {
    return request<{ data: ApiTask[]; total: number }>(`/tasks${toQueryString(filters)}`);
  },

  /** RF-13 — tarefa com as versões de entrega e os comentários. */
  task(taskId: string) {
    return request<{ task: ApiTaskDetail }>(`/tasks/${taskId}`);
  },

  /** RF-11 — modelos de tarefa por etapa padrão. */
  taskTemplates() {
    return request<{ data: ApiTaskTemplate[] }>("/tasks/templates");
  },

  /** RF-12 — `stageId` pode ser qualquer etapa da jornada da equipe, inclusive extra. */
  createTask(input: {
    teamId: string;
    templateId?: string;
    stageId?: string;
    title?: string;
    description?: string;
    dueDate: string;
    isMandatory?: boolean;
  }) {
    return request<{ task: ApiTaskDetail; message: string }>("/tasks", {
      method: "POST",
      body: input,
    });
  },

  /** RF-15 — aprovar ou pedir ajustes, sempre com comentário. */
  reviewTask(taskId: string, input: { decision: "APPROVED" | "REJECTED"; comment: string }) {
    return request<{ task: ApiTaskDetail; message: string }>(`/tasks/${taskId}/review`, {
      method: "POST",
      body: input,
    });
  },

  /**
   * RNF-04 — o download exige o token, então não dá para ser um link comum:
   * baixa pelo fetch e entrega ao navegador como arquivo.
   */
  async downloadAttachment(url: string, fileName: string) {
    // A API devolve a rota completa (/api/tasks/…); `send` já prefixa API_URL.
    const response = await send(url.replace(/^\/api(?=\/)/, ""));
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    // Revogar na mesma hora pode cancelar o download em alguns navegadores.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  },

  calendar(params: {
    from: string;
    to: string;
    teamId?: string;
    includeReminders?: boolean;
  }) {
    return request<ApiCalendar>(`/tasks/calendar${toQueryString(params)}`);
  },
};
