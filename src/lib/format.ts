import { BUSINESS_TIMEZONE } from "./billing/constants";

/** "Nov 13, 2026" in the business timezone. */
export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: BUSINESS_TIMEZONE });
}

/** For calendar days stored as DATE (start date, due date). They have no time, so no timezone shift. */
export function formatDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Nov 13, 2026, 2:05 PM" in the business timezone. */
export function formatDateTime(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TIMEZONE,
  });
}

const ACTION_LABELS: Record<string, string> = {
  "mou.created": "MOU created",
  "mou.link_regenerated": "New client link made",
  "mou.cancelled": "MOU cancelled",
  "mou.sent": "Sent to the client",
  "mou.edited": "MOU edited",
  "mou.viewed": "Client opened the MOU",
  "mou.signed": "Client signed the MOU",
  "question.asked": "Client asked a question",
  "login.success": "Signed in",
  "login.failed": "Failed sign in",
  "login.locked": "Account locked",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}
