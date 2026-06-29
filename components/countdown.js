"use client";

import { useEffect, useState } from "react";

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function CountdownPill() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const end = Date.now() + 42 * 60 * 1000 + 36 * 1000;
    const tick = () => setRemaining(end - Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <span className="countdown-pill">{formatTime(remaining)}</span>;
}
