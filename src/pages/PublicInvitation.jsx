import React, { useEffect, useState } from "react";
import InvitationPreview from "../components/InvitationPreview";
import { publicInvitation } from "../api";

export default function PublicInvitation({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [choice, setChoice] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [revealedStatus, setRevealedStatus] = useState("");

  useEffect(() => {
    publicInvitation.get(token).then(({ data: value }) => {
      setData(value);
    }).catch((err) => setError(err.response?.data?.message || "This invitation is unavailable."));
  }, [token]);

  const saveResponse = async (payload) => {
    setSaving(true); setError("");
    try {
      const response = await publicInvitation.rsvp(token, payload);
      setData(response.data);
      setRevealedStatus(payload.rsvpStatus);
      document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    } catch (err) { setError(err.response?.data?.message || "We couldn't save your RSVP. Please try again."); }
    finally { setSaving(false); }
    return false;
  };

  const accept = async () => {
    if (saving) return;
    setChoice("Accepted");
    setRevealedStatus("");
    setDeclineReason("");
    setError("");
    await saveResponse({ rsvpStatus: "Accepted" });
  };

  const chooseDecline = () => {
    if (saving) return;
    setChoice("Declined");
    setRevealedStatus("");
    setError("");
  };

  const submitDecline = async (event) => {
    event.preventDefault();
    if (!declineReason.trim()) return setError("Please tell the couple why you cannot attend.");
    await saveResponse({ rsvpStatus: "Declined", declineReason: declineReason.trim() });
  };

  if (error && !data) return <main className="public-state"><div className="brand-mark">TTK</div><h1>Invitation unavailable</h1><p>{error}</p></main>;
  if (!data) return <main className="public-state"><span className="spinner" /><p>Opening your invitation…</p></main>;

  const assignment = data.seating.released && data.seating.tableLabel ? data.seating.tableLabel : "Your table number will appear soon.";

  return (
    <main className="public-page">
      <InvitationPreview design={data.design} event={data.event} guest={data.guest}>
        {data.invitation.customMessage && <blockquote className="personal-message">“{data.invitation.customMessage}”</blockquote>}
        <section className="story-section rsvp-story-section" id="rsvp" aria-labelledby="rsvp-title"><div className="section-inner">
          <form className="rsvp-form" onSubmit={submitDecline}><p className="section-kicker">Kindly respond</p><h2 id="rsvp-title">Will you celebrate with us?</h2><div className="response-options"><button type="button" disabled={saving} className={choice === "Accepted" ? "selected" : ""} aria-pressed={choice === "Accepted"} onClick={accept}><span aria-hidden="true">✓</span><strong>{saving && choice === "Accepted" ? "Accepting…" : "Accept"}</strong><small>Joyfully attending</small></button><button type="button" disabled={saving} className={choice === "Declined" ? "selected decline" : ""} aria-pressed={choice === "Declined"} onClick={chooseDecline}><span aria-hidden="true">×</span><strong>Decline</strong><small>Unable to attend</small></button></div>
            {revealedStatus === "Accepted" && <div className={`table-reveal${data.seating.tableLabel ? " assigned" : ""}`} role="status"><small>Your table assignment</small><strong>{assignment}</strong></div>}
            {choice === "Declined" && revealedStatus !== "Declined" && <div className="decline-response-panel"><label className="public-field decline-reason">Reason for declining <span aria-hidden="true">*</span><textarea required autoFocus rows="4" maxLength="1000" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Please share a brief reason with the couple" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary wide" disabled={saving}>{saving ? "Sending response…" : "Send"}</button></div>}
            {revealedStatus === "Declined" && <p className="rsvp-response-note" role="status">Your response has been shared with the couple.</p>}
            {error && choice !== "Declined" && <p className="form-error" role="alert">{error}</p>}
          </form>
        </div></section>
      </InvitationPreview>
      <footer className="public-footer">Created with TieTheKnot PH</footer>
    </main>
  );
}
