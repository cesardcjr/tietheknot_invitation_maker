import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import InvitationPreview from "../components/InvitationPreview";
import { GreetingStyleControls, ImageUploadField, PaletteEditor, SectionStyleControls } from "../components/DesignControls";
import { invitations, PLANNER_URL, PUBLIC_URL, uploadToCloudinary } from "../api";
import { youtubeEmbedUrl } from "../utils/youtube";

const DEFAULT_DESIGN = {
  templateKey: "garden",
  published: false,
  content: {
    coupleNames: "Our Wedding", headline: "We're getting married",
    welcomeMessage: "Together with our families, we invite you to celebrate with us.",
    videoMessage: "", youtubeUrl: "",
    ceremonyVenue: "", ceremonyAddress: "", ceremonyTime: "",
    receptionVenue: "", receptionAddress: "", receptionTime: "",
    venue: "", address: "", dressCode: "",
    dressCodeMen: "Formal attire", dressCodeWomen: "Formal attire",
    menColors: ["#1f332b", "#c8b38b"], womenColors: ["#d9b7ad", "#a9bcae"],
    entourageNote: "", contactMessage: "",
    closingMessage: "Thank you for being part of our story.",
  },
  theme: { primary: "#315c4c", accent: "#c89f65", background: "#fbf8f1", text: "#26332d", fontPair: "classic" },
  assets: {},
  sections: {
    cover: { backgroundColor: "#315c4c", backgroundOpacity: 1, imageOpacity: .72, fontFamily: "classic", fontSize: 72 },
    welcome: { backgroundColor: "#fbf8f1", backgroundOpacity: 1, imageOpacity: .35, fontFamily: "classic", fontSize: 38 },
    greeting: { fontFamily: "classic", fontSize: 34, textColor: "#315c4c" },
    closing: { backgroundColor: "#315c4c", backgroundOpacity: 1, imageOpacity: .55, fontFamily: "classic", fontSize: 44 },
  },
};

const DESIGN_SECTIONS = [
  ["cover", "Cover Page", "First impression"], ["welcome", "Welcome", "Countdown and message"],
  ["video", "Video", "YouTube message"], ["venue", "Venue", "Ceremony and reception"],
  ["dress", "Dress Code", "Looks and colors"], ["rsvp", "RSVP", "Guest response"],
  ["closing", "Final Page", "Closing message"],
];

function mergeDesign(value) {
  const content = { ...DEFAULT_DESIGN.content, ...(value?.content || {}) };
  if (!content.ceremonyVenue) content.ceremonyVenue = content.venue || "";
  if (!content.ceremonyAddress) content.ceremonyAddress = content.address || "";
  if (!content.receptionVenue) content.receptionVenue = content.venue || "";
  if (!content.receptionAddress) content.receptionAddress = content.address || "";
  return {
    ...DEFAULT_DESIGN, ...(value || {}), content,
    theme: { ...DEFAULT_DESIGN.theme, ...(value?.theme || {}) },
    assets: { ...(value?.assets || {}) },
    sections: {
      cover: { ...DEFAULT_DESIGN.sections.cover, ...(value?.sections?.cover || {}) },
      welcome: { ...DEFAULT_DESIGN.sections.welcome, ...(value?.sections?.welcome || {}) },
      greeting: { ...DEFAULT_DESIGN.sections.greeting, ...(value?.sections?.greeting || {}) },
      closing: { ...DEFAULT_DESIGN.sections.closing, ...(value?.sections?.closing || {}) },
    },
  };
}

const friendlyError = (err) => err.response?.data?.message || "Something went wrong. Please try again.";

