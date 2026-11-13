import RsvpInbox from "./RsvpInbox";
import React, { useEffect, useState } from "react";
import mapLocation from "../utils/mapLocation";
import InvitationPreview from "../components/InvitationPreview";
import { CarouselUploadField, GreetingStyleControls, ImageUploadField, PaletteEditor, SectionStyleControls, TypographyControls } from "../components/DesignControls";
import { invitations, PLANNER_URL, PUBLIC_URL, uploadToCloudinary } from "../api";
import { RsvpTitle, RsvpSubmit } from "../components/RsvpCopy";
import { dressImageNote } from "../utils/dressNotes";
import { youtubeEmbedUrl } from "../utils/youtube";

const DEFAULT_DESIGN = {
  templateKey: "garden",
  published: false,
  content: {
    coupleNames: "Our Wedding", headline: "We're getting married",
    welcomeMessage: "Together with our families, we invite you to celebrate with us.",
    welcomeHeadline: "", seatingHeading: "", dressHeading: "", videoHeading: "",
    ceremonyMap: "", receptionMap: "", videoMessage: "", youtubeUrl: "",
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
      typography: value?.sections?.typography || {},
    },
  };
}

const friendlyError = (err) => err.response?.data?.message || err.response?.data?.error?.message || "Something went wrong. Please try again.";

