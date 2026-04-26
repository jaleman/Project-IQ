import { type ReactNode } from "react";
import { clsx } from "clsx";

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
};

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: keyof typeof COLOR_MAP;
}

export default function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", COLOR_MAP[color])}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
