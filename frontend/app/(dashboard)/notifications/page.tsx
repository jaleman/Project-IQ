"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import type { Notification, TaskStatus } from "@/lib/types";
import { format } from "date-fns";
import { Check, Archive, ArchiveRestore } from "lucide-react";

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
};

type FilterKey = "all" | TaskStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Completed" },
];

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", showArchived],
    queryFn: () => notificationsApi.list(showArchived),
  });
  const all: Notification[] = data?.data?.data ?? [];

  const notifications = useMemo(
    () => (filter === "all" ? all : all.filter((n) => n.task_status === filter)),
    [all, filter]
  );

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.unarchive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {showArchived ? "Archived Notifications" : "Notifications"}
        </h1>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition"
        >
          {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
          {showArchived ? "View Active" : "View Archived"}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              filter === f.key
                ? "bg-brand-600 text-white"
                : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-brand-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {notifications.length === 0 && (
            <p className="text-slate-400">
              {showArchived ? "No archived notifications." : "No notifications."}
            </p>
          )}
          {notifications.map((n) => {
            const isComplete = n.task_status === "done";
            return (
              <div
                key={n.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${
                  n.read ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700" : "bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800"
                }`}
              >
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      n.read ? "text-slate-600 dark:text-slate-400" : "font-semibold text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {n.message}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(n.created_at), "PPp")}
                  </p>
                </div>
                {n.task_status && (
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      STATUS_STYLES[n.task_status]
                    }`}
                  >
                    {n.task_status.replace("_", " ")}
                  </span>
                )}
                {!showArchived && !n.read && (
                  <button
                    onClick={() => markReadMutation.mutate(n.id)}
                    disabled={!isComplete}
                    title={
                      isComplete
                        ? "Mark as read"
                        : "Available once the task is complete"
                    }
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-500"
                  >
                    <Check size={14} /> Mark read
                  </button>
                )}
                {!showArchived && isComplete && (
                  <button
                    onClick={() => archiveMutation.mutate(n.id)}
                    title="Archive"
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition"
                  >
                    <Archive size={14} /> Archive
                  </button>
                )}
                {showArchived && (
                  <button
                    onClick={() => unarchiveMutation.mutate(n.id)}
                    title="Restore"
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition"
                  >
                    <ArchiveRestore size={14} /> Restore
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
