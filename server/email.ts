import fs from "fs";
import path from "path";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email transport.
 *
 *   - If SMTP_HOST is set, mail is delivered over SMTP via nodemailer.
 *     Honoured env vars:  SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE
 *     ("true" for implicit TLS / port 465), SMTP_USER, SMTP_PASS, EMAIL_FROM.
 *   - Otherwise, mail is logged to data/email-outbox.log so the pipeline is
 *     still observable in environments without an SMTP relay (e.g. dev).
 */

const OUTBOX_PATH = path.resolve(process.cwd(), "data", "email-outbox.log");

let transporter: Transporter | null = null;
let transportMode: "smtp" | "outbox" = "outbox";

function buildTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const auth = process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
    : undefined;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port, secure, auth,
  });
}

export async function initEmail(): Promise<void> {
  transporter = buildTransporter();
  if (!transporter) {
    transportMode = "outbox";
    fs.mkdirSync(path.dirname(OUTBOX_PATH), { recursive: true });
    console.log(`[email] SMTP not configured; logging to ${OUTBOX_PATH}`);
    return;
  }
  try {
    await transporter.verify();
    transportMode = "smtp";
    console.log(`[email] SMTP transport ready (${process.env.SMTP_HOST})`);
  } catch (error) {
    transporter = null;
    transportMode = "outbox";
    console.warn(
      `[email] SMTP verify failed (${(error as Error).message}); falling back to outbox`,
    );
    fs.mkdirSync(path.dirname(OUTBOX_PATH), { recursive: true });
  }
}

export function emailTransportMode(): "smtp" | "outbox" {
  return transportMode;
}

function logToOutbox(to: string, subject: string, body: string): void {
  const entry = `${new Date().toISOString()} | TO: ${to} | SUBJECT: ${subject} | ${body}\n`;
  fs.appendFileSync(OUTBOX_PATH, entry);
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM ?? "no-reply@constructionplanner.local",
        to, subject, text: body,
      });
      return;
    } catch (error) {
      console.error(`[email] SMTP send failed for ${to}: ${(error as Error).message}`);
      // Don't lose the message — drop it in the outbox as a fallback
    }
  }
  logToOutbox(to, subject, body);
}
