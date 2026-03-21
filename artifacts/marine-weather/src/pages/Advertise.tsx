import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Monitor, Zap, Users } from "lucide-react";

export default function Advertise() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/ads/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to forecast
        </Link>

        <h1 className="font-display text-4xl font-black mb-3">Advertise on Paddle Planner</h1>
        <p className="text-muted-foreground text-lg mb-10">
          Reach surfers, outrigger paddlers, and ocean athletes who check conditions daily.
        </p>

        {/* Features */}
        <div className="grid gap-5 mb-10">
          <div className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Prime placement</h3>
              <p className="text-muted-foreground text-sm">
                Your 320×100 banner appears directly after today's forecast — the first thing users see when planning their session.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Targeted audience</h3>
              <p className="text-muted-foreground text-sm">
                Paddle boarders, kayakers, surfers, and outrigger crews — active ocean enthusiasts who spend on gear, travel, and events.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-5 rounded-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Instant setup</h3>
              <p className="text-muted-foreground text-sm">
                Pay online, upload your banner image and link — your ad goes live immediately. No approval delays.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing card */}
        <div className="rounded-3xl border border-primary/20 bg-card p-8 text-center shadow-lg shadow-primary/5 mb-6">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mb-2">Ad Slot — 30 days</p>
          <p className="font-display text-6xl font-black mb-1">$19.99</p>
          <p className="text-muted-foreground mb-8">One-time payment · No subscription</p>

          {error && (
            <p className="text-rose-500 text-sm mb-4 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              {error}
            </p>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting to checkout…" : "Buy Ad Slot — $19.99"}
          </button>

          <p className="text-muted-foreground text-xs mt-4">
            Secure checkout via Stripe. You'll upload your image right after payment.
          </p>
        </div>

        {/* Spec */}
        <div className="text-center text-muted-foreground text-sm">
          <p className="font-medium mb-1">Banner specifications</p>
          <p>320×100 px · JPG or PNG · max 500 KB</p>
        </div>
      </div>
    </div>
  );
}
