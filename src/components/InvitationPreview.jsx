import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Countdown from "./Countdown";
import { youtubeEmbedUrl } from "../utils/youtube";

function formatDate(value) {
  if (!value) return "Date to be announced";
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "full" }).format(new Date(year, month - 1, day));
}

function formatTime(value) {
  if (!value) return "Time to be announced";
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (hours > 23) return value;
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
}

function pageStyle(section = {}, image) {
  return {
    "--page-background": section.backgroundColor || "#fbf8f1",
    "--background-opacity": section.backgroundOpacity ?? 1,
    "--image-opacity": section.imageOpacity ?? 0.72,
    "--page-image": image ? `url("${image}")` : "none",
    "--section-font-size": `${section.fontSize || 48}px`,
  };
}

function Palette({ colors = [] }) {
  return <div className="dress-palette" aria-label="Suggested colors">{colors.map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} title={color} />)}</div>;
}

function CoverCarousel({ images = [] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    setActive(0);
    if (images.length < 2) return undefined;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % images.length), 2000);
    return () => window.clearInterval(timer);
  }, [images.length]);
  if (!images.length) return null;
  return <div className="cover-carousel" aria-label="Wedding photo carousel">
    <div className="cover-carousel-frame">{images.map((image, index) => <img key={image.publicId || image.secureUrl} className={index === active ? "active" : ""} src={image.secureUrl} alt={image.alt || `Wedding carousel image ${index + 1}`} />)}</div>
    {images.length > 1 && <div className="cover-carousel-dots" aria-hidden="true">{images.map((image, index) => <span key={image.publicId || index} className={index === active ? "active" : ""} />)}</div>}
  </div>;
}

