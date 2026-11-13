export const FONT_OPTIONS = [
  ["classic", "Classic serif", '"DM Sans", sans-serif'],
  ["modern", "Modern sans", '"DM Sans", sans-serif'],
  ["romantic", "Romantic", '"Great Vibes", cursive'],
  ["elegant", "Elegant", '"Playfair Display", serif'],
  ["alex-brush", "Alex Brush", '"Alex Brush", cursive'],
  ["allura", "Allura", 'Allura, cursive'],
  ["baskervville", "Baskervville", 'Baskervville, serif'],
  ["cinzel", "Cinzel", 'Cinzel, serif'],
  ["crimson-text", "Crimson Text", '"Crimson Text", serif'],
  ["ephesis", "Ephesis", 'Ephesis, cursive'],
  ["gloock", "Gloock", 'Gloock, serif'],
  ["hedvig-letters-serif", "Hedvig Letters Serif", '"Hedvig Letters Serif", serif'],
  ["instrument-serif", "Instrument Serif", '"Instrument Serif", serif'],
  ["italiana", "Italiana", 'Italiana, serif'],
  ["marck-script", "Marck Script", '"Marck Script", cursive'],
  ["old-standard-tt", "Old Standard TT", '"Old Standard TT", serif'],
  ["parisienne", "Parisienne", 'Parisienne, cursive'],
  ["spectral", "Spectral", 'Spectral, serif'],
  ["young-serif", "Young Serif", '"Young Serif", serif'],
];

const families = new Map(FONT_OPTIONS.map(([key, , family]) => [key, family]));
const legacyFamilies = new Set(FONT_OPTIONS.slice(0, 4).map(([key]) => key));

// Older page-level styles have section-specific font rules.
export function newPageFont(key) {
  return legacyFamilies.has(key) ? undefined : families.get(key);
}

export function textStyle(value) {
  if (!value) return undefined;
  return {
    fontFamily: families.get(value.fontFamily),
    fontSize: Number.isFinite(value.fontSize) ? `${value.fontSize}px` : undefined,
  };
}
