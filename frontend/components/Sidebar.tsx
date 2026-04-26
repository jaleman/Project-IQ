"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, CheckSquare, Bell, MessageSquarePlus, Inbox, X } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { feedbackApi, authApi } from "@/lib/api";
import type { FeedbackType, User } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team", label: "Team", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const FEEDBACK_TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug_report", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "comment", label: "Comment" },
  { value: "other", label: "Other" },
];

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { data: meRes } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), retry: false });
  const user = meRes?.data?.data as User | undefined;

  const [type, setType] = useState<FeedbackType>("comment");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => feedbackApi.submit({ type, notes }),
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Send Feedback</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <p className="text-green-600 dark:text-green-400 font-medium text-sm">Thanks for your feedback!</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Your name</label>
              <input
                disabled
                value={user?.name ?? "Loading…"}
                className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
              >
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                required
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the issue, idea, or comment…"
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || !notes.trim()}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60"
              >
                {mutation.isPending ? "Sending…" : "Send Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: meRes } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), retry: false });
  const me = meRes?.data?.data as User | undefined;
  const isAdminOrLeader = ["admin", "leader"].includes(me?.role ?? "");

  return (
    <>
      <aside className="w-60 bg-brand-900 dark:bg-slate-950 text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <span className="text-2xl font-bold tracking-tight">ProjectIQ</span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                pathname === href
                  ? "bg-white/20 text-white"
                  : "text-blue-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          {isAdminOrLeader && (
            <Link
              href="/feedback"
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                pathname === "/feedback"
                  ? "bg-white/20 text-white"
                  : "text-blue-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <Inbox size={18} />
              Feedback Inbox
            </Link>
          )}
        </nav>
        <div className="px-3 pb-5">
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition"
          >
            <MessageSquarePlus size={18} />
            Feedback
          </button>
        </div>
      </aside>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
