"use client";

import { useEffect, useState } from "react";
import { nowInHomeZone } from "@/lib/timetable/constants";

// Red "current time" line on today's grid. Rendered only after mount (and
// then moved every minute) so the server's clock never has to match the
// browser's during hydration.
export function NowLine({
  firstHour,
  lastHour,
  hourHeight,
}: {
  firstHour: number;
  lastHour: number;
  hourHeight: number;
}) {
  const [minutes, setMinutes] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMinutes(nowInHomeZone().minutes);
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  if (minutes === null || minutes < firstHour * 60 || minutes > lastHour * 60) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top: ((minutes - firstHour * 60) / 60) * hourHeight }}
    >
      <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
      <span className="h-px flex-1 bg-red-500" />
    </div>
  );
}
