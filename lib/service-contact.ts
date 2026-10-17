// Public support address only; never expose provider API keys to the UI.
export function serviceContactEmail() {
  const configured = (process.env.PUBLIC_CONTACT_EMAIL || process.env.EMAIL_REPLY_TO || "").trim();
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(configured) ? configured : "agency1office@gmail.com";
}
