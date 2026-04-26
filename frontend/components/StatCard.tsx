import { type ReactNode } from "react";
import { clsx } from "clsx";

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
};

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  color: keyof typeof COLOR_MAP;
}

export default function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", COLOR_MAP[color])}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
