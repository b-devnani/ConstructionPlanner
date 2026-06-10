import fs from "fs";
import path from "path";
import { procoreStorage as store } from "./procore-storage";

/**
 * Notification service: writes in-app notifications and mirrors each one to an
 * email outbox. With no SMTP server configured (SMTP_HOST unset), emails are
 * appended to data/email-outbox.log so the full pipeline is observable; wiring
 * a real transport only requires replacing deliverEmail().
 */

const OUTBOX_PATH = path.resolve(process.cwd(), "data", "email-outbox.log");

function deliverEmail(to: string, subject: string, body: string): void {
  const entry = `${new Date().toISOString()} | TO: ${to} | SUBJECT: ${subject} | ${body}\n`;
  if (process.env.SMTP_HOST) {
    // Placeholder for a real SMTP transport (e.g. nodemailer) — intentionally
    // logged rather than silently dropped so misconfiguration is visible.
    console.log(`[email] SMTP configured but no transport wired; logging instead: ${subject}`);
  }
  fs.mkdirSync(path.dirname(OUTBOX_PATH), { recursive: true });
  fs.appendFileSync(OUTBOX_PATH, entry);
}

/** Notifies a user in-app and via the email outbox. Dedupes per entity+title. */
export function notifyUser(
  userId: number,
  title: string,
  body: string,
  entityType = "",
  entityId: number | null = null,
): void {
  if (entityType && entityId !== null &&
      store.hasNotification(userId, entityType, entityId, title)) {
    return;
  }
  store.createNotification({ userId, title, body, entityType, entityId, read: false });
  const user = store.getUser(userId);
  if (user?.email) deliverEmail(user.email, title, body);
}

/** Resolves a free-text assignee name to a directory user, if one matches. */
export function notifyByName(
  name: string,
  title: string,
  body: string,
  entityType = "",
  entityId: number | null = null,
): boolean {
  const user = store.findUserByName(name);
  if (!user) return false;
  notifyUser(user.id, title, body, entityType, entityId);
  return true;
}

/** Scans for overdue RFIs, punch items, and submittal reviews. */
export function runOverdueScan(): void {
  const overdue = store.findOverdueItems();
  for (const item of overdue) {
    const body = `Assigned to ${item.assigneeName || "(unassigned)"} — was due ${item.dueDate}.`;
    const matched = notifyByName(item.assigneeName, item.title, body, item.entityType, item.entityId);
    if (!matched) {
      // No directory match for the assignee: escalate to Admins / PMs
      for (const user of store.getUsers()) {
        if (user.role === "Admin" || user.role === "Project Manager") {
          notifyUser(user.id, item.title, body, item.entityType, item.entityId);
        }
      }
    }
  }
}

let scannerStarted = false;

export function startOverdueScanner(intervalMs = 10 * 60 * 1000): void {
  if (scannerStarted) return;
  scannerStarted = true;
  runOverdueScan();
  const timer = setInterval(runOverdueScan, intervalMs);
  timer.unref();
}
