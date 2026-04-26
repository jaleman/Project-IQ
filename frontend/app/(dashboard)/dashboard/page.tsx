"use client";

import { useQuery } from "@tanstack/react-query";
import { tasksApi, assignmentsApi, notificationsApi, usersApi } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { Users, ClipboardList, CheckSquare, Bell } from "lucide-react";

export default function DashboardPage() {
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() });
  const { data: assignments } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => assignmentsApi.list(),
  });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  const userCount = users?.data?.data?.length ?? 0;
  const assignmentCount = assignments?.data?.data?.length ?? 0;
  const taskCount = tasks?.data?.data?.length ?? 0;
  const unreadCount = (notifications?.data?.data ?? []).filter(
    (n: { read: boolean }) => !n.read
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={22} />} label="Team Members" value={userCount} color="blue" />
        <StatCard
          icon={<ClipboardList size={22} />}
          label="Active Assignments"
          value={assignmentCount}
          color="green"
        />
        <StatCard icon={<CheckSquare size={22} />} label="Open Tasks" value={taskCount} color="purple" />
        <StatCard icon={<Bell size={22} />} label="Unread Alerts" value={unreadCount} color="orange" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          AI Agent Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Detect Overallocation", action: "detect_overallocation" },
            { label: "Check Capacity", action: "check_coverage" },
            { label: "Optimize Assignments", action: "optimize_assignments" },
          ].map(({ label, action }) => (
            <button
              key={action}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
