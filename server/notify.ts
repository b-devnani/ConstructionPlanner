import { procoreStorage as store } from "./procore-storage";
import { sendEmail } from "./email";

/**
 * Notifies a user in-app and via the configured email transport. The DB-level
 * unique index on (user_id, entity_type, entity_id, title) dedupes for us, so
 * repeated overdue scans don't spam a user.
 */
export async function notifyUser(
  userId: number,
  title: string,
  body: string,
  entityType = "",
  entityId: number | null = null,
): Promise<void> {
  const created = await store.createNotification({
    userId, title, body, entityType, entityId, read: false,
  });
  // null return ⇒ duplicate, already notified, skip email too
  if (!created) return;
  const user = await store.getUser(userId);
  if (user?.email) await sendEmail(user.email, title, body);
}

/** Resolves a free-text assignee name to a directory user, if one matches. */
export async function notifyByName(
  name: string,
  title: string,
  body: string,
  entityType = "",
  entityId: number | null = null,
): Promise<boolean> {
  const user = await store.findUserByName(name);
  if (!user) return false;
  await notifyUser(user.id, title, body, entityType, entityId);
  return true;
}

/** Scans for overdue RFIs, punch items, and submittal reviews. */
export async function runOverdueScan(): Promise<void> {
  const overdue = await store.findOverdueItems();
  for (const item of overdue) {
    const body = `Assigned to ${item.assigneeName || "(unassigned)"} — was due ${item.dueDate}.`;
    const matched = await notifyByName(
      item.assigneeName, item.title, body, item.entityType, item.entityId,
    );
    if (!matched) {
      // No directory match for the assignee: escalate to Admins / PMs
      const users = await store.getUsers();
      for (const user of users) {
        if (user.role === "Admin" || user.role === "Project Manager") {
          await notifyUser(user.id, item.title, body, item.entityType, item.entityId);
        }
      }
    }
  }
}

let scannerStarted = false;

export function startOverdueScanner(intervalMs = 10 * 60 * 1000): void {
  if (scannerStarted) return;
  scannerStarted = true;
  void runOverdueScan();
  const timer = setInterval(() => void runOverdueScan(), intervalMs);
  timer.unref();
}
