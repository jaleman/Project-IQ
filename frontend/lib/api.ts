import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("projectiq_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.detail ?? error.message;
    return Promise.reject(new Error(message));
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password });
    return api.post("/api/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  register: (payload: Record<string, unknown>) => api.post("/api/auth/register", payload),
  me: () => api.get("/api/auth/me"),
  logout: () => api.post("/api/auth/logout"),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/api/auth/change-password", { current_password, new_password }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get("/api/users/"),
  get: (id: number) => api.get(`/api/users/${id}`),
  create: (payload: Record<string, unknown>) => api.post("/api/users/", payload),
  update: (id: number, payload: Record<string, unknown>) => api.patch(`/api/users/${id}`, payload),
  delete: (id: number) => api.delete(`/api/users/${id}`),
};

// ─── Events ──────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: () => api.get("/api/events/"),
  get: (id: number) => api.get(`/api/events/${id}`),
  create: (payload: Record<string, unknown>) => api.post("/api/events/", payload),
  update: (id: number, payload: Record<string, unknown>) =>
    api.patch(`/api/events/${id}`, payload),
  delete: (id: number) => api.delete(`/api/events/${id}`),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: () => api.get("/api/tasks/"),
  get: (id: number) => api.get(`/api/tasks/${id}`),
  create: (payload: Record<string, unknown>) => api.post("/api/tasks/", payload),
  update: (id: number, payload: Record<string, unknown>) => api.patch(`/api/tasks/${id}`, payload),
  delete: (id: number) => api.delete(`/api/tasks/${id}`),
};

// ─── Assignments ─────────────────────────────────────────────────────────────
export const assignmentsApi = {
  list: () => api.get("/api/assignments/"),
  get: (id: number) => api.get(`/api/assignments/${id}`),
  create: (payload: Record<string, unknown>) => api.post("/api/assignments/", payload),
  update: (id: number, payload: Record<string, unknown>) =>
    api.patch(`/api/assignments/${id}`, payload),
  delete: (id: number) => api.delete(`/api/assignments/${id}`),
  overallocation: (userId: number) =>
    api.get(`/api/assignments/user/${userId}/overallocation`),
};

// ─── Agents ──────────────────────────────────────────────────────────────────
export const agentsApi = {
  run: (action: string, payload: Record<string, unknown>) =>
    api.post("/api/agents/run", { action, payload }),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (archived = false) => api.get(`/api/notifications/?archived=${archived}`),
  markRead: (id: number) => api.patch(`/api/notifications/${id}/read`),
  archive: (id: number) => api.patch(`/api/notifications/${id}/archive`),
  unarchive: (id: number) => api.patch(`/api/notifications/${id}/unarchive`),
};

// ─── Projects ────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: () => api.get("/api/projects/"),
  get: (id: number) => api.get(`/api/projects/${id}`),
  create: (payload: Record<string, unknown>) => api.post("/api/projects/", payload),
  update: (id: number, payload: Record<string, unknown>) => api.patch(`/api/projects/${id}`, payload),
  delete: (id: number) => api.delete(`/api/projects/${id}`),
};

// ─── Feedback ─────────────────────────────────────────────────────────────────
export const feedbackApi = {
  submit: (payload: { type: string; notes: string }) => api.post("/api/feedback/", payload),
  list: () => api.get("/api/feedback/"),
  reply: (id: number, reply: string) => api.patch(`/api/feedback/${id}/reply`, { reply }),
};