export default function Builder({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [active, setActive] = useState("design");
  const [designSection, setDesignSection] = useState("cover");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");
  const [pendingDeletes, setPendingDeletes] = useState([]);

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
  const setContent = (field, value) => setDesign((current) => ({ ...current, content: { ...current.content, [field]: value } }));
  const setTheme = (field, value) => setDesign((current) => ({ ...current, theme: { ...current.theme, [field]: value } }));
  const setSectionStyle = (section, value) => setDesign((current) => ({ ...current, sections: { ...current.sections, [section]: value } }));
  const navigate = (page) => { setActive(page); setSidebarOpen(false); };

  const cleanUpImages = async () => {
    const results = await Promise.allSettled(pendingDeletes.map((publicId) => invitations.deleteImage(publicId)));
    const removed = new Set(pendingDeletes.filter((_, index) => results[index].status === "fulfilled"));
    setPendingDeletes((items) => items.filter((publicId) => !removed.has(publicId)));
  };

  const saveDesign = async (nextDesign = design) => {
    if (nextDesign.content.youtubeUrl && !youtubeEmbedUrl(nextDesign.content.youtubeUrl)) {
      setDesignSection("video");
      return setNotice({ type: "error", text: "Enter a valid YouTube watch, short, or share link." });
    }
    setBusy("design"); setNotice(null);
    try {
      const { published, ...draft } = nextDesign;
      const response = await invitations.saveDesign(draft);
      const saved = mergeDesign(response.data);
      setDesign(saved); setData((current) => ({ ...current, design: saved }));
      await cleanUpImages();
      setNotice({ type: "success", text: "Invitation draft saved." });
      return saved;
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
    finally { setBusy(""); }
  };

  const publish = async (published) => {
    if (published && !await saveDesign()) return;
    setBusy("design");
    try {
      const { data: saved } = await invitations.publishDesign(published);
      const merged = mergeDesign(saved);
      if (published) setDesign(merged);
      else setDesign((current) => ({ ...current, published: false }));
      setData((current) => ({ ...current, design: merged }));
      if (published) await cleanUpImages();
      setNotice({ type: "success", text: published ? "Shared invitation published." : "Invitation unpublished." });
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
    finally { setBusy(""); }
  };
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

  const uploadCarousel = async (event) => {
    const available = Math.max(0, 8 - (design.assets?.coverCarousel?.length || 0));
    const files = [...(event.target.files || [])].slice(0, available);
    event.target.value = "";
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)) {
      return setNotice({ type: "error", text: "Use JPG, PNG, WebP or AVIF images no larger than 8 MB each." });
    }
    setBusy("upload-cover-carousel"); setNotice(null);
    try {
      const uploaded = [];
      const rejected = [];
      for (const file of files) {
        const asset = await uploadToCloudinary(file);
        asset.alt = `Wedding carousel image ${(design.assets?.coverCarousel?.length || 0) + uploaded.length + 1}`;
        if (asset.width < asset.height * 1.2) rejected.push(asset.publicId);
        else uploaded.push(asset);
      }
      if (rejected.length) setPendingDeletes((items) => [...new Set([...items, ...rejected])]);
      if (uploaded.length) setDesign((current) => ({ ...current, assets: { ...current.assets, coverCarousel: [...(current.assets?.coverCarousel || []), ...uploaded].slice(0, 8) } }));
      setNotice({ type: rejected.length ? "error" : "success", text: rejected.length ? `${rejected.length} image${rejected.length === 1 ? " was" : "s were"} skipped because carousel images must be landscape.` : `${uploaded.length} carousel image${uploaded.length === 1 ? "" : "s"} uploaded. Save the design to confirm.` });
    } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
    finally { setBusy(""); }
  };

  const removeCarouselImage = (index) => {
    const image = design.assets?.coverCarousel?.[index];
    if (image?.publicId) setPendingDeletes((items) => [...new Set([...items, image.publicId])]);
    setDesign((current) => ({ ...current, assets: { ...current.assets, coverCarousel: (current.assets?.coverCarousel || []).filter((_, itemIndex) => itemIndex !== index) } }));
    setNotice({ type: "success", text: "Carousel image removed from the draft. Save to confirm." });
  };

  const publicLink = design.sharedKey && PUBLIC_URL + "/event/" + design.sharedKey;
  const copyText = async (value, message) => {
    try { await navigator.clipboard.writeText(value); setNotice({ type: "success", text: message }); }
    catch { window.prompt(message, value); }
  };
  const pageTitle = active === "design" ? "Invitation Design" : active === "guests" ? "Guest RSVP" : "Publishing";
  const imageField = (assetKey, label) => <ImageUploadField id={"upload-" + assetKey} label={label} asset={design.assets?.[assetKey]} busy={busy === "upload-" + assetKey} onUpload={(event) => uploadAsset(assetKey, label, event)} onRemove={() => removeAsset(assetKey)} />;
  const headingField = (key, label, fallback) => <label>{label}<input maxLength={160} placeholder={fallback} value={design.content[key]} onChange={(event) => setContent(key, event.target.value)} /></label>;

  const typographyField = (key, label) => <TypographyControls key={key} label={label}
    value={design.sections.typography?.[key]}
    onChange={(value) => setDesign((current) => ({
      ...current,
      sections: { ...current.sections, typography: { ...current.sections.typography, [key]: value } },
    }))} />;

  const galleryField = (key, label) => {
    const legacyKey = key.slice(0, -1);
    const legacy = design.assets[legacyKey];
    const images = design.assets[key] ?? (legacy ? [legacy] : []);
    const update = (next) => setDesign((current) => {
      const { [legacyKey]: old, ...assets } = current.assets;
      return { ...current, assets: { ...assets, [key]: next } };
    });
    const upload = async (event, index) => {
      const file = event.target.files?.[0];
      if (!file) return;
      event.target.value = "";
      if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
        return setNotice({ type: "error", text: "Choose a supported image under 8 MB." });
      }
      setBusy("gallery-" + key);
      try {
        const asset = await uploadToCloudinary(file);
        asset.alt = images[index]?.alt || label + " dress code reference " + (index + 1);
        asset.footerNote = images[index] ? dressImageNote(images[index]) : "";
        const previous = images[index]?.publicId;
        if (previous) setPendingDeletes((items) => [...items, previous]);
        update(index === images.length ? [...images, asset] : images.map((item, i) => i === index ? asset : item));
      } catch (err) { setNotice({ type: "error", text: friendlyError(err) }); }
      finally { setBusy(""); }
    };
    const move = (index, offset) => {
      const next = [...images];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      update(next);
    };
    return <div className="field-stack">
      {images.map((image, index) => <div key={image.publicId || index} className="dress-gallery-editor">
        <ImageUploadField id={key + "-" + index} label={label + " photo " + (index + 1)} asset={image} busy={Boolean(busy)}
          onUpload={(event) => upload(event, index)} onRemove={() => {
            if (image.publicId) setPendingDeletes((items) => [...items, image.publicId]);
            update(images.filter((item, i) => i !== index));
          }} />
        <label>Footer Notes<input maxLength={300} value={dressImageNote(image)} onChange={(event) => update(images.map((item, i) => i === index ? { ...item, footerNote: event.target.value } : item))} /></label>
        <label>Image alt text<input maxLength={300} value={image.alt || ""} onChange={(event) => update(images.map((item, i) => i === index ? { ...item, footerNote: dressImageNote(item), alt: event.target.value } : item))} /></label>
        <div className="card-actions">
          <button className="button secondary" disabled={Boolean(busy) || index === 0} onClick={() => move(index, -1)}>Move earlier</button>
          <button className="button secondary" disabled={Boolean(busy) || index === images.length - 1} onClick={() => move(index, 1)}>Move later</button>
        </div>
      </div>)}
      {images.length < 3 && <ImageUploadField id={key + "-add"} label={"Add " + label + " photo"} busy={Boolean(busy)} onUpload={(event) => upload(event, images.length)} />}
    </div>;
  };
  const venueFields = (key, label) => {
    const map = key + "Map";
    const href = mapLocation(design.content[map]);
    return <div className="form-section" key={key}>
      <h3>{label}</h3>
      <div className="field-grid">
        {["Venue", "Time", "Address"].map((field) => <label key={field}>{field}<input type={field === "Time" ? "time" : "text"} value={design.content[key + field]} onChange={(event) => setContent(key + field, event.target.value)} /></label>)}
        <label className="full">Google Maps pin link or coordinates<input maxLength={2048} value={design.content[map]} placeholder="Google Maps link or latitude, longitude" onChange={(event) => setContent(map, event.target.value)} /></label>
      </div>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer">Preview map pin</a> : design.content[map] && <p className="inline-error">Enter a valid Google Maps link or coordinates.</p>}
      {imageField(key + "Image", label + " venue photo")}
      <div className="typography-grid">
        {[["Heading", "Card heading"], ["Venue", "Venue name"], ["Address", "Address"], ["Time", "Time"], ["MapLabel", "Map button"]]
          .map(([field, title]) => typographyField(key + field, title))}
      </div>
    </div>;
  };

  const editorFields = () => {
    if (designSection === "cover") return <><div className="form-section"><h3>Cover content</h3><div className="field-grid"><label>Couple names<input value={design.content.coupleNames} maxLength="160" onChange={(e) => setContent("coupleNames", e.target.value)} /></label><label>Headline<input value={design.content.headline} maxLength="200" onChange={(e) => setContent("headline", e.target.value)} /></label></div></div><div className="form-section"><h3>Cover media</h3><label>Cover monogram<input maxLength={12} placeholder="TTK" value={design.content.coverMonogram || ""} onChange={(event) => setContent("coverMonogram", event.target.value)} /></label>{imageField("coverLogo", "Cover logo")}<div className="cover-media-grid"><div>{imageField("coverImage", "Wedding cover image")}</div><CarouselUploadField images={design.assets?.coverCarousel || []} busy={busy === "upload-cover-carousel"} onUpload={uploadCarousel} onRemove={removeCarouselImage} /></div></div><div className="form-section"><h3>Page appearance</h3><SectionStyleControls value={design.sections.cover} onChange={(value) => setSectionStyle("cover", value)} /><div className="theme-grid brand-colors"><label>Accent color<span className="color-control"><input type="color" value={design.theme.accent} onChange={(e) => setTheme("accent", e.target.value)} /><code>{design.theme.accent}</code></span></label><label>Text color<span className="color-control"><input type="color" value={design.theme.text} onChange={(e) => setTheme("text", e.target.value)} /><code>{design.theme.text}</code></span></label></div></div></>;
    if (designSection === "welcome") return <><div className="form-section"><h3>Second-page image</h3>{imageField("welcomeImage", "Welcome page image")}</div><div className="form-section"><h3>Welcome message</h3><label>Message<textarea rows="6" value={design.content.welcomeMessage} onChange={(e) => setContent("welcomeMessage", e.target.value)} /></label>{typographyField("welcomeMessage", "Message typography")}<p className="field-hint">The live countdown above this message uses the wedding date from your Planner event.</p></div><div className="form-section"><h3>Welcome greeting</h3>{headingField("welcomeHeadline", "Welcome headline", "Welcome to our wedding")}<GreetingStyleControls value={design.sections.greeting} onChange={(value) => setSectionStyle("greeting", value)} /></div><div className="form-section"><h3>Page appearance</h3><SectionStyleControls value={design.sections.welcome} onChange={(value) => setSectionStyle("welcome", value)} /></div></>;
    if (designSection === "video") return <div className="form-section no-border"><h3>Video message</h3><div className="field-stack">{headingField("videoHeading", "Video headline", "A glimpse of our story")}<label>Optional message above the video<textarea rows="4" value={design.content.videoMessage} onChange={(e) => setContent("videoMessage", e.target.value)} /></label>{typographyField("videoMessage", "Message typography")}<label>YouTube link<input type="url" placeholder="https://www.youtube.com/watch?v=…" value={design.content.youtubeUrl} onChange={(e) => setContent("youtubeUrl", e.target.value)} /><small>Supports YouTube watch, Shorts, embed, and youtu.be links.</small></label>{design.content.youtubeUrl && !youtubeEmbedUrl(design.content.youtubeUrl) && <p className="inline-error">This does not look like a supported YouTube link.</p>}</div></div>;
    if (designSection === "venue") return <>
      <div className="form-section"><h3>Venue section</h3><div className="typography-grid">
        {typographyField("venueKicker", "Section introduction")}
        {typographyField("venueHeading", "Section heading")}
      </div></div>
      {venueFields("ceremony", "Wedding Ceremony")}{venueFields("reception", "Reception")}
    </>;
    if (designSection === "dress") return <>
      <div className="form-section"><h3>Dress code</h3>{headingField("dressHeading", "Section title", "Celebrate in Style")}
        <label>General Notes<textarea rows={3} maxLength={1000} value={design.content.dressGeneralNotes || ""} onChange={(event) => setContent("dressGeneralNotes", event.target.value)} /></label>
        <div className="typography-grid">
          {typographyField("dressHeading", "Section title")}
          {typographyField("dressCode", "General guidance")}
          {typographyField("dressFooterNotes", "Image footer notes")}
          {typographyField("dressGeneralNotes", "General notes")}
        </div>
        <label>General guidance<input value={design.content.dressCode} onChange={(event) => setContent("dressCode", event.target.value)} /></label>
      </div>
      {[
        { label: "Ladies", key: "women", guidance: "dressCodeWomen" },
        { label: "Gentlemen", key: "men", guidance: "dressCodeMen" },
      ].map(({ label, key, guidance }) => <div className="form-section" key={key}>
        <h3>{label}</h3>{galleryField(key + "DressImages", label)}
        <label>Attire guidance<textarea rows="4" value={design.content[guidance]} onChange={(event) => setContent(guidance, event.target.value)} /></label>
        <div className="typography-grid">
          {typographyField(key + "DressHeading", "Attire heading")}
          {typographyField(guidance, "Attire guidance")}
        </div>
        <PaletteEditor label="Suggested colors" colors={design.content[key + "Colors"]} onChange={(colors) => setContent(key + "Colors", colors)} />
      </div>)}
    </>;
    if (designSection === "rsvp") return <div className="form-section no-border">
      <h3>Guest response and seating</h3>
      {headingField("seatingHeading", "Seating section title", "Seating Information")}
      <label>RSVP title<input maxLength={160} placeholder="Will you celebrate with us?" value={design.content.rsvpTitle || ""} onChange={(event) => setContent("rsvpTitle", event.target.value)} /></label>
      <label>Submit button text<input maxLength={80} placeholder="Send response" value={design.content.rsvpButtonText || ""} onChange={(event) => setContent("rsvpButtonText", event.target.value)} /></label>
      <div className="typography-grid">
        {typographyField("rsvpTitle", "RSVP title")}
        {typographyField("rsvpButtonText", "Submit button")}
      </div>
      <p>Guests enter their full name and response. Review submissions and update the Guest List in Guest RSVP. Seating assignments are provided at the venue.</p>
    </div>;
    return <><div className="form-section"><h3>Closing image</h3>{imageField("closingImage", "Closing page image")}</div><div className="form-section"><h3>Final message</h3><div className="field-stack"><label>Closing message<textarea rows="5" value={design.content.closingMessage} onChange={(e) => setContent("closingMessage", e.target.value)} /></label>{typographyField("closingMessage", "Message typography")}<label>Contact note<input value={design.content.contactMessage} onChange={(e) => setContent("contactMessage", e.target.value)} /></label></div></div><div className="form-section"><h3>Page appearance</h3><SectionStyleControls value={design.sections.closing} onChange={(value) => setSectionStyle("closing", value)} /></div></>;
  };

  if (busy === "loading" && !data) return <div className="app-loading"><span className="spinner" /> Loading Invitation Studio…</div>;
  if (!data) return <div className="app-loading"><button className="button primary" onClick={load}>Try again</button></div>;

  return (
    <div className="studio-app-shell">
      {sidebarOpen && <button className="studio-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`studio-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="studio-brand"><span className="studio-brand-mark">TTK</span><div><strong>TieTheKnot</strong><small>Invitation Studio</small></div></div>
        <div className="studio-user"><span>{session.user?.fullName?.charAt(0) || "U"}</span><div><strong>{session.user?.fullName}</strong><small>Event Planner</small></div></div>
        <nav aria-label="Invitation Studio"><p>Workspace</p><button className={active === "design" ? "active" : ""} onClick={() => navigate("design")}><span aria-hidden="true">✦</span> Invitation Design</button><button className={active === "guests" ? "active" : ""} onClick={() => navigate("guests")}><span aria-hidden="true">♙</span> Guest RSVP</button><button className={active === "settings" ? "active" : ""} onClick={() => navigate("settings")}><span aria-hidden="true">◉</span> Publishing</button></nav>
        <div className="studio-sidebar-footer"><a href={PLANNER_URL}>← Wedding Planner</a><button onClick={onLogout}>Sign out</button></div>
      </aside>

      <div className="studio-main">
        <header className="studio-topbar"><button className="studio-menu" aria-label="Open navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>☰</button><div><p className="eyebrow">TieTheKnot PH</p><h1>{pageTitle}</h1></div><div className="topbar-actions">{active === "design" && <button className="button primary" disabled={Boolean(busy)} onClick={() => saveDesign()}>{busy === "design" ? "Saving…" : "Save design"}</button>}</div></header>
        {notice && <div className={`notice ${notice.type}`} role="status"><span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button></div>}

        {active === "design" && <main className="design-page"><div className="design-section-nav" aria-label="Design sections">{DESIGN_SECTIONS.map(([key, label, detail]) => <button key={key} className={designSection === key ? "active" : ""} onClick={() => setDesignSection(key)}><span>{label}</span><small>{detail}</small></button>)}</div><div className="design-workspace"><section className="editor-panel" aria-labelledby="editor-title"><div className="editor-title"><p className="eyebrow">Customize section</p><h2 id="editor-title">{DESIGN_SECTIONS.find(([key]) => key === designSection)?.[1]}</h2></div>{editorFields()}</section><aside className="preview-panel"><div className="preview-label"><span>Live preview</span><small>Scroll all pages</small></div><InvitationPreview preview design={design} event={data.event}><section className="preview-rsvp"><div className="reveal-item"><p className="section-kicker">Kindly respond</p><RsvpTitle design={design} /><label className="public-field">Full Name<input disabled placeholder="Enter your full name" /></label><div><button disabled>Accept</button><button disabled>Decline</button></div><RsvpSubmit design={design} disabled /></div></section></InvitationPreview></aside></div></main>}

        {active === "guests" && <RsvpInbox guests={data.guests} onGuestUpdated={(updated) =>
          setData((current) => ({ ...current, guests: current.guests.map((guest) => guest._id === updated._id ? updated : guest) }))
        } />}

        {active === "settings" && <main className="content-page narrow">
          <div className="section-heading"><div><p className="eyebrow">Visibility</p><h2>Publishing</h2></div></div>
          <section className="setting-card"><div><h3>Shared invitation</h3><p>Publish the current design to make it visible to all guests.</p></div>
            <button className="button primary" disabled={Boolean(busy)} onClick={() => publish(true)}>{design.sharedKey && design.published ? "Publish updates" : "Publish invitation"}</button>
          </section>
          {design.sharedKey && design.published && <section className="info-card">
            <p><a href={publicLink} target="_blank" rel="noopener noreferrer">Open public invitation</a></p>
            <div className="card-actions">
              <button className="button secondary" onClick={() => copyText(publicLink, "Public link copied.")}>Copy public link</button>
              <button className="button secondary" disabled={Boolean(busy)} onClick={() => publish(false)}>Unpublish</button>
            </div>
          </section>}
        </main>}
      </div>

    </div>
  );
}
