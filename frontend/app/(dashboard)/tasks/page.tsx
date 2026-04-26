"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { Plus, Lock, Share2, X } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
};

const STATUS_NEXT: Record<TaskStatus, TaskStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

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

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; notes?: string; is_private: boolean }) =>
      tasksApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setTitle("");
      setNotes("");
      setIsPrivate(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      notes: notes.trim() || undefined,
      is_private: isPrivate,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tasks</h1>
        <button
          onClick={() => setShowForm(true)}
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
              className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800">{t.title}</p>
                  {t.is_private && <Lock size={14} className="text-slate-400" />}
                  {t.shared_with && <Share2 size={14} className="text-blue-400" />}
                </div>
                {t.notes && <p className="text-xs text-slate-500 mt-0.5">{t.notes}</p>}
                <p className="text-xs text-slate-400 mt-1">{format(new Date(t.created_at), "PP")}</p>
              </div>
              <button
                onClick={() =>
                  updateMutation.mutate({ id: t.id, status: STATUS_NEXT[t.status] })
                }
                className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_STYLES[t.status]}`}
              >
                {t.status.replace("_", " ")}
              </button>
              <button
                onClick={() => deleteMutation.mutate(t.id)}
                className="text-slate-300 hover:text-red-400 transition text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">New Task</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Restock supplies"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Optional details"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
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
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || !title.trim()}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
