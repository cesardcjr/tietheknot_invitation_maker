import React, { useEffect, useMemo, useState } from "react";

function targetDate(date, time) {
  if (!date) return null;
  const [year, month, day] = String(date).slice(0, 10).split("-").map(Number);
  const [hours = 0, minutes = 0] = String(time || "00:00").split(":").map(Number);
  const value = new Date(year, month - 1, day, hours, minutes);
  return Number.isNaN(value.getTime()) ? null : value;
}

function parts(target) {
  const distance = Math.max(0, (target?.getTime() || 0) - Date.now());
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor((distance / 3600000) % 24),
    minutes: Math.floor((distance / 60000) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

export default function Countdown({ date, time }) {
  const target = useMemo(() => targetDate(date, time), [date, time]);
  const [remaining, setRemaining] = useState(() => parts(target));

  useEffect(() => {
    setRemaining(parts(target));
    if (!target || target.getTime() <= Date.now()) return undefined;
    const interval = window.setInterval(() => setRemaining(parts(target)), 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  if (!target) return <p className="countdown-empty">Wedding date to be announced</p>;

  return (
    <div className="countdown" aria-label={`${remaining.days} days, ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds until the wedding`}>
      {[["Days", remaining.days], ["Hours", remaining.hours], ["Minutes", remaining.minutes], ["Seconds", remaining.seconds]].map(([label, value]) => (
        <div key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>
      ))}
    </div>
  );
}
