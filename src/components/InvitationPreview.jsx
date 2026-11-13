import mapLocation from "../utils/mapLocation";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { newPageFont, textStyle } from "../utils/typography";
import { dressImageNote } from "../utils/dressNotes";
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

export default function InvitationPreview({ design, event, children, preview = false }) {
  const storyRef = useRef(null);
  const content = design?.content || {};
  const theme = design?.theme || {};
  const assets = design?.assets || {};
  const sections = design?.sections || {};
  const typography = (key) => textStyle(sections.typography?.[key]);
  const ladies = assets.womenDressImages ?? (assets.womenDressImage ? [assets.womenDressImage] : []);
  const gentlemen = assets.menDressImages ?? (assets.menDressImage ? [assets.menDressImage] : []);
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
      <section className={`invitation-page cover-page font-${sections.cover?.fontFamily || "classic"}`} style={{ ...pageStyle(sections.cover, assets.coverImage?.secureUrl), fontFamily: newPageFont(sections.cover?.fontFamily) }}>
        <div className="page-layer" />
        <div className={`page-content cover-content${assets.coverCarousel?.length ? " has-carousel" : ""}`}>
          <div className="cover-copy">{assets.coverLogo?.secureUrl
            ? <img className="cover-logo" src={assets.coverLogo.secureUrl} alt={assets.coverLogo.alt || "Wedding logo"} />
            : <span className="cover-monogram" style={typography("coverMonogram")} aria-hidden={!content.coverMonogram?.trim()}>{content.coverMonogram?.trim() || "TTK"}</span>}
            <p className="invitation-kicker" style={typography("headline")}>{content.headline || "We're getting married"}</p>
            <h1 style={{ fontFamily: newPageFont(sections.cover?.fontFamily), ...typography("coupleNames") }}>{content.coupleNames || "Our Wedding"}</h1>
            <p className={"invitation-date" + (content.coverDateText?.trim() ? " custom-date" : "")} style={typography("coverDateText")}>{content.coverDateText?.trim() || formatDate(event?.targetDate)}</p>
            <span className="scroll-cue" style={typography("coverScrollCue")}>Scroll to celebrate <b aria-hidden="true">↓</b></span>
          </div>
          <CoverCarousel images={assets.coverCarousel || []} />
        </div>
      </section>

      <section className={`invitation-page welcome-page font-${sections.welcome?.fontFamily || "classic"}`} style={{ ...pageStyle(sections.welcome, assets.welcomeImage?.secureUrl), fontFamily: newPageFont(sections.welcome?.fontFamily) }}>
        <div className="page-layer" />
        <div className="page-content welcome-content">
          <p className="section-kicker" style={typography("welcomeKicker")}>Counting down to forever</p>
          <Countdown date={event?.targetDate} time={content.ceremonyTime} />
          <div className="ornament" aria-hidden="true">❦</div>
          <p className={`guest-greeting font-${sections.greeting?.fontFamily || "classic"}`} style={{ ...greetingStyle, fontFamily: newPageFont(sections.greeting?.fontFamily), ...typography("welcomeHeadline") }}>{content.welcomeHeadline || "Welcome to our wedding"}</p>
          <p className="welcome-message" style={typography("welcomeMessage")}>{content.welcomeMessage || "Together with our families, we invite you to celebrate with us."}</p>
        </div>
      </section>

      {(videoUrl || content.videoMessage) && <section className="story-section video-section"><div className="section-inner"><h2 style={typography("videoHeading")}>{content.videoHeading || "A glimpse of our story"}</h2>{content.videoMessage && <p style={typography("videoMessage")}>{content.videoMessage}</p>}{videoUrl && <div className="video-frame"><iframe src={videoUrl} title="A message from the couple" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>}</div></section>}

      <section className="story-section venue-section"><div className="section-inner"><p className="section-kicker" style={typography("venueKicker")}>Where to celebrate</p><h2 style={typography("venueHeading")}>Wedding Details</h2><div className="venue-card-grid">
        {[
          { key: "ceremony", title: "Wedding Ceremony", name: ceremonyVenue, address: ceremonyAddress, time: content.ceremonyTime, image: assets.ceremonyImage, map: content.ceremonyMap },
          { key: "reception", title: "Reception", name: receptionVenue, address: receptionAddress, time: content.receptionTime, image: assets.receptionImage, map: content.receptionMap },
        ].map(({ key, title, name, address, time, image, map }) => {
          const mapUrl = mapLocation(map);
          return <article className="venue-card venue-photo-card" key={key}>
            {image?.secureUrl && <img src={image.secureUrl} alt={image.alt || title + " venue"} loading="lazy" />}
            <h3 style={typography(key + "Heading")}>{title}</h3>
            <strong style={typography(key + "Venue")}>{name || "Venue to be announced"}</strong>
            <p style={typography(key + "Address")}>{address || "Address to follow"}</p>
            {time && <time dateTime={time} style={typography(key + "Time")}>{formatTime(time)}</time>}
            {mapUrl && <a className="button secondary venue-map-link" style={typography(key + "MapLabel")} href={mapUrl} target="_blank" rel="noopener noreferrer">View Maps</a>}
          </article>;
        })}
      </div></div></section>

      <section className="story-section dress-section"><div className="section-inner">
        <h2 style={typography("dressHeading")}>{content.dressHeading || "Celebrate in Style"}</h2>
        {content.dressCode && <p className="dress-intro" style={typography("dressCode")}>{content.dressCode}</p>}
        <div className={"dress-card-grid" + (Math.max(ladies.length, gentlemen.length) > 1 ? " dress-card-grid-stacked" : "")}>
          {[
            { key: "women", label: "Ladies", images: ladies, guidance: content.dressCodeWomen, colors: content.womenColors },
            { key: "men", label: "Gentlemen", images: gentlemen, guidance: content.dressCodeMen, colors: content.menColors },
          ].map(({ key, label, images, guidance, colors }) => <article className="dress-card" key={label}>
            <div><h3 style={typography(key + "DressHeading")}>{label}</h3><p style={typography(key === "women" ? "dressCodeWomen" : "dressCodeMen")}>{guidance || "Formal attire"}</p><Palette colors={colors} /></div>
            {images.length > 0 && <div className="dress-image-gallery">
              {images.map((image, index) => {
                const note = dressImageNote(image);
                return <figure key={image.publicId || index}>
                  <img src={image.secureUrl} alt={image.alt || label + " dress code reference " + (index + 1)} loading="lazy" />
                  {note && <figcaption style={{ ...typography("dressFooterNotes"), ...textStyle(image.footerStyle) }}>{note}</figcaption>}
                </figure>;
              })}
            </div>}
          </article>)}
        </div>
        {content.dressGeneralNotes?.trim() && <p className="dress-general-notes" style={typography("dressGeneralNotes")}>{content.dressGeneralNotes}</p>}
      </div></section>

      <section className="story-section seating-notice"><div className="section-inner">
        <h2 style={typography("seatingHeading")}>{content.seatingHeading || "Seating Information"}</h2>
        <p style={typography("seatingBody")}>Your seat assignment will be provided at the venue.</p>
      </div></section>

      {children}

      <section className={`invitation-page closing-page font-${sections.closing?.fontFamily || "classic"}`} style={pageStyle(sections.closing, assets.closingImage?.secureUrl)}>
        <div className="page-layer" />
        <div className="page-content closing-content"><span className="closing-mark" aria-hidden="true">∞</span><h2 style={{ fontFamily: newPageFont(sections.closing?.fontFamily), ...typography("closingMessage") }}>{content.closingMessage || "Thank you for being part of our story."}</h2>{content.contactMessage && <p className="closing-contact" style={typography("contactMessage")}>{content.contactMessage}</p>}<strong style={typography("closingSignature")}>{content.coupleNames || "With love"}</strong></div>
      </section>
    </article>
  );
}
