"use client";

// NOTE: The notification bell was removed from the UI for now.
// The query + button are preserved (commented out) so we can revive it
// later if we add real-time alerts or a quick-preview popover.
// import { useQuery } from "@tanstack/react-query";
// import { notificationsApi } from "@/lib/api";
// import { Bell } from "lucide-react";

export default function TopBar() {
  // const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => notificationsApi.list() });
  // const unread = (data?.data?.data ?? []).filter((n: { read: boolean }) => !n.read).length;

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        {/*
        <button className="relative text-slate-500 hover:text-slate-800">
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
        */}
        <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-semibold flex items-center justify-center">
          U
        </div>
      </div>
    </header>
  );
}