export default function Builder({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [active, setActive] = useState("design");
  const [designSection, setDesignSection] = useState("cover");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(null);
  const [pendingDeletes, setPendingDeletes] = useState([]);
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
    } finally { setBusy(""); }
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
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = priorOverflow; previous?.focus?.(); };
  }, [qr]);

  const invitationByGuest = useMemo(() => new Map((data?.invitations || []).map((item) => [String(item.guestId), item])), [data?.invitations]);
  const filteredGuests = (data?.guests || []).filter((guest) => guest.name.toLowerCase().includes(search.toLowerCase()));
  const setContent = (field, value) => setDesign((current) => ({ ...current, content: { ...current.content, [field]: value } }));
  const setTheme = (field, value) => setDesign((current) => ({ ...current, theme: { ...current.theme, [field]: value } }));
  const setSectionStyle = (section, value) => setDesign((current) => ({ ...current, sections: { ...current.sections, [section]: value } }));
  const navigate = (page) => { setActive(page); setSidebarOpen(false); };

  const saveDesign = async (nextDesign = design) => {
    if (nextDesign.content.youtubeUrl && !youtubeEmbedUrl(nextDesign.content.youtubeUrl)) {
      setDesignSection("video");
      return setNotice({ type: "error", text: "Enter a valid YouTube watch, short, or share link." });
    }
    setBusy("design"); setNotice(null);
    try {
      const response = await invitations.saveDesign(nextDesign);
      const saved = mergeDesign(response.data);
      setDesign(saved); setData((current) => ({ ...current, design: saved }));
      if (pendingDeletes.length) await Promise.allSettled(pendingDeletes.map((publicId) => invitations.deleteImage(publicId)));
      setPendingDeletes([]);
      setNotice({ type: "success", text: saved.published ? "Invitation saved and published." : "Invitation design saved." });
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
    finally { setBusy(""); }
  };

  const togglePublished = async () => { const next = { ...design, published: !design.published }; setDesign(next); await saveDesign(next); };
  const uploadAsset = async (assetKey, label, event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setNotice({ type: "error", text: "Choose an image file." });
    if (file.size > 8 * 1024 * 1024) return setNotice({ type: "error", text: "Images must be 8 MB or smaller." });
    setBusy(`upload-${assetKey}`); setNotice(null);
    try {
      const asset = await uploadToCloudinary(file);
      asset.alt = label;
      const previous = design.assets?.[assetKey]?.publicId;
      if (previous) setPendingDeletes((items) => [...new Set([...items, previous])]);
      setDesign((current) => ({ ...current, assets: { ...current.assets, [assetKey]: asset } }));
      setNotice({ type: "success", text: `${label} uploaded. Save the design to confirm.` });
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
    finally { setBusy(""); }
  };
  const removeAsset = (assetKey) => {
    const previous = design.assets?.[assetKey]?.publicId;
    if (previous) setPendingDeletes((items) => [...new Set([...items, previous])]);
    setDesign((current) => { const assets = { ...current.assets }; delete assets[assetKey]; return { ...current, assets }; });
    setNotice({ type: "success", text: "Image removed from the draft. Save to confirm." });
  };

  const createInvite = async (guest) => {
    setBusy(`guest-${guest._id}`);
    try {
      const response = await invitations.create(guest._id);
      setData((current) => ({ ...current, invitations: [...current.invitations.filter((item) => String(item.guestId) !== String(guest._id)), response.data] }));
      setNotice({ type: "success", text: `Personal link created for ${guest.name}.` });
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
    finally { setBusy(""); }
  };
  const invitationLink = (invitation) => `${PUBLIC_URL}/i/${invitation.publicToken}`;
  const copyLink = async (invitation) => {
    try { await navigator.clipboard.writeText(invitationLink(invitation)); setNotice({ type: "success", text: "Personal invitation link copied." }); }
    catch { window.prompt("Copy this invitation link:", invitationLink(invitation)); }
  };
  const showQr = async (guest, invitation) => {
    const image = await QRCode.toDataURL(invitationLink(invitation), { width: 640, margin: 2, color: { dark: "#20352c", light: "#ffffff" } });
    setQr({ guest, invitation, image });
  };
  const markSent = async (invitation) => {
    try {
      const response = await invitations.update(invitation._id, { status: "Sent" });
      setData((current) => ({ ...current, invitations: current.invitations.map((item) => item._id === invitation._id ? response.data : item) }));
      setNotice({ type: "success", text: "Invitation marked as sent." });
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
  };
  const saveSeatingRelease = async (checked) => {
    try {
      const response = await invitations.saveSettings({ seatingReleased: checked });
      setData((current) => ({ ...current, invitationSettings: response.data }));
      setNotice({ type: "success", text: checked ? "Table assignments are now visible to guests." : "Table assignments are hidden." });
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
  };

  const pageTitle = active === "design" ? "Invitation Design" : active === "guests" ? "Guest Links" : "Publishing";
  const imageField = (assetKey, label) => <ImageUploadField id={`upload-${assetKey}`} label={label} asset={design.assets?.[assetKey]} busy={busy === `upload-${assetKey}`} onUpload={(event) => uploadAsset(assetKey, label, event)} onRemove={() => removeAsset(assetKey)} />;

  const editorFields = () => {
    if (designSection === "cover") return <><div className="form-section"><h3>Cover content</h3><div className="field-grid"><label>Couple names<input value={design.content.coupleNames} maxLength="160" onChange={(e) => setContent("coupleNames", e.target.value)} /></label><label>Headline<input value={design.content.headline} maxLength="200" onChange={(e) => setContent("headline", e.target.value)} /></label></div></div><div className="form-section"><h3>Cover image</h3>{imageField("coverImage", "Wedding cover image")}</div><div className="form-section"><h3>Page appearance</h3><SectionStyleControls value={design.sections.cover} onChange={(value) => setSectionStyle("cover", value)} /><div className="theme-grid brand-colors"><label>Accent color<span className="color-control"><input type="color" value={design.theme.accent} onChange={(e) => setTheme("accent", e.target.value)} /><code>{design.theme.accent}</code></span></label><label>Text color<span className="color-control"><input type="color" value={design.theme.text} onChange={(e) => setTheme("text", e.target.value)} /><code>{design.theme.text}</code></span></label></div></div></>;
    if (designSection === "welcome") return <><div className="form-section"><h3>Second-page image</h3>{imageField("welcomeImage", "Welcome page image")}</div><div className="form-section"><h3>Welcome message</h3><label>Message<textarea rows="6" value={design.content.welcomeMessage} onChange={(e) => setContent("welcomeMessage", e.target.value)} /></label><p className="field-hint">The live countdown above this message uses the wedding date from your Planner event.</p></div><div className="form-section"><h3>Guest greeting</h3><p className="field-hint">Customize the “Dear [guest]” line independently from the welcome message.</p><GreetingStyleControls value={design.sections.greeting} onChange={(value) => setSectionStyle("greeting", value)} /></div><div className="form-section"><h3>Page appearance</h3><SectionStyleControls value={design.sections.welcome} onChange={(value) => setSectionStyle("welcome", value)} /></div></>;
    if (designSection === "video") return <div className="form-section no-border"><h3>Video message</h3><div className="field-stack"><label>Optional message above the video<textarea rows="4" value={design.content.videoMessage} onChange={(e) => setContent("videoMessage", e.target.value)} /></label><label>YouTube link<input type="url" placeholder="https://www.youtube.com/watch?v=…" value={design.content.youtubeUrl} onChange={(e) => setContent("youtubeUrl", e.target.value)} /><small>Supports YouTube watch, Shorts, embed, and youtu.be links.</small></label>{design.content.youtubeUrl && !youtubeEmbedUrl(design.content.youtubeUrl) && <p className="inline-error">This does not look like a supported YouTube link.</p>}</div></div>;
    if (designSection === "venue") return <><div className="form-section"><h3>Wedding Ceremony</h3><div className="field-grid"><label>Venue<input value={design.content.ceremonyVenue} onChange={(e) => setContent("ceremonyVenue", e.target.value)} /></label><label>Time<input type="time" value={design.content.ceremonyTime} onChange={(e) => setContent("ceremonyTime", e.target.value)} /></label><label className="full">Address<textarea rows="3" value={design.content.ceremonyAddress} onChange={(e) => setContent("ceremonyAddress", e.target.value)} /></label></div></div><div className="form-section"><h3>Reception</h3><div className="field-grid"><label>Venue<input value={design.content.receptionVenue} onChange={(e) => setContent("receptionVenue", e.target.value)} /></label><label>Time<input type="time" value={design.content.receptionTime} onChange={(e) => setContent("receptionTime", e.target.value)} /></label><label className="full">Address<textarea rows="3" value={design.content.receptionAddress} onChange={(e) => setContent("receptionAddress", e.target.value)} /></label></div></div></>;
    if (designSection === "dress") return <><div className="form-section"><h3>Dress code introduction</h3><label>General guidance<input value={design.content.dressCode} onChange={(e) => setContent("dressCode", e.target.value)} /></label></div><div className="form-section"><h3>Men</h3>{imageField("menDressImage", "Men's dress reference")}<label>Attire guidance<textarea rows="4" value={design.content.dressCodeMen} onChange={(e) => setContent("dressCodeMen", e.target.value)} /></label><PaletteEditor label="Suggested colors" colors={design.content.menColors} onChange={(colors) => setContent("menColors", colors)} /></div><div className="form-section"><h3>Women</h3>{imageField("womenDressImage", "Women's dress reference")}<label>Attire guidance<textarea rows="4" value={design.content.dressCodeWomen} onChange={(e) => setContent("dressCodeWomen", e.target.value)} /></label><PaletteEditor label="Suggested colors" colors={design.content.womenColors} onChange={(colors) => setContent("womenColors", colors)} /></div></>;
    if (designSection === "rsvp") return <div className="form-section no-border"><h3>Guest response experience</h3><div className="editor-info-grid"><article><span>Accept</span><p>Acceptance is recorded immediately, then the guest’s table assignment appears.</p></article><article><span>Decline</span><p>A required reason field and Send button appear only after Decline is selected.</p></article></div><p className="field-hint">The initial view contains only the RSVP message and response buttons. Use Publishing to control when assigned table numbers become visible.</p></div>;
    return <><div className="form-section"><h3>Closing image</h3>{imageField("closingImage", "Closing page image")}</div><div className="form-section"><h3>Final message</h3><div className="field-stack"><label>Closing message<textarea rows="5" value={design.content.closingMessage} onChange={(e) => setContent("closingMessage", e.target.value)} /></label><label>Contact note<input value={design.content.contactMessage} onChange={(e) => setContent("contactMessage", e.target.value)} /></label></div></div><div className="form-section"><h3>Page appearance</h3><SectionStyleControls value={design.sections.closing} onChange={(value) => setSectionStyle("closing", value)} /></div></>;
  };

  if (busy === "loading" && !data) return <div className="app-loading"><span className="spinner" /> Loading Invitation Studio…</div>;
  if (!data) return <div className="app-loading"><button className="button primary" onClick={load}>Try again</button></div>;

  return (
    <div className="studio-app-shell">
      {sidebarOpen && <button className="studio-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`studio-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="studio-brand"><span className="studio-brand-mark">TTK</span><div><strong>TieTheKnot</strong><small>Invitation Studio</small></div></div>
        <div className="studio-user"><span>{session.user?.fullName?.charAt(0) || "U"}</span><div><strong>{session.user?.fullName}</strong><small>Event Planner</small></div></div>
        <nav aria-label="Invitation Studio"><p>Workspace</p><button className={active === "design" ? "active" : ""} onClick={() => navigate("design")}><span aria-hidden="true">✦</span> Invitation Design</button><button className={active === "guests" ? "active" : ""} onClick={() => navigate("guests")}><span aria-hidden="true">♙</span> Guest Links <b>{data.guests.length}</b></button><button className={active === "settings" ? "active" : ""} onClick={() => navigate("settings")}><span aria-hidden="true">◉</span> Publishing</button></nav>
        <div className="studio-sidebar-footer"><a href={PLANNER_URL}>← Wedding Planner</a><button onClick={onLogout}>Sign out</button></div>
      </aside>

      <div className="studio-main">
        <header className="studio-topbar"><button className="studio-menu" aria-label="Open navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>☰</button><div><p className="eyebrow">TieTheKnot PH</p><h1>{pageTitle}</h1></div><div className="topbar-actions">{active === "design" && <button className="button primary" disabled={busy === "design"} onClick={() => saveDesign()}>{busy === "design" ? "Saving…" : "Save design"}</button>}</div></header>
        {notice && <div className={`notice ${notice.type}`} role="status"><span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}

        {active === "design" && <main className="design-page"><div className="design-section-nav" aria-label="Design sections">{DESIGN_SECTIONS.map(([key, label, detail]) => <button key={key} className={designSection === key ? "active" : ""} onClick={() => setDesignSection(key)}><span>{label}</span><small>{detail}</small></button>)}</div><div className="design-workspace"><section className="editor-panel" aria-labelledby="editor-title"><div className="editor-title"><p className="eyebrow">Customize section</p><h2 id="editor-title">{DESIGN_SECTIONS.find(([key]) => key === designSection)?.[1]}</h2></div>{editorFields()}</section><aside className="preview-panel"><div className="preview-label"><span>Live preview</span><small>Scroll all pages</small></div><InvitationPreview preview design={design} event={data.event} guest={{ name: "Juan and Family" }}><section className="preview-rsvp"><div className="reveal-item"><p className="section-kicker">Kindly respond</p><h2>Will you celebrate with us?</h2><div><button>Accept</button><button>Decline</button></div></div></section></InvitationPreview></aside></div></main>}

        {active === "guests" && <main className="content-page"><div className="section-heading"><div><p className="eyebrow">Personal links</p><h2>Guest invitations</h2><p className="muted">Every link stays connected to its guest’s RSVP and table assignment.</p></div><label className="search-box"><span className="visually-hidden">Search guests</span><input type="search" placeholder="Search guests…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div><div className="guest-card-grid">{filteredGuests.map((guest) => { const invitation = invitationByGuest.get(String(guest._id)); return <article className="guest-card" key={guest._id}><div className="guest-card-top"><div className="guest-initial" aria-hidden="true">{guest.name.charAt(0).toUpperCase()}</div><div><h3>{guest.name}</h3><p>{guest.pax || 1} invited · {guest.category}</p></div><span className={`status-pill status-${(invitation?.status || "none").toLowerCase()}`}>{invitation?.status || "No link"}</span></div><dl><div><dt>RSVP</dt><dd>{guest.rsvpStatus || (guest.confirmed ? "Accepted" : "Pending")}</dd></div><div><dt>Attending</dt><dd>{guest.attendingPax || 0} pax</dd></div><div><dt>Table</dt><dd>{guest.tableNumber ? (String(guest.tableNumber).startsWith("P") ? `Pres. ${String(guest.tableNumber).slice(1)}` : guest.tableNumber) : "Unassigned"}</dd></div></dl><div className="card-actions">{!invitation ? <button className="button primary" disabled={busy === `guest-${guest._id}`} onClick={() => createInvite(guest)}>{busy === `guest-${guest._id}` ? "Creating…" : "Create link"}</button> : <><button className="button secondary" onClick={() => copyLink(invitation)}>Copy link</button><button className="button secondary" onClick={() => showQr(guest, invitation)}>QR code</button>{!['Sent','Responded'].includes(invitation.status) && <button className="text-button" onClick={() => markSent(invitation)}>Mark sent</button>}</>}</div></article>; })}</div>{!filteredGuests.length && <div className="empty-state"><h3>No guests found</h3><p>Add guests in the Wedding Planner or change your search.</p></div>}</main>}

        {active === "settings" && <main className="content-page narrow"><div className="section-heading"><div><p className="eyebrow">Visibility</p><h2>Publish and release</h2></div></div><section className="setting-card"><div><h3>Publish invitation</h3><p>Personal links work only while the invitation design is published.</p></div><button className={`toggle ${design.published ? "on" : ""}`} role="switch" aria-checked={design.published} onClick={togglePublished}><span /></button></section><section className="setting-card"><div><h3>Release table assignments</h3><p>When enabled, accepted guests can see their assigned table. Unassigned guests see a friendly placeholder.</p></div><button className={`toggle ${data.invitationSettings?.seatingReleased ? "on" : ""}`} role="switch" aria-checked={Boolean(data.invitationSettings?.seatingReleased)} onClick={() => saveSeatingRelease(!data.invitationSettings?.seatingReleased)}><span /></button></section><section className="info-card"><h3>Before sharing links</h3><ol><li>Complete and save every design section.</li><li>Publish the invitation.</li><li>Create one private link per guest or household.</li><li>Share the link or its downloadable QR code.</li><li>Release seating only after table assignments are ready.</li></ol></section></main>}
      </div>

      {qr && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setQr(null)}><section ref={qrDialogRef} className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title"><button className="modal-close" aria-label="Close QR code" onClick={() => setQr(null)}>×</button><p className="eyebrow">Private invitation</p><h2 id="qr-title">{qr.guest.name}</h2><img src={qr.image} alt={`QR code for ${qr.guest.name}'s invitation`} /><p>Scanning opens this guest’s secure invitation, RSVP, and released table information.</p><div className="modal-actions"><a className="button secondary" href={qr.image} download={`invitation-${qr.guest.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`}>Download QR</a><button className="button primary" onClick={() => copyLink(qr.invitation)}>Copy link</button></div></section></div>}
    </div>
  );
}
