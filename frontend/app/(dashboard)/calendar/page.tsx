"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, eventsApi, projectsApi } from "@/lib/api";
import type { Event, Project, ProjectDetail, ProjectStatus, User } from "@/lib/types";
import { format } from "date-fns";
import { CalendarPlus, FolderPlus, ChevronDown, ChevronRight } from "lucide-react";

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  completed: "bg-slate-100 text-slate-500",
};

const TASK_STATUS_BADGE: Record<string, string> = {
  pending: "bg-orange-100 text-orange-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export default function CalendarPage() {
  const qc = useQueryClient();

  const { data: meRes } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), retry: false });
  const isAdminOrLeader = ["admin", "leader"].includes(
    (meRes?.data?.data as User | undefined)?.role ?? ""
  );

  const { data: eventsData } = useQuery({ queryKey: ["events"], queryFn: () => eventsApi.list() });
  const { data: projectsData } = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list() });

  const events: Event[] = eventsData?.data?.data ?? [];
  const projects: Project[] = projectsData?.data?.data ?? [];

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Calendar & Projects</h1>
        <button className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition">
          <CalendarPlus size={16} /> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {events.length === 0 && <p className="text-slate-400 text-sm">No events scheduled.</p>}
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-800">{e.title}</p>
                  <p className="text-xs text-slate-500">{format(new Date(e.date), "PPP")}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {e.required_staff} staff
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Projects</h2>
            {isAdminOrLeader && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                <FolderPlus size={14} /> New
              </button>
            )}
          </div>
          <div className="space-y-2">
            {projects.length === 0 && <p className="text-slate-400 text-sm">No projects yet.</p>}
            {projects.map((p) => (
              <div key={p.id} className="border border-slate-100 rounded-xl overflow-hidden">
                {/* Project row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-left"
                >
                  <div className="flex items-center gap-2">
                    {expandedId === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status]}`}>
                    {p.status.replace("_", " ")}
                  </span>
                </button>

                {/* Expanded task list */}
                {expandedId === p.id && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                    {p.description && (
                      <p className="text-xs text-slate-500 mb-3">{p.description}</p>
                    )}
                    {!detail || detail.id !== p.id ? (
                      <p className="text-xs text-slate-400">Loading tasks…</p>
                    ) : detail.tasks.length === 0 ? (
                      <p className="text-xs text-slate-400">No tasks assigned to this project yet.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400 uppercase">
                            <th className="text-left pb-1">Task</th>
                            <th className="text-left pb-1">Assigned to</th>
                            <th className="text-left pb-1">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.tasks.map((t) => (
                            <tr key={t.id}>
                              <td className="py-1.5 pr-3 font-medium text-slate-700">{t.title}</td>
                              <td className="py-1.5 pr-3 text-slate-500">{t.user_name}</td>
                              <td className="py-1.5">
                                <span className={`px-1.5 py-0.5 rounded-full font-medium ${TASK_STATUS_BADGE[t.status]}`}>
                                  {t.status.replace("_", " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Project Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">New Project</h2>
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
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
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
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
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
