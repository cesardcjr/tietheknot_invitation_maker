import React from "react";
import { textStyle } from "../utils/typography";

export function RsvpTitle({ design, id }) {
  return <h2 id={id} style={textStyle(design?.sections?.typography?.rsvpTitle)}>
    {design?.content?.rsvpTitle?.trim() || "Will you celebrate with us?"}
  </h2>;
}

export function RsvpSubmit({ design, disabled = false, busy = false }) {
  return <button type="submit" className="button primary" disabled={disabled || busy}
    style={textStyle(design?.sections?.typography?.rsvpButtonText)}>
    {busy ? "Sending…" : design?.content?.rsvpButtonText?.trim() || "Send response"}
  </button>;
}
