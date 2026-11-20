import React from "react";

export default function SeatingMessage({ message, seats }) {
  const count = Number(seats);
  const hasSeats = Number.isInteger(count) && count > 0 && count <= 999;
  const text = message?.trim() || "Your seat assignment will be provided at the venue.";
  const parts = text.split("{seats}");
  return parts.map((part, index) => <React.Fragment key={index}>
    {index > 0 && hasSeats && <strong className="reserved-seat-count">{count}</strong>}
    {part}
  </React.Fragment>);
}
