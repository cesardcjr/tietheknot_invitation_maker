export function dressImageNote(image) {
  // Older editors stored descriptions in alt. Skip the generated upload labels.
  if (image.footerNote != null) return image.footerNote;
  if (/^(Ladies|Gentlemen) dress code reference \d+$/.test(image.alt || "")) return "";
  return image.alt || "";
}
