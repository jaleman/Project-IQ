"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { Plus, Lock, Share2, X, Pencil } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  done: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

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

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; notes?: string; is_private: boolean }) =>
      tasksApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); onClose(); },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { title: string; notes?: string; is_private: boolean }) =>
      tasksApi.update(task!.id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); onClose(); },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = { title: title.trim(), notes: notes.trim() || undefined, is_private: isPrivate };
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
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
            placeholder="e.g. Restock supplies"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Optional details"
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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60"
          >
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TasksPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const tasks: Task[] = data?.data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tasks</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading tasks...</p>
      ) : (
        <div className="space-y-3">
          {tasks.length === 0 && <p className="text-slate-400">No tasks yet.</p>}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{t.title}</p>
                  {t.is_private && <Lock size={14} className="text-slate-400" />}
                  {t.shared_with && <Share2 size={14} className="text-blue-400" />}
                </div>
                {t.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.notes}</p>}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{format(new Date(t.created_at), "PP")}</p>
              </div>
              <button
                onClick={() => updateMutation.mutate({ id: t.id, status: STATUS_NEXT[t.status] })}
                className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_STYLES[t.status]}`}
              >
                {t.status.replace("_", " ")}
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
                className="text-slate-300 hover:text-red-400 transition text-sm"
                title="Delete task"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && <TaskModal onClose={() => setShowCreate(false)} />}
      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}
