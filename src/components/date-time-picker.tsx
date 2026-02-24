"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { Calendar, Clock, X } from "lucide-react";

interface DateTimePickerProps {
  /** Called with ISO string when user confirms a selection */
  onSelect: (isoString: string) => void;
  onCancel: () => void;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Disable past dates (default true) */
  disablePast?: boolean;
  /** Color accent: "amber" | "emerald" | "blue" */
  accent?: "amber" | "emerald" | "blue";
}

const accentStyles = {
  amber: {
    button: "bg-amber-600 hover:bg-amber-700",
    selected: "bg-amber-600 text-white",
    today: "text-amber-600 font-bold",
  },
  emerald: {
    button: "bg-emerald-600 hover:bg-emerald-700",
    selected: "bg-emerald-600 text-white",
    today: "text-emerald-600 font-bold",
  },
  blue: {
    button: "bg-blue-600 hover:bg-blue-700",
    selected: "bg-blue-600 text-white",
    today: "text-blue-600 font-bold",
  },
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 15, 30, 45];

export function DateTimePicker({
  onSelect,
  onCancel,
  confirmLabel = "Confirm",
  disablePast = true,
  accent = "blue",
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showTime, setShowTime] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const ref = useRef<HTMLDivElement>(null);

  const colors = accentStyles[accent];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleConfirm = () => {
    if (!selectedDate) return;
    const result = new Date(selectedDate);
    if (showTime) {
      let h = hour;
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      result.setHours(h, minute, 0, 0);
    } else {
      result.setHours(9, 0, 0, 0);
    }
    onSelect(result.toISOString());
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div ref={ref} className="rounded-xl border border-zinc-200 bg-white shadow-lg">
      {/* Calendar */}
      <div className="p-3">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={disablePast ? { before: today } : undefined}
          showOutsideDays
          classNames={{
            root: "text-sm",
            months: "flex",
            month_grid: "w-full border-collapse",
            month_caption: "flex items-center justify-center py-1",
            caption_label: "text-sm font-semibold text-zinc-800",
            nav: "flex items-center gap-1",
            button_previous: "absolute left-2 top-3 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600",
            button_next: "absolute right-2 top-3 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600",
            weekdays: "flex",
            weekday: "w-9 text-center text-[11px] font-medium text-zinc-400 py-1",
            week: "flex",
            day: "relative p-0 text-center",
            day_button: "h-9 w-9 rounded-lg text-sm text-zinc-700 transition-colors hover:bg-zinc-100",
            today: colors.today,
            selected: `${colors.selected} rounded-lg hover:opacity-90`,
            outside: "text-zinc-300",
            disabled: "text-zinc-200 cursor-not-allowed hover:bg-transparent",
            month: "relative",
          }}
        />
      </div>

      {/* Time toggle + selector */}
      <div className="border-t border-zinc-100 px-4 py-3">
        <button
          onClick={() => setShowTime(!showTime)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          <Clock size={14} />
          {showTime ? "Remove time" : "Add a time"}
        </button>

        {showTime && (
          <div className="mt-2 flex items-center gap-2">
            {/* Hour */}
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus:border-zinc-300 focus:outline-none"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className="text-zinc-400">:</span>
            {/* Minute */}
            <select
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 focus:border-zinc-300 focus:outline-none"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}
                </option>
              ))}
            </select>
            {/* AM/PM */}
            <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
              {(["AM", "PM"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setAmpm(v)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    ampm === v
                      ? "bg-zinc-800 text-white"
                      : "bg-white text-zinc-500 hover:bg-zinc-50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
        >
          <X size={12} />
          Cancel
        </button>
        {selectedDate && (
          <p className="text-[11px] text-zinc-400">
            {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {showTime && ` at ${hour}:${String(minute).padStart(2, "0")} ${ampm}`}
          </p>
        )}
        <button
          onClick={handleConfirm}
          disabled={!selectedDate}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-30 ${colors.button}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
