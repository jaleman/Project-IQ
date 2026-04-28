"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, feedbackApi } from "@/lib/api";
import type { Feedback, FeedbackType, User } from "@/lib/types";
import { format } from "date-fns";
import { MessageSquare, CheckCircle2 } from "lucide-react";

const TYPE_BADGE: Record<FeedbackType, string> = {
  bug_report: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  feature_request: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  comment: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  other: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const TYPE_LABEL: Record<FeedbackType, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  comment: "Comment",
  other: "Other",
};

function ReplyForm({ item, onDone }: { item: Feedback; onDone: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState(item.reply ?? "");

  const mutation = useMutation({
    mutationFn: () => feedbackApi.reply(item.id, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      onDone();
    },
  });

  return (
    <div className="mt-3 space-y-2">
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your reply…"
        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Save Reply"}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const { data: meRes } = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), retry: false });
  const me = meRes?.data?.data as User | undefined;
  const isAdminOrLeader = ["admin", "leader"].includes(me?.role ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => feedbackApi.list(),
  });
  const items: Feedback[] = data?.data?.data ?? [];

  const [replyingId, setReplyingId] = useState<number | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isAdminOrLeader ? "Feedback Inbox" : "My Feedback"}
        </h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {items.length} submission{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500">No feedback submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                    {item.user_name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[item.type]}`}>
                    {TYPE_LABEL[item.type]}
                  </span>
                  {item.reply && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                      <CheckCircle2 size={13} /> Replied
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {format(new Date(item.created_at), "PPp")}
                </span>
              </div>

              {/* Feedback notes */}
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-3">
                {item.notes}
              </p>

              {/* Existing reply */}
              {item.reply && replyingId !== item.id && (
                <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-brand-700 dark:text-brand-300 flex items-center gap-1">
                      <MessageSquare size={12} /> Developer reply
                    </span>
                    {item.replied_at && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {format(new Date(item.replied_at), "PPp")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {item.reply}
                  </p>
                </div>
              )}

              {/* Reply controls (admin/leader only) */}
              {isAdminOrLeader && (
                replyingId === item.id ? (
                  <ReplyForm item={item} onDone={() => setReplyingId(null)} />
                ) : (
                  <button
                    onClick={() => setReplyingId(item.id)}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-200 font-medium transition"
                  >
                    {item.reply ? "Edit reply" : "Reply"}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
