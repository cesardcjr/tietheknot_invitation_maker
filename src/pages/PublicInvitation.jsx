import React, { useEffect, useRef, useState } from "react";
import InvitationPreview from "../components/InvitationPreview";
import { RsvpTitle, RsvpSubmit } from "../components/RsvpCopy";
import { publicInvitation, sharedInvitation } from "../api";

const responseCopy = {
  Accepted: "See you!",
  Declined: "We understand, thank you for responding!",
};

export default function PublicInvitation({ sharedKey, token }) {
  const [data, setData] = useState(null);
  const [pageError, setPageError] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [choice, setChoice] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const attempt = useRef(null);

  useEffect(() => {
    let active = true;
    const request = sharedKey ? sharedInvitation.get(sharedKey) : publicInvitation.get(token);
    request.then(({ data: value }) => {
      if (!active) return;
      if (value.sharedKey && !sharedKey) window.location.replace("/event/" + encodeURIComponent(value.sharedKey));
      else setData(value);
    }).catch(() => { if (active) setPageError("This invitation is unavailable."); });
    return () => { active = false; };
  }, [sharedKey, token]);

  async function submit(event) {
    event.preventDefault();
    if (busy || !choice || !name.trim() || (choice === "Declined" && !reason.trim())) {
      if (!busy) setError("Enter your full name and a reason if you are declining.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = { fullName: name.trim(), response: choice, declineReason: choice === "Declined" ? reason.trim() : "" };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature) attempt.current = { signature, requestId: crypto.randomUUID() };
    try {
      const body = { ...payload, requestId: attempt.current.requestId };
      const result = sharedKey ? await sharedInvitation.respond(sharedKey, body) : await publicInvitation.rsvp(token, body);
      setStatus(result.data.status);
    } catch (err) { setError(err.response?.data?.message || "We couldn't save your RSVP. Please try again."); }
    finally { setBusy(false); }
  }

  if (pageError) return <main className="public-state"><h1>Invitation unavailable</h1><p>{pageError}</p></main>;
  if (!data) return <main className="public-state"><span className="spinner" /><p>Opening your invitation…</p></main>;

  return <main className="public-page">
    <InvitationPreview design={data.design} event={data.event}>
      <section className="story-section rsvp-story-section" id="rsvp" aria-labelledby="rsvp-title"><div className="section-inner">
        <form className="rsvp-form" onSubmit={submit}>
          <p className="section-kicker">Kindly respond</p>
          <RsvpTitle id="rsvp-title" design={data.design} />
          {status ? <p className="rsvp-result" role="status">{responseCopy[status]}</p> : <>
            <label className="public-field">Full Name
              <input required maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
            </label>
            <div className="response-options">
              <button type="button" disabled={busy} aria-pressed={choice === "Accepted"} className={choice === "Accepted" ? "selected" : ""} onClick={() => setChoice("Accepted")}><span aria-hidden="true">✓</span><strong>Accept</strong></button>
              <button type="button" disabled={busy} aria-pressed={choice === "Declined"} className={choice === "Declined" ? "selected decline" : ""} onClick={() => setChoice("Declined")}><span aria-hidden="true">×</span><strong>Decline</strong></button>
            </div>
            {choice === "Declined" && <label className="public-field decline-reason">Reason for declining
              <textarea required rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} />
            </label>}
            {choice && <RsvpSubmit design={data.design} busy={busy} />}
            {error && <p className="form-error" role="alert">{error}</p>}
          </>}
        </form>
      </div></section>
    </InvitationPreview>
    <footer className="public-footer">Created with TieTheKnot PH</footer>
  </main>;
}
