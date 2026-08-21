import React from "react";

function formatDate(value) {
  if (!value) return "Date to be announced";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "full" }).format(new Date(year, month - 1, day));
}

export default function InvitationPreview({ design, event, guest, children, preview = false }) {
  const content = design?.content || {};
  const theme = design?.theme || {};
  const cover = design?.assets?.coverImage?.secureUrl;
  const style = {
    "--invite-primary": theme.primary || "#315c4c",
    "--invite-accent": theme.accent || "#c89f65",
    "--invite-background": theme.background || "#fbf8f1",
    "--invite-text": theme.text || "#26332d",
  };

  return (
    <article className={`invitation-card font-${theme.fontPair || "classic"}${preview ? " is-preview" : ""}`} style={style}>
      <header className={`invitation-hero${cover ? " has-cover" : ""}`} style={cover ? { backgroundImage: `linear-gradient(rgba(20,30,24,.34), rgba(20,30,24,.55)), url("${cover}")` } : undefined}>
        <div className="hero-flourish" aria-hidden="true">❦</div>
        <p className="invitation-kicker">{content.headline || "We're getting married"}</p>
        <h1>{content.coupleNames || "Our Wedding"}</h1>
        <p className="invitation-date">{formatDate(event?.targetDate)}</p>
      </header>
      <div className="invitation-body">
        <p className="guest-greeting">Dear {guest?.name || "Honored Guest"},</p>
        <p className="welcome-message">{content.welcomeMessage}</p>
        <div className="detail-grid">
          <section><span className="detail-icon" aria-hidden="true">◇</span><h2>Venue</h2><p>{content.venue || "Venue to be announced"}</p><small>{content.address}</small></section>
          <section><span className="detail-icon" aria-hidden="true">◷</span><h2>Schedule</h2><p>{content.ceremonyTime ? `Ceremony · ${content.ceremonyTime}` : "Time to be announced"}</p>{content.receptionTime && <small>Reception · {content.receptionTime}</small>}</section>
        </div>
        {content.dressCode && <section className="invitation-note"><h2>Dress Code</h2><p>{content.dressCode}</p></section>}
        {content.entourageNote && <section className="invitation-note"><h2>A Note From Us</h2><p>{content.entourageNote}</p></section>}
        {children}
        {content.contactMessage && <p className="contact-message">{content.contactMessage}</p>}
      </div>
    </article>
  );
}
