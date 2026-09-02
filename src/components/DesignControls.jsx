import React, { useState } from "react";

export function ImageUploadField({ id, label, asset, busy, onUpload, onRemove }) {
  return (
    <div className="image-control">
      {asset?.secureUrl ? <img src={asset.secureUrl} alt={asset.alt || `${label} preview`} /> : <div className="image-control-empty" aria-hidden="true">Image</div>}
      <div><strong>{label}</strong><p>JPG, PNG, WebP or AVIF · maximum 8 MB</p><div className="inline-actions"><label className="button secondary file-button" htmlFor={id}>{busy ? "Uploading…" : asset ? "Replace" : "Upload"}</label><input id={id} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={onUpload} />{asset && <button type="button" className="text-button danger" onClick={onRemove}>Remove</button>}</div></div>
    </div>
  );
}

export function CarouselUploadField({ images = [], busy, onUpload, onRemove }) {
  return <div className="carousel-control">
    <div className="carousel-control-head"><div><strong>Landscape image carousel</strong><p>Upload up to 8 landscape images. Slides change every 2 seconds.</p></div><label className="button secondary file-button" htmlFor="upload-cover-carousel">{busy ? "Uploading…" : "Add images"}</label><input id="upload-cover-carousel" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy || images.length >= 8} onChange={onUpload} /></div>
    {images.length ? <div className="carousel-control-grid">{images.map((image, index) => <figure key={image.publicId || image.secureUrl}><img src={image.secureUrl} alt={image.alt || `Carousel image ${index + 1}`} /><button type="button" aria-label={`Remove carousel image ${index + 1}`} onClick={() => onRemove(index)}>×</button><figcaption>Slide {index + 1}</figcaption></figure>)}</div> : <div className="carousel-control-empty">No carousel images yet</div>}
  </div>;
}

export function SectionStyleControls({ value, onChange }) {
  const current = value || {};
  const set = (field, next) => onChange({ ...current, [field]: next });
  return (
    <div className="style-controls">
      <label>Background color<span className="color-control"><input type="color" value={current.backgroundColor || "#fbf8f1"} onChange={(e) => set("backgroundColor", e.target.value)} /><code>{current.backgroundColor || "#fbf8f1"}</code></span></label>
      <label>Font style<select value={current.fontFamily || "classic"} onChange={(e) => set("fontFamily", e.target.value)}><option value="classic">Classic serif</option><option value="modern">Modern sans</option><option value="romantic">Romantic</option><option value="elegant">Elegant</option></select></label>
      <label className="range-field"><span>Image opacity <output>{Math.round((current.imageOpacity ?? .72) * 100)}%</output></span><input type="range" min="0" max="1" step="0.05" value={current.imageOpacity ?? .72} onChange={(e) => set("imageOpacity", Number(e.target.value))} /></label>
      <label className="range-field"><span>Background opacity <output>{Math.round((current.backgroundOpacity ?? 1) * 100)}%</output></span><input type="range" min="0" max="1" step="0.05" value={current.backgroundOpacity ?? 1} onChange={(e) => set("backgroundOpacity", Number(e.target.value))} /></label>
      <label className="range-field full"><span>Heading size <output>{current.fontSize || 48}px</output></span><input type="range" min="24" max="120" step="2" value={current.fontSize || 48} onChange={(e) => set("fontSize", Number(e.target.value))} /></label>
    </div>
  );
}

export function GreetingStyleControls({ value, onChange }) {
  const current = value || {};
  const set = (field, next) => onChange({ ...current, [field]: next });
  return (
    <div className="style-controls greeting-style-controls">
      <label>Greeting font style<select value={current.fontFamily || "classic"} onChange={(e) => set("fontFamily", e.target.value)}><option value="classic">Classic serif</option><option value="modern">Modern sans</option><option value="romantic">Romantic</option><option value="elegant">Elegant</option></select></label>
      <label>Greeting color<span className="color-control"><input type="color" value={current.textColor || "#315c4c"} onChange={(e) => set("textColor", e.target.value)} /><code>{current.textColor || "#315c4c"}</code></span></label>
      <label className="range-field full"><span>Greeting size <output>{current.fontSize || 34}px</output></span><input type="range" min="14" max="80" step="2" value={current.fontSize || 34} onChange={(e) => set("fontSize", Number(e.target.value))} /></label>
    </div>
  );
}

export function PaletteEditor({ label, colors = [], onChange }) {
  const [candidate, setCandidate] = useState("#c89f65");
  const add = () => {
    if (colors.length >= 8 || colors.includes(candidate)) return;
    onChange([...colors, candidate]);
  };
  return (
    <div className="palette-editor"><span>{label}</span><div className="palette-row">{colors.map((color, index) => <button type="button" key={`${color}-${index}`} className="palette-dot" style={{ backgroundColor: color }} title={`Remove ${color}`} aria-label={`Remove color ${color}`} onClick={() => onChange(colors.filter((_, itemIndex) => itemIndex !== index))} />)}<label className="palette-add"><span className="visually-hidden">Choose a color to add</span><input type="color" value={candidate} onChange={(e) => setCandidate(e.target.value)} /><button type="button" onClick={add} disabled={colors.length >= 8}>Add color</button></label></div></div>
  );
}
