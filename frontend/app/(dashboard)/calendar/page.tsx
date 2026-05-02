"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, eventsApi, projectsApi, tasksApi } from "@/lib/api";
import type { Event, Project, ProjectDetail, ProjectStatus, Task, TaskStatus, User } from "@/lib/types";
import { format } from "date-fns";
import { CalendarPlus, FolderPlus, ChevronDown, ChevronRight, SquareCheck, X } from "lucide-react";

type DerivedStatus = "pending" | "active" | "on_hold" | "done";

const DERIVED_BADGE: Record<DerivedStatus, string> = {
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  done: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

function deriveProjectStatus(tasks: Task[]): DerivedStatus {
  if (tasks.length === 0) return "pending";
  if (tasks.every((t) => t.status === "done")) return "done";
  if (tasks.some((t) => t.status === "in_progress")) return "active";
  return "pending";
}

const TASK_STATUS_BADGE: Record<string, string> = {
  planned: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  pending: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  archived: "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500",
};

export default function CalendarPage() {
  const qc = useQueryClient();
  const router = useRouter();

  const { data: meRes } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), retry: false });
  const isAdminOrLeader = ["admin", "leader"].includes(
    (meRes?.data?.data as User | undefined)?.role ?? ""
  );

  const { data: eventsData } = useQuery({ queryKey: ["events"], queryFn: () => eventsApi.list() });
  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list() });

  const events: Event[] = eventsData?.data?.data ?? [];
  const projects: Project[] = projectsData?.data?.data ?? [];

  const { data: allTasksData } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const allTasks: Task[] = allTasksData?.data?.data ?? [];
  const tasksByProject = allTasks.reduce<Record<number, Task[]>>((acc, t) => {
    if (t.project_id != null) (acc[t.project_id] ??= []).push(t);
    return acc;
  }, {});
  const allTasksById = Object.fromEntries(allTasks.map((t) => [t.id, t]));

  // Which project is expanded
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: detailData } = useQuery({
    queryKey: ["project", expandedId],
    queryFn: () => projectsApi.get(expandedId!),
    enabled: expandedId !== null,
  });
  const detail: ProjectDetail | null = detailData?.data?.data ?? null;

  // Add project modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "active" as ProjectStatus });
  const [formError, setFormError] = useState<string | null>(null);

  // Add event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ title: "", date: "", required_staff: 1 });
  const [eventFormError, setEventFormError] = useState<string | null>(null);

  const createEventMutation = useMutation({
    mutationFn: () =>
      eventsApi.create({
        title: eventForm.title,
        date: new Date(eventForm.date).toISOString(),
        required_staff: eventForm.required_staff,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setShowAddEvent(false);
      setEventForm({ title: "", date: "", required_staff: 1 });
      setEventFormError(null);
    },
    onError: (e: Error) => setEventFormError(e.message),
  });

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create({ ...form, description: form.description || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowAdd(false);
      setForm({ name: "", description: "", status: "active" });
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const [projectFilter, setProjectFilter] = useState<DerivedStatus | "all">("all");

  // Quick-add task state
  const [quickTaskProject, setQuickTaskProject] = useState<Project | null>(null);
  const [quickTaskForm, setQuickTaskForm] = useState({
    title: "", notes: "", startDate: "", dueDate: "", estimatedHours: "",
  });
  const createTaskMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => tasksApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (quickTaskProject) qc.invalidateQueries({ queryKey: ["project", quickTaskProject.id] });
      setQuickTaskProject(null);
      setQuickTaskForm({ title: "", notes: "", startDate: "", dueDate: "", estimatedHours: "" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Calendar & Projects</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">Upcoming Events</h2>
            {isAdminOrLeader && (
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <CalendarPlus size={14} /> New
              </button>
            )}
          </div>
          <div className="space-y-3">
            {events.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm">No events scheduled.</p>}
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{e.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(e.date), "PPP")}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {e.required_staff} staff
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">Projects</h2>
            {isAdminOrLeader && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <FolderPlus size={14} /> New
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {(["all", "pending", "active", "done"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setProjectFilter(f)}
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition border ${
                  projectFilter === f
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {projects.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm">No projects yet.</p>}
            {projects
              .filter((p) =>
                projectFilter === "all"
                  ? true
                  : deriveProjectStatus(tasksByProject[p.id] ?? []) === projectFilter
              )
              .map((p) => (
              <div key={p.id} className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* Project row */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {expandedId === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{p.name}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const ds = deriveProjectStatus(tasksByProject[p.id] ?? []);
                      return (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DERIVED_BADGE[ds]}`}>
                          {ds.replace("_", " ")}
                        </span>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => {
                        setQuickTaskProject(p);
                        setQuickTaskForm({ title: "", notes: "", startDate: "", dueDate: "", estimatedHours: "" });
                      }}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition font-medium"
                    >
                      <SquareCheck size={13} />
                      New Task
                    </button>
                  </div>
                </div>

                {/* Expanded task list */}
                {expandedId === p.id && (
                  <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-700">
                    {p.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{p.description}</p>
                    )}
                    {!detail || detail.id !== p.id ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">Loading tasks…</p>
                    ) : detail.tasks.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500">No tasks assigned to this project yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.tasks.map((t) => {
                          const full = allTasksById[t.id];
                          return (
                            <div key={t.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-600 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/tasks?task=${t.id}`)}
                                  className="font-medium text-slate-800 dark:text-slate-100 text-xs hover:text-brand-600 dark:hover:text-brand-400 text-left leading-snug"
                                >
                                  {t.title}
                                </button>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${TASK_STATUS_BADGE[t.status] ?? ""}`}>
                                  {t.status.replace("_", " ")}
                                </span>
                              </div>
                              {t.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{t.notes}</p>}
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="text-xs text-slate-400 dark:text-slate-500">{t.user_name}</span>
                                {full?.due_date && (
                                  <span className="text-xs text-orange-500 dark:text-orange-400">Due {format(new Date(full.due_date), "PP")}</span>
                                )}
                                {full?.estimated_hours && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">{full.estimated_hours}h est.</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              ))}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">New Event</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEventFormError(null);
                createEventMutation.mutate();
              }}
              className="space-y-3"
            >
              <input
                required
                placeholder="Event title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              />
              <input
                required
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">Staff required</label>
                <input
                  type="number"
                  min={1}
                  value={eventForm.required_staff}
                  onChange={(e) => setEventForm({ ...eventForm, required_staff: Number(e.target.value) })}
                  className="w-24 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {eventFormError && <p className="text-sm text-red-600">{eventFormError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddEvent(false); setEventFormError(null); }}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {createEventMutation.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Task Modal */}
      {quickTaskProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTaskMutation.mutate({
                title: quickTaskForm.title.trim(),
                notes: quickTaskForm.notes.trim() || null,
                project_id: quickTaskProject.id,
                start_date: quickTaskForm.startDate ? new Date(quickTaskForm.startDate).toISOString() : null,
                due_date: quickTaskForm.dueDate ? new Date(quickTaskForm.dueDate).toISOString() : null,
                estimated_hours: quickTaskForm.estimatedHours ? Number(quickTaskForm.estimatedHours) : null,
                status: "pending" as TaskStatus,
                is_private: false,
              });
            }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">New Task</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Project: <span className="font-medium text-brand-600 dark:text-brand-400">{quickTaskProject.name}</span>
                </p>
              </div>
              <button type="button" onClick={() => setQuickTaskProject(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Title</label>
              <input
                autoFocus
                required
                value={quickTaskForm.title}
                onChange={(e) => setQuickTaskForm({ ...quickTaskForm, title: e.target.value })}
                placeholder="e.g. Implement login flow"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                value={quickTaskForm.notes}
                onChange={(e) => setQuickTaskForm({ ...quickTaskForm, notes: e.target.value })}
                rows={2}
                placeholder="Optional details"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Start date</label>
                <input
                  type="date"
                  value={quickTaskForm.startDate}
                  onChange={(e) => setQuickTaskForm({ ...quickTaskForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Due date</label>
                <input
                  type="date"
                  value={quickTaskForm.dueDate}
                  onChange={(e) => setQuickTaskForm({ ...quickTaskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Estimated hours</label>
              <input
                type="number"
                min={1}
                value={quickTaskForm.estimatedHours}
                onChange={(e) => setQuickTaskForm({ ...quickTaskForm, estimatedHours: e.target.value })}
                placeholder="e.g. 8"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickTaskProject(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTaskMutation.isPending || !quickTaskForm.title.trim()}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60"
              >
                {createTaskMutation.isPending ? "Creating…" : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Project Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">New Project</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                createMutation.mutate();
              }}
              className="space-y-3"
            >
              <input
                required
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm resize-none"
              />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setFormError(null); }}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