export default function InvitationPreview({ design, event, guest, children, preview = false }) {
  const storyRef = useRef(null);
  const content = design?.content || {};
  const theme = design?.theme || {};
  const assets = design?.assets || {};
  const sections = design?.sections || {};
  const videoUrl = youtubeEmbedUrl(content.youtubeUrl);
  const ceremonyVenue = content.ceremonyVenue || content.venue;
  const ceremonyAddress = content.ceremonyAddress || content.address;
  const receptionVenue = content.receptionVenue || content.venue;
  const receptionAddress = content.receptionAddress || content.address;
  const rootStyle = {
    "--invite-primary": theme.primary || "#315c4c",
    "--invite-accent": theme.accent || "#c89f65",
    "--invite-background": theme.background || "#fbf8f1",
    "--invite-text": theme.text || "#26332d",
  };
  const greetingStyle = {
    "--greeting-color": sections.greeting?.textColor || theme.primary || "#315c4c",
    "--greeting-font-size": `${sections.greeting?.fontSize || 34}px`,
  };

  useLayoutEffect(() => {
    const story = storyRef.current;
    if (!story) return undefined;
    const elements = [...story.querySelectorAll([
      ".page-content",
      ".story-section .section-kicker",
      ".story-section .section-inner > h2",
      ".video-frame",
      ".venue-card",
      ".dress-intro",
      ".dress-card",
      ".personal-message",
      ".rsvp-story-section .section-inner",
    ].join(","))];
    elements.forEach((element, index) => {
      element.classList.add("reveal-item");
      element.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
    });
    story.classList.add("reveal-ready");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8%" });
    elements.forEach((element) => {
      if (!element.classList.contains("is-visible")) observer.observe(element);
    });
    return () => observer.disconnect();
  });

  return (
    <article ref={storyRef} className={`invitation-story font-${theme.fontPair || "classic"}${preview ? " is-preview" : ""}`} style={rootStyle}>
      <section className={`invitation-page cover-page font-${sections.cover?.fontFamily || "classic"}`} style={pageStyle(sections.cover, assets.coverImage?.secureUrl)}>
        <div className="page-layer" />
        <div className={`page-content cover-content${assets.coverCarousel?.length ? " has-carousel" : ""}`}>
          <div className="cover-copy"><span className="cover-monogram" aria-hidden="true">TTK</span>
            <p className="invitation-kicker">{content.headline || "We're getting married"}</p>
            <h1>{content.coupleNames || "Our Wedding"}</h1>
            <p className="invitation-date">{formatDate(event?.targetDate)}</p>
            <span className="scroll-cue">Scroll to celebrate <b aria-hidden="true">↓</b></span>
          </div>
          <CoverCarousel images={assets.coverCarousel || []} />
        </div>
      </section>

      <section className={`invitation-page welcome-page font-${sections.welcome?.fontFamily || "classic"}`} style={pageStyle(sections.welcome, assets.welcomeImage?.secureUrl)}>
        <div className="page-layer" />
        <div className="page-content welcome-content">
          <p className="section-kicker">Counting down to forever</p>
          <Countdown date={event?.targetDate} time={content.ceremonyTime} />
          <div className="ornament" aria-hidden="true">❦</div>
          <p className={`guest-greeting font-${sections.greeting?.fontFamily || "classic"}`} style={greetingStyle}>Dear {guest?.name || "Honored Guest"},</p>
          <p className="welcome-message">{content.welcomeMessage || "Together with our families, we invite you to celebrate with us."}</p>
        </div>
      </section>

      {(videoUrl || content.videoMessage) && <section className="story-section video-section"><div className="section-inner"><p className="section-kicker">A glimpse of our story</p>{content.videoMessage && <h2>{content.videoMessage}</h2>}{videoUrl && <div className="video-frame"><iframe src={videoUrl} title="A message from the couple" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}</div></section>}

      <section className="story-section venue-section"><div className="section-inner"><p className="section-kicker">Where to celebrate</p><h2>Wedding Details</h2><div className="venue-card-grid">
        <article className="venue-card"><span className="venue-icon" aria-hidden="true">♢</span><h3>Wedding Ceremony</h3><strong>{ceremonyVenue || "Venue to be announced"}</strong><p>{ceremonyAddress || "Address to follow"}</p><time dateTime={content.ceremonyTime || undefined}>{formatTime(content.ceremonyTime)}</time></article>
        <article className="venue-card"><span className="venue-icon" aria-hidden="true">✦</span><h3>Reception</h3><strong>{receptionVenue || "Venue to be announced"}</strong><p>{receptionAddress || "Address to follow"}</p><time dateTime={content.receptionTime || undefined}>{formatTime(content.receptionTime)}</time></article>
      </div></div></section>

      <section className="story-section dress-section"><div className="section-inner"><p className="section-kicker">Celebrate in style</p><h2>Dress Code</h2>{content.dressCode && <p className="dress-intro">{content.dressCode}</p>}<div className="dress-card-grid">
        <article className="dress-card">{assets.menDressImage?.secureUrl ? <img src={assets.menDressImage.secureUrl} alt={assets.menDressImage.alt || "Men's dress code reference"} /> : <div className="dress-placeholder" aria-hidden="true">Men</div>}<div><h3>Men</h3><p>{content.dressCodeMen || "Formal attire"}</p><Palette colors={content.menColors} /></div></article>
        <article className="dress-card">{assets.womenDressImage?.secureUrl ? <img src={assets.womenDressImage.secureUrl} alt={assets.womenDressImage.alt || "Women's dress code reference"} /> : <div className="dress-placeholder" aria-hidden="true">Women</div>}<div><h3>Women</h3><p>{content.dressCodeWomen || "Formal attire"}</p><Palette colors={content.womenColors} /></div></article>
      </div></div></section>

      {children}

      <section className={`invitation-page closing-page font-${sections.closing?.fontFamily || "classic"}`} style={pageStyle(sections.closing, assets.closingImage?.secureUrl)}>
        <div className="page-layer" />
        <div className="page-content closing-content"><span className="closing-mark" aria-hidden="true">∞</span><h2>{content.closingMessage || "Thank you for being part of our story."}</h2>{content.contactMessage && <p>{content.contactMessage}</p>}<strong>{content.coupleNames || "With love"}</strong></div>
      </section>
    </article>
  );
}
