import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to forecast
        </Link>

        <h1 className="font-display text-4xl font-black mb-3">About Us</h1>
        <p className="text-muted-foreground text-lg mb-10">
          Say something about us here.
        </p>
        <p>To be completed.</p>
      </div>
    </div>
  );
}
