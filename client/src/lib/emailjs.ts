import emailjs from "@emailjs/browser";

const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;

const PLACEHOLDER_VALUES = new Set([
  "your_public_key",
  "your_service_id",
  "your_template_id",
]);

const MIN_SUBMIT_MS = 3_000;
const COOLDOWN_MS = 60_000;
const COOLDOWN_KEY = "contact-form-last-sent";

let initialized = false;

export function isEmailJsConfigured(): boolean {
  if (!publicKey || !serviceId || !templateId) return false;
  return (
    !PLACEHOLDER_VALUES.has(publicKey) &&
    !PLACEHOLDER_VALUES.has(serviceId) &&
    !PLACEHOLDER_VALUES.has(templateId)
  );
}

function ensureInit(): void {
  if (!isEmailJsConfigured() || initialized) return;
  emailjs.init(publicKey!);
  initialized = true;
}

export function getContactCooldownRemainingMs(): number {
  const lastSent = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
  if (!lastSent) return 0;
  return Math.max(0, COOLDOWN_MS - (Date.now() - lastSent));
}

export type ContactFormPayload = {
  name: string;
  email: string;
  message: string;
  honeypot: string;
  openedAt: number;
};

export async function sendContactEmail(payload: ContactFormPayload): Promise<void> {
  if (!isEmailJsConfigured()) {
    throw new Error("EmailJS is not configured");
  }

  if (payload.honeypot.trim()) {
    throw new Error("Spam detected");
  }

  if (Date.now() - payload.openedAt < MIN_SUBMIT_MS) {
    throw new Error("Form submitted too quickly");
  }

  const cooldown = getContactCooldownRemainingMs();
  if (cooldown > 0) {
    throw new Error("Please wait before sending another message");
  }

  ensureInit();

  await emailjs.send(serviceId!, templateId!, {
    from_name: payload.name.trim() || "App user",
    reply_to: payload.email.trim() || "noreply@downwind.app",
    message: payload.message.trim(),
  });

  localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
}
