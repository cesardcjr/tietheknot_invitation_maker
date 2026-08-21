import React, { useEffect, useState } from "react";
import InvitationPreview from "../components/InvitationPreview";
import { publicInvitation } from "../api";

export default function PublicInvitation({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ rsvpStatus: "Accepted", attendingPax: 1, dietaryNotes: "", guestMessage: "" });

  useEffect(() => {
    publicInvitation.get(token).then(({ data: value }) => {
      setData(value);
      setForm({
        rsvpStatus: value.guest.rsvpStatus === "Declined" ? "Declined" : "Accepted",
        attendingPax: value.guest.attendingPax || 1,
        dietaryNotes: value.guest.dietaryNotes || "",
        guestMessage: value.guest.guestMessage || "",
      });
    }).catch((err) => setError(err.response?.data?.message || "This invitation is unavailable."));
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await publicInvitation.rsvp(token, form);
      setData(response.data);
      setSubmitted(true);
      document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't save your RSVP. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) return <main className="public-state"><div className="brand-mark">TTK</div><h1>Invitation unavailable</h1><p>{error}</p></main>;
  if (!data) return <main className="public-state"><span className="spinner" /><p>Opening your invitation…</p></main>;

  return (
    <main className="public-page">
      <InvitationPreview design={data.design} event={data.event} guest={data.guest}>
        {data.invitation.customMessage && <blockquote className="personal-message">“{data.invitation.customMessage}”</blockquote>}
        <section className="rsvp-section" id="rsvp" aria-labelledby="rsvp-title">
          {submitted ? <div className="rsvp-success" role="status"><span aria-hidden="true">✓</span><h2>Thank you for responding</h2><p>{data.guest.rsvpStatus === "Accepted" ? `We look forward to celebrating with all ${data.guest.attendingPax} of you.` : "Your response has been shared with the couple."}</p>{data.seating.released && data.seating.tableLabel && <div className="table-reveal"><small>Your assigned table</small><strong>{data.seating.tableLabel}</strong></div>}<button className="text-button" onClick={() => setSubmitted(false)}>Update response</button></div> : <form onSubmit={submit}><p className="eyebrow">Kindly respond</p><h2 id="rsvp-title">Will you join us?</h2><div className="response-options"><label className={form.rsvpStatus === "Accepted" ? "selected" : ""}><input type="radio" name="rsvp" value="Accepted" checked={form.rsvpStatus === "Accepted"} onChange={() => setForm({ ...form, rsvpStatus: "Accepted" })} /><span>Joyfully accepts</span></label><label className={form.rsvpStatus === "Declined" ? "selected" : ""}><input type="radio" name="rsvp" value="Declined" checked={form.rsvpStatus === "Declined"} onChange={() => setForm({ ...form, rsvpStatus: "Declined", attendingPax: 0 })} /><span>Regretfully declines</span></label></div>{form.rsvpStatus === "Accepted" && <label className="public-field">Number attending<select value={form.attendingPax} onChange={(e) => setForm({ ...form, attendingPax: Number(e.target.value) })}>{Array.from({ length: data.guest.invitedPax }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} {value === 1 ? "guest" : "guests"}</option>)}</select><small>Your invitation is for up to {data.guest.invitedPax}.</small></label>}<label className="public-field">Dietary notes<textarea rows="3" maxLength="1000" value={form.dietaryNotes} onChange={(e) => setForm({ ...form, dietaryNotes: e.target.value })} placeholder="Allergies or dietary requirements" /></label><label className="public-field">Message for the couple<textarea rows="3" maxLength="1500" value={form.guestMessage} onChange={(e) => setForm({ ...form, guestMessage: e.target.value })} placeholder="Optional" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary wide" disabled={saving}>{saving ? "Sending response…" : "Send RSVP"}</button></form>}
        </section>
      </InvitationPreview>
      <footer className="public-footer">Created with TieTheKnot PH</footer>
    </main>
  );
}
