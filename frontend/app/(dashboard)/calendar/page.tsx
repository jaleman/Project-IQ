"use client";

import { useQuery } from "@tanstack/react-query";
import { eventsApi, shiftsApi } from "@/lib/api";
import type { Event, Shift } from "@/lib/types";
import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";

export default function CalendarPage() {
  const { data: eventsData } = useQuery({ queryKey: ["events"], queryFn: () => eventsApi.list() });
  const { data: shiftsData } = useQuery({ queryKey: ["shifts"], queryFn: () => shiftsApi.list() });

  const events: Event[] = eventsData?.data?.data ?? [];
  const shifts: Shift[] = shiftsData?.data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Calendar & Scheduling</h1>
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

        {/* Shifts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="font-semibold text-slate-700 mb-4">Shifts</h2>
          <div className="space-y-3">
            {shifts.length === 0 && <p className="text-slate-400 text-sm">No shifts assigned.</p>}
            {shifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500">
                    {format(new Date(s.start_time), "Pp")} → {format(new Date(s.end_time), "Pp")}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.status === "swap_requested"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
