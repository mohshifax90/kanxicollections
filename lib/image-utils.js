export function shouldUnoptimizeImage(src = "") {
  return String(src || "").trim().startsWith("/api/media?");
}
