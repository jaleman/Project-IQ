"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Moon, Settings, Sun } from "lucide-react";
import { authApi } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";

// NOTE: The notification bell was removed from the UI for now.
// The query + button are preserved (commented out) so we can revive it
// later if we add real-time alerts or a quick-preview popover.
// import { notificationsApi } from "@/lib/api";
// import { Bell } from "lucide-react";

export default function TopBar() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const { data: meRes } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    retry: false,
  });
  const user = meRes?.data?.data as { name?: string; email?: string } | undefined;
  const initial = (user?.name ?? user?.email ?? "U").charAt(0).toUpperCase();

  // Close menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleSignOut() {
    try {
      await authApi.logout();
    } catch {
      // server-side logout is best-effort (JWT is stateless)
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("projectiq_token");
    }
    qc.clear();
    router.replace("/login");
  }

  return (
    <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        {/* Dark mode quick toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {initial}
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50"
            >
              {user && (
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {user.name ?? "Signed in"}
                  </div>
                  {user.email && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowSettings(true);
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                role="menuitem"
              >
                <Settings size={14} /> Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowPwd(true);
                }}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                role="menuitem"
              >
                Change password
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                role="menuitem"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </header>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-5">Settings</h2>

        <div className="space-y-4">
          {/* Appearance */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
              Appearance
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition
                    ${theme === t
                      ? "border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                      : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                >
                  {t === "light" ? <Sun size={15} /> : <Moon size={15} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      setTimeout(onClose, 1200);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Change Password</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (next.length < 8) {
              setError("New password must be at least 8 characters");
              return;
            }
            if (next !== confirm) {
              setError("Passwords do not match");
              return;
            }
            mutation.mutate();
          }}
          className="space-y-3"
        >
          <input
            required
            type="password"
            placeholder="Current password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            placeholder="New password (min 8 chars)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Password updated.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || success}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
