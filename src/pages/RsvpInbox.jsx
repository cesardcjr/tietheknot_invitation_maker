import React, { useEffect, useRef, useState } from "react";
import { invitations } from "../api";

const getError = (error, fallback) => error.response?.data?.message || fallback;

export default function RsvpInbox({ guests, onGuestUpdated }) {
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef(null);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    invitations.responses(page).then(({ data }) => { if (active) setList(data); })
      .catch((err) => { if (active) setError(getError(err, "Unable to load responses.")); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [page, refresh]);

  function openGuest(guest) {
    setEditing(guest);
    setResponse(guest.rsvpStatus === "Declined" ? "Declined" : guest.confirmed || guest.rsvpStatus === "Accepted" ? "Accepted" : "");
    setEditError("");
    setNotice("");
    dialog.current.showModal();
  }

  async function check(row, checked) {
    setBusy(true);
    setError("");
    try {
      const { data } = await invitations.checkResponse(row._id, checked);
      setList((current) => ({ ...current,
        checked: current.checked + Number(data.checked) - Number(row.checked),
        rows: current.rows.map((item) => item._id === row._id ? { ...item, checked: data.checked } : item),
      }));
    } catch (err) { setError(getError(err, "Unable to update the checkbox.")); }
    finally { setBusy(false); }
  }

  async function saveGuest(event) {
    event.preventDefault();
    if (!editing || !response || saving) return;
    setSaving(true);
    setEditError("");
    try {
      const { data } = await invitations.updateGuestResponse(editing._id, response);
      onGuestUpdated(data.guest);
      setNotice(data.guest.name + " updated to " + response.toLowerCase() + ".");
      dialog.current.close();
    } catch (err) { setEditError(getError(err, "Unable to update the guest.")); }
    finally { setSaving(false); }
  }

  const term = query.trim().toLocaleLowerCase();
  const matches = term ? guests.filter((guest) => guest.name.toLocaleLowerCase().includes(term)).slice(0, 15) : [];

  return <main className="content-page">
    <div className="section-heading"><div><h2>Guest RSVP</h2><p className="muted">Review submissions and update the matching guest in Planner.</p></div>
      <button className="button secondary" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>Refresh responses</button>
    </div>
    <div className="rsvp-inbox-kpis">
      <div className="info-card"><span>Total Responses</span><strong>{list?.total ?? "—"}</strong></div>
      <div className="info-card"><span>Checked Responses</span><strong>{list?.checked ?? "—"}</strong></div>
    </div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {list ? <>
      <table className="rsvp-inbox-table">
        <thead><tr><th scope="col">Full Name</th><th scope="col">Response</th><th scope="col">Reflected in Guest List</th></tr></thead>
        <tbody>{list.rows.map((row) => <tr key={row._id}>
          <td>{row.fullName}</td><td>{row.response}{row.declineReason && <small>{row.declineReason}</small>}</td>
          <td><input type="checkbox" aria-label={"Mark " + row.fullName + " response as reflected in Guest List"} checked={row.checked} disabled={busy} onChange={(event) => check(row, event.target.checked)} /></td>
        </tr>)}
        {!list.rows.length && <tr><td colSpan={3}>No RSVP responses yet.</td></tr>}</tbody>
      </table>
      {list.pages > 1 && <div className="card-actions rsvp-pager">
        <button className="button secondary" disabled={busy || list.page <= 1} onClick={() => setPage(list.page - 1)}>Previous</button>
        <span>Page {list.page} of {list.pages}</span>
        <button className="button secondary" disabled={busy || list.page >= list.pages} onClick={() => setPage(list.page + 1)}>Next</button>
      </div>}
    </> : busy && <p role="status">Loading responses…</p>}

    <section className="info-card rsvp-guest-search">
      <h3>Update the Guest List</h3>
      <label>Find a guest<input type="search" placeholder="Search by full name" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {notice && <p role="status">{notice}</p>}
      {term && !matches.length && <p>No matching guests.</p>}
      {matches.length > 0 && <ul>{matches.map((guest) => <li key={guest._id}>
        <div><strong>{guest.name}</strong><small>{[guest.category, guest.listedBy, (guest.pax || 1) + " pax", guest.rsvpStatus || (guest.confirmed ? "Accepted" : "Pending")].filter(Boolean).join(" · ")}</small></div>
        <button className="button secondary" aria-label={"Edit " + guest.name + " confirmation"} onClick={() => openGuest(guest)}>✎</button>
      </li>)}</ul>}
    </section>
    <dialog ref={dialog} className="rsvp-guest-dialog" onCancel={(event) => { if (saving) event.preventDefault(); }} onClose={() => setEditing(null)} aria-labelledby="rsvp-guest-dialog-title">
      {editing && <form onSubmit={saveGuest}>
        <h3 id="rsvp-guest-dialog-title">Update guest confirmation</h3>
        <p>{editing.name} · {editing.category} · {editing.pax || 1} pax</p>
        <label>Response<select required value={response} onChange={(event) => setResponse(event.target.value)} disabled={saving}>
          <option value="">Select a response</option><option value="Accepted">Accepted</option><option value="Declined">Declined</option>
        </select></label>
        {editError && <p className="inline-error" role="alert">{editError}</p>}
        <div className="card-actions">
          <button className="button secondary" type="button" disabled={saving} onClick={() => dialog.current.close()}>Cancel</button>
          <button className="button primary" disabled={saving || !response}>{saving ? "Saving…" : "Save response"}</button>
        </div>
      </form>}
    </dialog>
  </main>;
}
