import React, { useEffect, useRef, useState } from "react";
import InvitationPreview from "../components/InvitationPreview";
import { publicInvitation, sharedInvitation } from "../api";

const responseCopy = {
  Accepted: "See you!",
  Declined: "We understand, thank you for responding!",
};
const message = (error, fallback) => error.response?.data?.message || fallback;

export default function PublicInvitation({ sharedKey, token }) {
  const [data, setData] = useState(null);
  const [pageError, setPageError] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [names, setNames] = useState([]);
  const [searchState, setSearchState] = useState("");
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [proof, setProof] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [busy, setBusy] = useState(false);
  const suggestionList = useRef(null);
  const verified = sharedKey ? Boolean(proof) : Boolean(data);

  useEffect(() => {
    let active = true;
    const request = sharedKey ? sharedInvitation.get(sharedKey) : publicInvitation.get(token);
    request.then(({ data: value }) => {
      if (!active) return;
      if (value.sharedKey && !sharedKey) {
        window.location.replace("/event/" + encodeURIComponent(value.sharedKey));
        return;
      }
      setData(value);
      setStatus(value.guest?.rsvpStatus || "");
    }).catch((err) => {
      if (active) setPageError(message(err, "This invitation is unavailable."));
    });
    return () => { active = false; };
  }, [sharedKey, token]);

  useEffect(() => {
    if (!sharedKey || selected || query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchState("searching");
      try {
        const { data: result } = await sharedInvitation.search(sharedKey, query, controller.signal);
        if (controller.signal.aborted) return;
        setNames(result.names);
        setSearchState(result.names.length ? "" : "empty");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(message(err, "Unable to search right now. Please try again."));
        setSearchState("");
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [sharedKey, query, selected]);

  function changeName(value) {
    setQuery(value);
    setSelected("");
    setNames([]);
    setSearchState("");
    setCode("");
    setProof("");
    setStatus("");
    setEditing(false);
    setDeclining(false);
    setDeclineReason("");
    setError("");
  }

  async function verify(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data: result } = await sharedInvitation.verify(sharedKey, selected, code);
      setProof(result.proof);
      setStatus(result.status);
      setCode("");
    } catch (err) { setError(message(err, "Unable to verify your RSVP code.")); }
    finally { setBusy(false); }
  }

  async function respond(rsvpStatus) {
    setBusy(true);
    setError("");
    try {
      const payload = { rsvpStatus, declineReason: rsvpStatus === "Declined" ? declineReason.trim() : "" };
      if (sharedKey) await sharedInvitation.respond(sharedKey, { ...payload, proof });
      else await publicInvitation.rsvp(token, payload);
      setStatus(rsvpStatus);
      setEditing(false);
      setDeclining(false);
      setDeclineReason("");
    } catch (err) {
      if (sharedKey && err.response?.status === 403) {
        setProof("");
        setStatus("");
        setEditing(false);
        setDeclining(false);
      }
      setError(message(err, "We couldn't save your RSVP. Please try again."));
    } finally { setBusy(false); }
  }

  if (pageError) return <main className="public-state"><h1>Invitation unavailable</h1><p>{pageError}</p></main>;
  if (!data) return <main className="public-state"><span className="spinner" /><p>Opening your invitation…</p></main>;

  const chooseName = (name) => {
    setSelected(name);
    setQuery(name);
    setNames([]);
    setError("");
  };

  return (
    <main className="public-page">
      <InvitationPreview design={data.design} event={data.event}>
        <section className="story-section rsvp-story-section" id="rsvp" aria-labelledby="rsvp-title"><div className="section-inner">
          <div className="rsvp-form">
            <p className="section-kicker">Kindly respond</p>
            <h2 id="rsvp-title">Will you celebrate with us?</h2>
            {sharedKey && !selected && <div className="rsvp-lookup">
              <label className="public-field">Full Name
                <input type="search" maxLength={160} autoComplete="off" value={query} onChange={(event) => changeName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && names.length) {
                      event.preventDefault();
                      suggestionList.current?.querySelector("button")?.focus();
                    }
                  }} />
              </label>
              {names.length > 0 && <ul ref={suggestionList} className="rsvp-suggestions" aria-label="Matching guest names">
                {names.map((name) => <li key={name}><button type="button" onClick={() => chooseName(name)}>{name}</button></li>)}
              </ul>}
              <p aria-live="polite">{searchState === "searching" ? "Searching…" : searchState === "empty" ? "No matching names. Check the spelling or ask the host." : "Enter at least three characters and choose your name."}</p>
            </div>}
            {sharedKey && selected && <div className="rsvp-lookup">
              <p><strong>{selected}</strong> <button type="button" className="text-button" disabled={busy} onClick={() => changeName("")}>Change name</button></p>
              {!verified && <form onSubmit={verify}>
                <label className="public-field">Private RSVP code
                  <input required maxLength={10} autoComplete="off" autoCapitalize="characters" value={code} onChange={(event) => setCode(event.target.value)} />
                </label>
                <p>Enter the code provided privately by your host.</p>
                <button className="button primary" disabled={busy}>{busy ? "Verifying…" : "Verify"}</button>
              </form>}
            </div>}
            {verified && responseCopy[status] && !editing && <div className="rsvp-result">
              <p role="status">{responseCopy[status]}</p>
              <button type="button" className="button secondary" onClick={() => { setEditing(true); setError(""); }}>Change response</button>
            </div>}
            {verified && (!responseCopy[status] || editing) && <>
              <div className="response-options">
                <button type="button" disabled={busy} onClick={() => respond("Accepted")}><span aria-hidden="true">✓</span><strong>Accept</strong></button>
                <button type="button" disabled={busy} onClick={() => { setDeclining(true); setError(""); }}><span aria-hidden="true">×</span><strong>Decline</strong></button>
              </div>
              {declining && <form className="decline-response-panel" onSubmit={(event) => {
                event.preventDefault();
                if (declineReason.trim()) respond("Declined");
                else setError("Please tell the couple why you cannot attend.");
              }}>
                <label className="public-field decline-reason">Reason for declining
                  <textarea required rows={3} maxLength={1000} value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} />
                </label>
                <button className="button primary" disabled={busy}>{busy ? "Sending…" : "Send response"}</button>
              </form>}
              {editing && <button type="button" className="text-button" disabled={busy} onClick={() => { setEditing(false); setDeclining(false); setError(""); }}>Cancel change</button>}
            </>}
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
        </div></section>
      </InvitationPreview>
      <footer className="public-footer">Created with TieTheKnot PH</footer>
    </main>
  );
}
