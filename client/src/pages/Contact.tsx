import { useState, useRef, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getContactCooldownRemainingMs,
  isEmailJsConfigured,
  sendContactEmail,
} from "@/lib/emailjs";

const MIN_MESSAGE_LENGTH = 10;

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const openedAt = useRef(Date.now());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isEmailJsConfigured()) {
    return (
      <p className="text-center text-muted-foreground text-sm py-8">
        Contact form not configured yet.
      </p>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      setErrorMessage(`Message must be at least ${MIN_MESSAGE_LENGTH} characters.`);
      setStatus("error");
      return;
    }

    const cooldown = getContactCooldownRemainingMs();
    if (cooldown > 0) {
      setErrorMessage(`Please wait ${Math.ceil(cooldown / 1000)} seconds before sending again.`);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      await sendContactEmail({
        name,
        email,
        message: trimmedMessage,
        honeypot,
        openedAt: openedAt.current,
      });

      setName("");
      setEmail("");
      setMessage("");
      setStatus("success");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  function handleReset() {
    openedAt.current = Date.now();
    setStatus("idle");
    setErrorMessage("");
  }

  if (status === "success") {
    return (
      <section className="border border-border rounded-3xl bg-card p-6 shadow-lg shadow-black/5 text-center">
        <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="font-display text-lg font-bold text-foreground mb-1">
          Thanks! Your message has been sent.
        </p>
        <p className="text-muted-foreground text-sm mb-4">
          I appreciate you taking the time to share your thoughts.
        </p>
        <Button type="button" variant="outline" onClick={handleReset}>
          Send another message
        </Button>
      </section>
    );
  }

  return (
    <section className="border border-border rounded-3xl bg-card p-6 shadow-lg shadow-black/5">
      <form onSubmit={handleSubmit} className="relative space-y-4">
        {/* Honeypot — hidden from users, traps bots */}
        <input
          type="text"
          name="company"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          aria-hidden="true"
        />

        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-foreground mb-1.5 block">
            Name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={status === "submitting"}
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="text-sm font-medium text-foreground mb-1.5 block">
            Email <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="So I can reply if needed"
            disabled={status === "submitting"}
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="text-sm font-medium text-foreground mb-1.5 block">
            Message <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell me what you'd like to see improved..."
            required
            minLength={MIN_MESSAGE_LENGTH}
            rows={5}
            disabled={status === "submitting"}
          />
        </div>

        {status === "error" && errorMessage && (
          <p className="text-destructive text-sm">{errorMessage}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={status === "submitting" || message.trim().length < MIN_MESSAGE_LENGTH}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send message"
          )}
        </Button>
      </form>
    </section>
  );
}

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-2xl mx-auto px-6 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to forecast
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="font-display text-4xl font-black">Contact Me</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Send a suggestion or report a problem. I&apos;d love to hear from you.
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
