export function youtubeEmbedUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
      else if (/^\/(embed|shorts)\//.test(url.pathname)) id = url.pathname.split("/")[2] || "";
    }
    return /^[A-Za-z0-9_-]{6,}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : "";
  } catch {
    return "";
  }
}
