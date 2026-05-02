"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, projectsApi, usersApi, assignmentsApi } from "@/lib/api";
import type { Task, TaskStatus, Project, User, Assignment, AssignmentStatus } from "@/lib/types";
import { Plus, Lock, Share2, X, Pencil, UserPlus } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<TaskStatus, string> = {
  planned: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};


const ASSIGN_STATUS_STYLES: Record<AssignmentStatus, string> = {
  planned: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  on_hold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
};

type TaskFilterKey = "all" | TaskStatus;

const TASK_FILTERS: { key: TaskFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_progress", label: "In Progress" },
  { key: "planned", label: "Planned" },
  { key: "pending", label: "Pending" },
  { key: "done", label: "Done" },
];

// ─── Task create/edit modal ───────────────────────────────────────────────────

interface TaskModalProps {
  task?: Task;
  onClose: () => void;
}

function TaskModal({ task, onClose }: TaskModalProps) {
  const qc = useQueryClient();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [isPrivate, setIsPrivate] = useState(task?.is_private ?? false);
  const [projectId, setProjectId] = useState<string>(task?.project_id?.toString() ?? "");
  const [startDate, setStartDate] = useState(task?.start_date ? task.start_date.slice(0, 10) : "");
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : "");
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours?.toString() ?? "");

  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list() });
  const projects: Project[] = projectsData?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => tasksApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => tasksApi.update(task!.id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); onClose(); },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload: Record<string, unknown> = {
      title: title.trim(),
      notes: notes.trim() || null,
      is_private: isPrivate,
      project_id: projectId ? Number(projectId) : null,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
    };
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {isEdit ? "Edit Task" : "New Task"}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. Implement login flow"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— No project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Optional details"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Estimated hours</label>
          <input
            type="number"
            min={1}
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="e.g. 8"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded border-slate-300"
          />
          Private (only visible to me and leaders)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
          <button type="submit" disabled={isPending || !title.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60">
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Assign resource modal ────────────────────────────────────────────────────

interface AssignModalProps {
  task: Task;
  onClose: () => void;
}

function AssignModal({ task, onClose }: AssignModalProps) {
  const qc = useQueryClient();

  const { data: usersData } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() });
  const users: User[] = usersData?.data?.data ?? [];

  const [userId, setUserId] = useState("");
  const [allocationPct, setAllocationPct] = useState("100");
  const [startDate, setStartDate] = useState(
    task.start_date ? task.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(task.due_date ? task.due_date.slice(0, 10) : "");
  const [status, setStatus] = useState<AssignmentStatus>("planned");

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => assignmentsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    createMutation.mutate({
      user_id: Number(userId),
      task_id: task.id,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      allocation_pct: Number(allocationPct),
      status,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Assign Resource</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Task: <span className="font-medium text-slate-700 dark:text-slate-300">{task.title}</span>
        </p>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Engineer</label>
          <select required value={userId} onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— Select engineer —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
            Allocation % <span className="text-slate-400 font-normal">(1–100)</span>
          </label>
          <input type="number" min={1} max={100} required value={allocationPct}
            onChange={(e) => setAllocationPct(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Start date</label>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as AssignmentStatus)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending || !userId}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60">
            {createMutation.isPending ? "Assigning..." : "Assign"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Tasks page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const tasks: Task[] = data?.data?.data ?? [];

  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list() });
  const projects: Project[] = projectsData?.data?.data ?? [];
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const { data: usersData } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() });
  const users: User[] = usersData?.data?.data ?? [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const { data: assignmentsData } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => assignmentsApi.list(),
  });
  const allAssignments: Assignment[] = assignmentsData?.data?.data ?? [];
  // Group by task_id
  const assignmentsByTask = allAssignments.reduce<Record<number, Assignment[]>>((acc, a) => {
    (acc[a.task_id] ??= []).push(a);
    return acc;
  }, {});

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => assignmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilterKey>("all");

  const STATUS_ORDER: Record<TaskStatus, number> = {
    in_progress: 0,
    planned: 1,
    pending: 2,
    done: 3,
  };

  const filteredTasks = useMemo(() => {
    const base = taskFilter === "all" ? tasks : tasks.filter((t) => t.status === taskFilter);
    return [...base].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [tasks, taskFilter]);

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header — title + filter pills */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tasks</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            <Plus size={16} /> New Task
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {TASK_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTaskFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                taskFilter === f.key
                  ? "bg-brand-600 text-white"
                  : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable task list */}
      <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <p className="text-slate-500">Loading tasks...</p>
      ) : (
        <div className="space-y-3">
          {filteredTasks.length === 0 && <p className="text-slate-400">No tasks match this filter.</p>}
          {filteredTasks.map((t) => {
            const taskAssignments = assignmentsByTask[t.id] ?? [];
            return (
              <div
                key={t.id}
                className="flex items-start gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
              >
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{t.title}</p>
                    {t.is_private && <Lock size={14} className="text-slate-400" />}
                    {t.shared_with && <Share2 size={14} className="text-blue-400" />}
                    {t.project_id && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-400/25 dark:text-indigo-200 px-2 py-0.5 rounded-full">
                        {projectMap[t.project_id] ?? "Project"}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {t.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{t.notes}</p>
                  )}

                  {/* Dates + hours */}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Created {format(new Date(t.created_at), "PP")}
                    </p>
                    {t.due_date && (
                      <p className="text-xs text-orange-500 dark:text-orange-400">
                        Due {format(new Date(t.due_date), "PP")}
                      </p>
                    )}
                    {t.estimated_hours && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {t.estimated_hours}h est.
                      </p>
                    )}
                  </div>

                  {/* Assigned resources */}
                  {taskAssignments.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {taskAssignments.map((a) => (
                        <span
                          key={a.id}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ASSIGN_STATUS_STYLES[a.status]}`}
                          title={`${a.allocation_pct}% · ${a.status}`}
                        >
                          {userMap[a.user_id] ?? `User ${a.user_id}`}
                          <span className="opacity-60">{a.allocation_pct}%</span>
                          {t.status !== "done" && (
                            <button
                              type="button"
                              onClick={() => deleteAssignmentMutation.mutate(a.id)}
                              className="ml-0.5 opacity-50 hover:opacity-100 hover:text-red-500 transition"
                              title="Remove assignment"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <select
                    value={t.status}
                    onChange={(e) =>
                      updateMutation.mutate({ id: t.id, status: e.target.value as TaskStatus })
                    }
                    className={`text-xs px-2 py-1 rounded-full font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${STATUS_STYLES[t.status]}`}
                  >
                    <option value="pending">pending</option>
                    <option value="planned">planned</option>
                    <option value="in_progress">in progress</option>
                    <option value="done">done</option>
                  </select>
                  <button
                    onClick={() => setAssignTask(t)}
                    className="text-slate-300 hover:text-green-500 dark:hover:text-green-400 transition"
                    title="Assign resource"
                  >
                    <UserPlus size={15} />
                  </button>
                  <button
                    onClick={() => setEditTask(t)}
                    className="text-slate-300 hover:text-brand-500 dark:hover:text-brand-400 transition"
                    title="Edit task"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(t.id)}
                    className="text-slate-300 hover:text-red-400 transition"
                    title="Delete task"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {showCreate && <TaskModal onClose={() => setShowCreate(false)} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
      {assignTask && <AssignModal task={assignTask} onClose={() => setAssignTask(null)} />}
    </div>
  );
}
