// Tiny user-agent parsing for analytics. Best effort only — never load-bearing.

export interface ParsedUA {
  deviceType: "phone" | "tablet" | "desktop" | "unknown";
  os: string;
  browser: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { deviceType: "unknown", os: "unknown", browser: "unknown" };

  let os = "unknown";
  if (/iphone|ipod/i.test(ua)) os = "iOS";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "unknown";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";

  let deviceType: ParsedUA["deviceType"] = "desktop";
  if (/ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) deviceType = "tablet";
  else if (/iphone|ipod|android|mobile/i.test(ua)) deviceType = "phone";

  return { deviceType, os, browser };
}

/**
 * In-app browsers (WhatsApp/Instagram/Facebook/Telegram webviews) block the
 * camera silently — detect them up front and tell the user to open the real
 * browser instead of letting them hit a dead camera prompt.
 */
export function isInAppBrowser(ua: string): boolean {
  return /FBAN|FBAV|Instagram|WhatsApp|Snapchat|Twitter|TikTok|Line\/|MicroMessenger|; wv\)/i.test(ua);
}
