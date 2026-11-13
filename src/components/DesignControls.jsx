import React, { useState } from "react";
import { FONT_OPTIONS } from "../utils/typography";

function FontSelect({ label, value, onChange, allowDefault = false }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}>
    {allowDefault && <option value="">Section default</option>}
    {FONT_OPTIONS.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select></label>;
}

export function TypographyControls({ label, value = {}, onChange }) {
  return <details className="typography-details">
    <summary aria-label={label + " text style"}>Text style <span>{label}</span></summary>
    <div className="typography-controls">
    <FontSelect label="Font style" value={value.fontFamily || ""} allowDefault
      onChange={(fontFamily) => onChange({ ...value, fontFamily: fontFamily || undefined })} />
    <label>Font size (px)<input type="number" min={12} max={80} placeholder="Default"
      value={value.fontSize ?? ""} onChange={(event) => {
        const size = event.target.valueAsNumber;
        onChange({ ...value, fontSize: Number.isFinite(size) ? size : undefined });
      }} onBlur={(event) => {
        const size = event.target.valueAsNumber;
        if (Number.isFinite(size) && (size < 12 || size > 80)) {
          onChange({ ...value, fontSize: Math.min(80, Math.max(12, size)) });
        }
      }} /></label>
    <label>Text color<input type="color" value={value.textColor || "#24342d"} onChange={(event) => onChange({ ...value, textColor: event.target.value })} /></label>
    <div className="text-style-actions">
      <button type="button" aria-pressed={Boolean(value.bold)} onClick={() => onChange({ ...value, bold: value.bold ? undefined : true })}>Bold</button>
      <button type="button" aria-pressed={Boolean(value.italic)} onClick={() => onChange({ ...value, italic: value.italic ? undefined : true })}>Italic</button>
      <button type="button" onClick={() => onChange({})}>Reset</button>
    </div>
    </div>
  </details>;
}

export function ImageUploadField({ id, label, asset, busy, disabled = busy, onUpload, onRemove }) {
  return (
    <div className="image-control">
      {asset?.secureUrl ? <img src={asset.secureUrl} alt={asset.alt || `${label} preview`} /> : <div className="image-control-empty" aria-hidden="true">Image</div>}
      <div><strong>{label}</strong><p>JPG, PNG, WebP or AVIF · maximum 8 MB</p><div className="inline-actions"><label className="button secondary file-button" htmlFor={id}>{busy ? "Uploading…" : asset ? "Replace" : "Upload"}</label><input id={id} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={disabled} onChange={onUpload} />{asset && <button type="button" className="text-button danger" disabled={disabled} onClick={onRemove}>Remove</button>}</div></div>
    </div>
  );
}

export function CarouselUploadField({ images = [], busy, disabled, onUpload, onReplace, onRemove }) {
  const accept = "image/jpeg,image/png,image/webp,image/avif";
  return <div className="carousel-control">
    <div className="carousel-control-head">
      <div><strong>Landscape carousel</strong><p>{images.length} of 8 slides · 2 seconds per slide</p></div>
      <label className="button secondary file-button" htmlFor="upload-cover-carousel">{busy ? "Uploading…" : "Add images"}</label>
      <input id="upload-cover-carousel" className="visually-hidden" type="file" accept={accept} multiple disabled={disabled || images.length >= 8} onChange={onUpload} />
    </div>
    {images.length ? <ol className="carousel-slide-list" aria-label="Carousel slides">
      {images.map((image, index) => <li key={image.publicId || image.secureUrl}>
        <div className="carousel-slide-thumbnail">
          <img src={image.secureUrl} alt={image.alt || "Carousel image " + (index + 1)} />
          <button type="button" aria-label={"Remove slide " + (index + 1)} disabled={disabled} onClick={() => onRemove(index)}>×</button>
        </div>
        <strong>Slide {index + 1}</strong>
        <label className="button secondary file-button" htmlFor={"replace-slide-" + index}>Replace<span className="visually-hidden"> slide {index + 1}</span></label>
        <input id={"replace-slide-" + index} className="visually-hidden" type="file" accept={accept} disabled={disabled} onChange={(event) => onReplace(event, index)} />
      </li>)}
    </ol> : <p className="carousel-control-empty">No slides added yet.</p>}
  </div>;
}

export function SectionStyleControls({ value, onChange }) {
  const current = value || {};
  const set = (field, next) => onChange({ ...current, [field]: next });
  return (
    <div className="style-controls">
      <label>Background color<span className="color-control"><input type="color" value={current.backgroundColor || "#fbf8f1"} onChange={(e) => set("backgroundColor", e.target.value)} /><code>{current.backgroundColor || "#fbf8f1"}</code></span></label>
      <FontSelect label="Default font" value={current.fontFamily || "classic"} onChange={(value) => set("fontFamily", value)} />
      <label className="range-field"><span>Image opacity <output>{Math.round((current.imageOpacity ?? .72) * 100)}%</output></span><input type="range" min="0" max="1" step="0.05" value={current.imageOpacity ?? .72} onChange={(e) => set("imageOpacity", Number(e.target.value))} /></label>
      <label className="range-field"><span>Background opacity <output>{Math.round((current.backgroundOpacity ?? 1) * 100)}%</output></span><input type="range" min="0" max="1" step="0.05" value={current.backgroundOpacity ?? 1} onChange={(e) => set("backgroundOpacity", Number(e.target.value))} /></label>
      <label className="range-field full"><span>Default heading size <output>{current.fontSize || 48}px</output></span><input type="range" min="24" max="120" step="2" value={current.fontSize || 48} onChange={(e) => set("fontSize", Number(e.target.value))} /></label>
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
