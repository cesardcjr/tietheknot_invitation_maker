import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import InvitationPreview from "../components/InvitationPreview";
import { invitations, PLANNER_URL, PUBLIC_URL, uploadToCloudinary } from "../api";

const DEFAULT_DESIGN = {
  templateKey: "garden",
  published: false,
  content: {
    coupleNames: "Our Wedding",
    headline: "We're getting married",
    welcomeMessage: "Together with our families, we invite you to celebrate with us.",
    venue: "",
    address: "",
    ceremonyTime: "",
    receptionTime: "",
    dressCode: "",
    entourageNote: "",
    contactMessage: "",
  },
  theme: { primary: "#315c4c", accent: "#c89f65", background: "#fbf8f1", text: "#26332d", fontPair: "classic" },
  assets: {},
};

function mergeDesign(value) {
  return {
    ...DEFAULT_DESIGN,
    ...(value || {}),
    content: { ...DEFAULT_DESIGN.content, ...(value?.content || {}) },
    theme: { ...DEFAULT_DESIGN.theme, ...(value?.theme || {}) },
    assets: { ...(value?.assets || {}) },
  };
}

function friendlyError(err) {
  return err.response?.data?.message || "Something went wrong. Please try again.";
}

export default function Builder({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [active, setActive] = useState("design");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(null);
  const qrDialogRef = useRef(null);

  const load = async () => {
    setBusy("loading");
    try {
      const response = await invitations.bootstrap();
      setData(response.data);
      setDesign(mergeDesign(response.data.design));
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) return onLogout();
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy("");
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!qr) return undefined;
    const previous = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    qrDialogRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") setQr(null);
      if (event.key === "Tab") {
        const focusable = [...qrDialogRef.current.querySelectorAll("button, a[href]")];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = priorOverflow;
      previous?.focus?.();
    };
  }, [qr]);

  const invitationByGuest = useMemo(
    () => new Map((data?.invitations || []).map((item) => [String(item.guestId), item])),
    [data?.invitations],
  );
  const filteredGuests = (data?.guests || []).filter((guest) =>
    guest.name.toLowerCase().includes(search.toLowerCase()),
  );

  const setContent = (field, value) => setDesign((current) => ({ ...current, content: { ...current.content, [field]: value } }));
  const setTheme = (field, value) => setDesign((current) => ({ ...current, theme: { ...current.theme, [field]: value } }));

  const saveDesign = async (nextDesign = design) => {
    setBusy("design");
    setNotice(null);
    try {
      const response = await invitations.saveDesign(nextDesign);
      const saved = mergeDesign(response.data);
      setDesign(saved);
      setData((current) => ({ ...current, design: saved }));
      setNotice({ type: "success", text: saved.published ? "Invitation saved and published." : "Invitation design saved." });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy("");
    }
  };

  const togglePublished = async () => {
    const next = { ...design, published: !design.published };
    setDesign(next);
    await saveDesign(next);
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setNotice({ type: "error", text: "Choose an image file." });
    if (file.size > 8 * 1024 * 1024) return setNotice({ type: "error", text: "Images must be 8 MB or smaller." });
    setBusy("upload");
    setNotice(null);
    try {
      const asset = await uploadToCloudinary(file);
      setDesign((current) => ({ ...current, assets: { ...current.assets, coverImage: asset } }));
      setNotice({ type: "success", text: "Cover uploaded. Save the design to publish it." });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy("");
    }
  };

  const removeCover = async () => {
    const asset = design.assets?.coverImage;
    setBusy("upload");
    try {
      if (asset?.publicId) await invitations.deleteImage(asset.publicId);
      setDesign((current) => ({ ...current, assets: {} }));
      setNotice({ type: "success", text: "Cover removed. Save the design to confirm." });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy("");
    }
  };

  const createInvite = async (guest) => {
    setBusy(`guest-${guest._id}`);
    try {
      const response = await invitations.create(guest._id);
      setData((current) => ({
        ...current,
        invitations: [...current.invitations.filter((item) => String(item.guestId) !== String(guest._id)), response.data],
      }));
      setNotice({ type: "success", text: `Personal link created for ${guest.name}.` });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy("");
    }
  };

  const invitationLink = (invitation) => `${PUBLIC_URL}/i/${invitation.publicToken}`;

  const copyLink = async (invitation) => {
    try {
      await navigator.clipboard.writeText(invitationLink(invitation));
      setNotice({ type: "success", text: "Personal invitation link copied." });
    } catch {
      window.prompt("Copy this invitation link:", invitationLink(invitation));
    }
  };

  const showQr = async (guest, invitation) => {
    const image = await QRCode.toDataURL(invitationLink(invitation), { width: 640, margin: 2, color: { dark: "#20352c", light: "#ffffff" } });
    setQr({ guest, invitation, image });
  };

  const markSent = async (invitation) => {
    const response = await invitations.update(invitation._id, { status: "Sent" });
    setData((current) => ({ ...current, invitations: current.invitations.map((item) => item._id === invitation._id ? response.data : item) }));
    setNotice({ type: "success", text: "Invitation marked as sent." });
  };

  const saveSeatingRelease = async (checked) => {
    const response = await invitations.saveSettings({ seatingReleased: checked });
    setData((current) => ({ ...current, invitationSettings: response.data }));
    setNotice({ type: "success", text: checked ? "Table assignments are now visible to guests." : "Table assignments are hidden." });
  };

  if (busy === "loading" && !data) return <div className="app-loading"><span className="spinner" /> Loading Invitation Studio…</div>;
  if (!data) return <div className="app-loading"><button className="button primary" onClick={load}>Try again</button></div>;

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div><p className="eyebrow">TieTheKnot PH</p><h1>Invitation Studio</h1></div>
        <div className="header-actions"><a className="button ghost" href={PLANNER_URL}>Open Planner</a><button className="button ghost" onClick={onLogout}>Sign out</button></div>
      </header>
      <nav className="studio-tabs" aria-label="Invitation maker sections">
        <button className={active === "design" ? "active" : ""} onClick={() => setActive("design")}>Design</button>
        <button className={active === "guests" ? "active" : ""} onClick={() => setActive("guests")}>Guest Links <span>{data.guests.length}</span></button>
        <button className={active === "settings" ? "active" : ""} onClick={() => setActive("settings")}>Publishing</button>
      </nav>
      {notice && <div className={`notice ${notice.type}`} role="status"><span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}

      {active === "design" && (
        <main className="builder-layout">
          <section className="editor-panel" aria-labelledby="editor-title">
            <div className="section-heading"><div><p className="eyebrow">Customize</p><h2 id="editor-title">Invitation details</h2></div><button className="button primary" disabled={busy === "design"} onClick={() => saveDesign()}>{busy === "design" ? "Saving…" : "Save design"}</button></div>
            <div className="form-section"><h3>Cover image</h3><div className="upload-row">{design.assets?.coverImage?.secureUrl && <img src={design.assets.coverImage.secureUrl} alt={design.assets.coverImage.alt || "Current cover"} />}<div><label className="button secondary file-button">{busy === "upload" ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={uploadCover} disabled={busy === "upload"} /></label><p>JPG, PNG, WebP or AVIF · up to 8 MB</p>{design.assets?.coverImage && <button className="text-button danger" onClick={removeCover}>Remove image</button>}</div></div></div>
            <div className="form-section"><h3>Story</h3><div className="field-grid">
              <label>Couple names<input value={design.content.coupleNames} maxLength="160" onChange={(e) => setContent("coupleNames", e.target.value)} /></label>
              <label>Headline<input value={design.content.headline} maxLength="200" onChange={(e) => setContent("headline", e.target.value)} /></label>
              <label className="full">Welcome message<textarea rows="4" value={design.content.welcomeMessage} onChange={(e) => setContent("welcomeMessage", e.target.value)} /></label>
              <label>Venue<input value={design.content.venue} onChange={(e) => setContent("venue", e.target.value)} /></label>
              <label>Address<input value={design.content.address} onChange={(e) => setContent("address", e.target.value)} /></label>
              <label>Ceremony time<input type="time" value={design.content.ceremonyTime} onChange={(e) => setContent("ceremonyTime", e.target.value)} /></label>
              <label>Reception time<input type="time" value={design.content.receptionTime} onChange={(e) => setContent("receptionTime", e.target.value)} /></label>
              <label className="full">Dress code<input value={design.content.dressCode} onChange={(e) => setContent("dressCode", e.target.value)} /></label>
              <label className="full">Personal note<textarea rows="3" value={design.content.entourageNote} onChange={(e) => setContent("entourageNote", e.target.value)} /></label>
              <label className="full">Contact note<input value={design.content.contactMessage} onChange={(e) => setContent("contactMessage", e.target.value)} /></label>
            </div></div>
            <div className="form-section"><h3>Theme</h3><div className="theme-grid">
              {[['primary','Primary'],['accent','Accent'],['background','Background'],['text','Text']].map(([field, label]) => <label key={field}>{label}<span className="color-control"><input type="color" value={design.theme[field]} onChange={(e) => setTheme(field, e.target.value)} /><code>{design.theme[field]}</code></span></label>)}
              <label>Typography<select value={design.theme.fontPair} onChange={(e) => setTheme("fontPair", e.target.value)}><option value="classic">Classic</option><option value="modern">Modern</option><option value="romantic">Romantic</option></select></label>
            </div></div>
          </section>
          <aside className="preview-panel"><div className="preview-label"><span>Live preview</span><small>Guest view</small></div><InvitationPreview preview design={design} event={data.event} guest={{ name: "Juan and Family" }} /></aside>
        </main>
      )}

      {active === "guests" && (
        <main className="content-page">
          <div className="section-heading"><div><p className="eyebrow">Personal links</p><h2>Guest invitations</h2><p className="muted">Each guest receives a private link connected to their RSVP and table.</p></div><label className="search-box"><span className="sr-only">Search guests</span><input type="search" placeholder="Search guests…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
          <div className="guest-card-grid">
            {filteredGuests.map((guest) => {
              const invitation = invitationByGuest.get(String(guest._id));
              return <article className="guest-card" key={guest._id}><div className="guest-card-top"><div className="guest-initial" aria-hidden="true">{guest.name.charAt(0).toUpperCase()}</div><div><h3>{guest.name}</h3><p>{guest.pax || 1} invited · {guest.category}</p></div><span className={`status-pill status-${(invitation?.status || "none").toLowerCase()}`}>{invitation?.status || "No link"}</span></div><dl><div><dt>RSVP</dt><dd>{guest.rsvpStatus || (guest.confirmed ? "Accepted" : "Pending")}</dd></div><div><dt>Attending</dt><dd>{guest.attendingPax || 0} pax</dd></div><div><dt>Table</dt><dd>{guest.tableNumber ? (String(guest.tableNumber).startsWith("P") ? `Pres. ${String(guest.tableNumber).slice(1)}` : guest.tableNumber) : "Unassigned"}</dd></div></dl><div className="card-actions">{!invitation ? <button className="button primary" disabled={busy === `guest-${guest._id}`} onClick={() => createInvite(guest)}>{busy === `guest-${guest._id}` ? "Creating…" : "Create link"}</button> : <><button className="button secondary" onClick={() => copyLink(invitation)}>Copy link</button><button className="button secondary" onClick={() => showQr(guest, invitation)}>QR code</button>{invitation.status !== "Sent" && invitation.status !== "Responded" && <button className="text-button" onClick={() => markSent(invitation)}>Mark sent</button>}</>}</div></article>;
            })}
          </div>
          {!filteredGuests.length && <div className="empty-state"><h3>No guests found</h3><p>Add guests in the Wedding Planner or change your search.</p></div>}
        </main>
      )}

      {active === "settings" && (
        <main className="content-page narrow">
          <div className="section-heading"><div><p className="eyebrow">Visibility</p><h2>Publish and release</h2></div></div>
          <section className="setting-card"><div><h3>Publish invitation</h3><p>Personal links work only while the invitation design is published.</p></div><button className={`toggle ${design.published ? "on" : ""}`} role="switch" aria-checked={design.published} onClick={togglePublished}><span /></button></section>
          <section className="setting-card"><div><h3>Release table assignments</h3><p>When enabled, responded guests can see their assigned table from their private invitation.</p></div><button className={`toggle ${data.invitationSettings?.seatingReleased ? "on" : ""}`} role="switch" aria-checked={Boolean(data.invitationSettings?.seatingReleased)} onClick={() => saveSeatingRelease(!data.invitationSettings?.seatingReleased)}><span /></button></section>
          <section className="info-card"><h3>Before sharing links</h3><ol><li>Save the couple, venue, schedule, and cover image.</li><li>Publish the invitation.</li><li>Create one private link per guest or household.</li><li>Send the link or download its QR code.</li><li>Release seating only after final table assignments are ready.</li></ol></section>
        </main>
      )}

      {qr && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setQr(null)}><section ref={qrDialogRef} className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title"><button className="modal-close" aria-label="Close QR code" onClick={() => setQr(null)}>×</button><p className="eyebrow">Private invitation</p><h2 id="qr-title">{qr.guest.name}</h2><img src={qr.image} alt={`QR code for ${qr.guest.name}'s invitation`} /><p>Scanning opens this guest’s secure invitation, RSVP, and released table information.</p><div className="modal-actions"><a className="button secondary" href={qr.image} download={`invitation-${qr.guest.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`}>Download QR</a><button className="button primary" onClick={() => copyLink(qr.invitation)}>Copy link</button></div></section></div>}
    </div>
  );
}
