import type {
  ApiBoard,
  ApiCalendar,
  ApiChangeStageResult,
  ApiIdeaStage,
  ApiJourneyStage,
  ApiNote,
  ApiNotificationType,
  ApiReportDashboard,
  ApiSession,
  ApiSessionUser,
  ApiStageBlocker,
  ApiTask,
  ApiTaskDetail,
  ApiTaskTemplate,
  ApiTeamCard,
  ApiTeamDetail,
  ApiTeamMember,
  ApiUserRole,
  ApiUserSummary,
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
 * O access token vive em memória e é espelhado no navegador para sobreviver
 * ao F5: no localStorage com "Lembrar-me", no sessionStorage sem ele (some
 * ao fechar o navegador, junto com o cookie de sessão). O refresh token NÃO
 * passa por aqui: ele fica no cookie httpOnly que o backend define, fora do
 * alcance de JavaScript.
 */
let accessToken: string | null = null;
let persistToken = true;

export function setAccessToken(token: string | null, persist = persistToken) {
  accessToken = token;
  persistToken = persist;

  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    if (token) {
      (persist ? window.localStorage : window.sessionStorage).setItem(ACCESS_TOKEN_KEY, token);
    }
  } catch {
    /* armazenamento bloqueado (aba privada): o token fica só em memória */
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window === "undefined") return null;

  try {
    const lembrado = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const daSessao = lembrado ? null : window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
    persistToken = Boolean(lembrado) || !daSessao;
    accessToken = lembrado ?? daSessao;
  } catch {
    accessToken = null;
  }
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

/**
 * Faz a chamada autenticada (com um refresh em caso de 401) e devolve a
 * resposta já validada. Um `FormData` vai como multipart (o navegador monta
 * o boundary); qualquer outro corpo vai como JSON.
 */
async function send(
  path: string,
  { method = "GET", body, retry = true }: RequestOptions = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
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

/** Baixa uma rota autenticada como arquivo (link comum não levaria o token). */
async function downloadFile(path: string, fallbackName: string) {
  const response = await send(path);
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  // Revogar na mesma hora pode cancelar o download em alguns navegadores.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export interface RegisterTeamInput {
  team: { name: string; description: string; areaId: string; ideaStage: ApiIdeaStage; howDidYouHear?: string };
  leader: { name: string; email: string; phone: string; course: string; semester: string; password: string };
  members: Array<{ name: string; email: string; course: string }>;
  lgpdConsent: true;
}

export interface SubmissionInput {
  files: File[];
  linkUrl?: string;
  linkTitle?: string;
  note?: string;
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
  /** Sem "Lembrar-me" a sessão termina quando o navegador fecha. */
  async login(email: string, password: string, rememberMe = true): Promise<ApiSession> {
    const session = await request<ApiSession>("/auth/login", {
      method: "POST",
      body: { email, password, rememberMe },
      retry: false,
    });

    setAccessToken(session.accessToken, rememberMe);
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

  /**
   * RF-01/RF-02 — cria a senha pelo link `/definir-senha?token=…` (ativação
   * ou recuperação). Quem ainda não aceitou a política de privacidade manda
   * `lgpdConsent: true` (sem ele, 400 LGPD_CONSENT_REQUIRED).
   */
  resetPassword(token: string, password: string, lgpdConsent?: boolean) {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, password, ...(lgpdConsent ? { lgpdConsent } : {}) },
      retry: false,
    });
  },

  /** Troca a senha; o backend encerra todas as sessões, então é preciso entrar de novo. */
  async changePassword(currentPassword: string, newPassword: string) {
    const result = await request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
    setAccessToken(null);
    return result;
  },

  /** RNF-02 — o próprio usuário exclui a conta (anonimização). */
  async deleteAccount(password: string) {
    const result = await request<{ message: string; promotedLeaders: unknown[]; deletedTeams: unknown[] }>("/auth/me", {
      method: "DELETE",
      body: { password },
    });
    setAccessToken(null);
    return result;
  },

  /** RF-21 — tipos de aviso desligados (sem linha = recebe). */
  notificationPreferences() {
    return request<{ data: Array<{ type: ApiNotificationType; enabled: boolean }> }>("/auth/me/notification-preferences");
  },

  saveNotificationPreferences(preferences: Array<{ type: ApiNotificationType; enabled: boolean }>) {
    return request<{ data: Array<{ type: ApiNotificationType; enabled: boolean }> }>("/auth/me/notification-preferences", {
      method: "PUT",
      body: { preferences },
    });
  },

  // -------------------------------------------------------------------------
  // Cadastro (RF-02, RF-04, RF-05) — público
  // -------------------------------------------------------------------------

  /** Áreas das ideias (público — alimenta o formulário de cadastro). */
  areas() {
    return request<{ data: Array<{ id: string; name: string }> }>("/areas");
  },

  registerTeam(input: RegisterTeamInput) {
    return request<{ teamId: string; leaderId: string; memberCount: number; message: string }>("/teams/register", {
      method: "POST",
      body: input,
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

  /** RF-07/RF-24 — equipes em lista, com os mesmos filtros do quadro e o período de ingresso. */
  teams(
    filters: {
      search?: string;
      status?: string;
      course?: string;
      mentorId?: string;
      taskStatus?: string;
      categoryId?: string;
      period?: string;
      includeInactive?: boolean;
    } = {},
  ) {
    return request<{ data: ApiTeamCard[]; total: number }>(`/teams${toQueryString(filters)}`);
  },

  /** RF-08 — equipe com integrantes, jornada (inclusive etapas extras), histórico e entregáveis finais. */
  team(teamId: string) {
    return request<ApiTeamDetail>(`/teams/${teamId}`);
  },

  /** Q4 — exclusão lógica (só ADMIN): some das listas, mas o histórico fica. */
  deleteTeam(teamId: string) {
    return request<void>(`/teams/${teamId}`, { method: "DELETE" });
  },

  /** Mentoria da equipe (só ADMIN). */
  assignMentor(teamId: string, mentorId: string) {
    return request<{ added: boolean; message: string }>(`/teams/${teamId}/mentors`, {
      method: "POST",
      body: { mentorId },
    });
  },

  removeMentor(teamId: string, mentorId: string) {
    return request<{ message: string }>(`/teams/${teamId}/mentors/${mentorId}`, { method: "DELETE" });
  },

  /** Líder, mentor ou admin incluem um colega; a conta nova recebe o link de ativação por e-mail. */
  addMember(teamId: string, input: { name: string; email: string; course: string; semester?: string }) {
    return request<{ member: ApiTeamMember; message: string }>(`/teams/${teamId}/members`, {
      method: "POST",
      body: input,
    });
  },

  removeMember(teamId: string, userId: string) {
    return request<void>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
  },

  /** Q1 — um líder por equipe: passa a liderança para outro integrante. */
  promoteLeader(teamId: string, userId: string) {
    return request<{ message: string }>(`/teams/${teamId}/members/${userId}/promote`, { method: "POST" });
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

  /** Só o autor (ou um admin) edita e exclui a anotação. */
  updateNote(teamId: string, noteId: string, content: string) {
    return request<{ note: ApiNote }>(`/teams/${teamId}/notes/${noteId}`, {
      method: "PATCH",
      body: { content },
    });
  },

  deleteNote(teamId: string, noteId: string) {
    return request<void>(`/teams/${teamId}/notes/${noteId}`, { method: "DELETE" });
  },

  // -------------------------------------------------------------------------
  // Tarefas e calendário
  // -------------------------------------------------------------------------

  tasks(filters: { teamId?: string; status?: string; search?: string; stage?: number } = {}) {
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

  /**
   * RF-12/RF-17 — `stageId` pode ser qualquer etapa da jornada da equipe,
   * inclusive extra; `reminderDaysBefore` são os lembretes "N dias antes".
   */
  createTask(input: {
    teamId: string;
    templateId?: string;
    stageId?: string;
    title?: string;
    description?: string;
    dueDate: string;
    isMandatory?: boolean;
    reminderDaysBefore?: number[];
  }) {
    return request<{ task: ApiTaskDetail; message: string }>("/tasks", {
      method: "POST",
      body: input,
    });
  },

  /** Mudar o prazo leva junto os lembretes "N dias antes" (nota da RF-17). */
  updateTask(taskId: string, input: { title?: string; description?: string | null; dueDate?: string; isMandatory?: boolean }) {
    return request<{ task: ApiTaskDetail }>(`/tasks/${taskId}`, { method: "PATCH", body: input });
  },

  /** Só tarefa sem entregas (para corrigir um cadastro errado). */
  deleteTask(taskId: string) {
    return request<void>(`/tasks/${taskId}`, { method: "DELETE" });
  },

  /** O aluno avisa que começou a tarefa (PENDING → IN_PROGRESS). */
  startTask(taskId: string) {
    return request<{ task: ApiTaskDetail }>(`/tasks/${taskId}/status`, {
      method: "PATCH",
      body: { status: "IN_PROGRESS" },
    });
  },

  /** RF-14/RF-16 — entrega em multipart: arquivos e/ou link; cada envio vira uma nova versão. */
  submitTask(taskId: string, input: SubmissionInput) {
    const form = new FormData();
    for (const file of input.files) form.append("files", file);
    if (input.linkUrl) form.append("linkUrl", input.linkUrl);
    if (input.linkTitle) form.append("linkTitle", input.linkTitle);
    if (input.note) form.append("note", input.note);
    return request<{ task: ApiTaskDetail; submissionId: string; message: string }>(`/tasks/${taskId}/submissions`, {
      method: "POST",
      body: form,
    });
  },

  /** Comentário livre na tarefa (aluno ou mentor), sem decisão. */
  commentTask(taskId: string, content: string) {
    return request<{ task: ApiTaskDetail }>(`/tasks/${taskId}/comments`, { method: "POST", body: { content } });
  },

  /** RF-17 — novo lembrete: "N dias antes do prazo" ou numa data fixa (AAAA-MM-DD, às 9h). */
  addReminder(taskId: string, input: { daysBefore: number } | { remindAt: string }) {
    return request<{ task: ApiTaskDetail }>(`/tasks/${taskId}/reminders`, { method: "POST", body: input });
  },

  removeReminder(taskId: string, reminderId: string) {
    return request<void>(`/tasks/${taskId}/reminders/${reminderId}`, { method: "DELETE" });
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
  downloadAttachment(url: string, fileName: string) {
    // A API devolve a rota completa (/api/tasks/…); `send` já prefixa API_URL.
    return downloadFile(url.replace(/^\/api(?=\/)/, ""), fileName);
  },

  calendar(params: {
    from: string;
    to: string;
    teamId?: string;
    includeReminders?: boolean;
  }) {
    return request<ApiCalendar>(`/tasks/calendar${toQueryString(params)}`);
  },

  // -------------------------------------------------------------------------
  // Usuários (RF-03) — só ADMIN
  // -------------------------------------------------------------------------

  users(filters: { role?: ApiUserRole; isActive?: boolean; search?: string; page?: number; pageSize?: number } = {}) {
    return request<{ data: ApiUserSummary[]; total: number; page: number; pageSize: number }>(`/users${toQueryString(filters)}`);
  },

  /** A conta nasce sem senha: a pessoa recebe o link de ativação por e-mail. */
  createUser(input: { name: string; email: string; role: "ADMIN" | "MENTOR"; phone?: string }) {
    return request<{ user: ApiUserSummary; message: string }>("/users", { method: "POST", body: input });
  },

  updateUser(userId: string, input: { name?: string; email?: string; role?: "ADMIN" | "MENTOR"; phone?: string | null }) {
    return request<{ user: ApiUserSummary }>(`/users/${userId}`, { method: "PATCH", body: input });
  },

  setUserStatus(userId: string, isActive: boolean) {
    return request<{ user: ApiUserSummary }>(`/users/${userId}/status`, { method: "PATCH", body: { isActive } });
  },

  /** Reenvia o link que falta: ativação (sem senha) ou confirmação do e-mail. */
  resendAccess(userId: string) {
    return request<{ message: string }>(`/users/${userId}/resend-access`, { method: "POST" });
  },

  confirmUserEmail(userId: string) {
    return request<{ user: ApiUserSummary; message: string }>(`/users/${userId}/confirm-email`, { method: "POST" });
  },

  /** RNF-02 — exclusão LGPD feita pela coordenação. */
  deleteUser(userId: string) {
    return request<{ message: string; promotedLeaders: unknown[]; deletedTeams: unknown[] }>(`/users/${userId}`, {
      method: "DELETE",
    });
  },

  // -------------------------------------------------------------------------
  // Relatórios (RF-22, RF-23, RF-24)
  // -------------------------------------------------------------------------

  reportDashboard(filters: { period?: string; status?: string; includeInactive?: boolean } = {}) {
    return request<ApiReportDashboard>(`/reports/dashboard${toQueryString(filters)}`);
  },

  /** RF-23 — CSV (abre direto no Excel), com os mesmos filtros do painel. */
  downloadTeamsCsv(filters: { period?: string; status?: string; includeInactive?: boolean } = {}) {
    return downloadFile(`/reports/teams.csv${toQueryString(filters)}`, "equipes-infohub.csv");
  },
};
