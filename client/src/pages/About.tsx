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
        <p className="text-muted-foreground text-lg mb-6">
          Downwind paddling requires specific conditions to be optimal. The Paddle Planner uses marine and wind data to score the conditions for your local beach.
        </p>
        <p className="text-muted-foreground text-lg mb-6">
          You can select a beach location anywhere in the world and find a day to plan for a downwind paddle.
        </p>
        <p className="text-muted-foreground text-lg mb-6">
          I sincerely hope you find this application useful.  If you have suggestions dor improvement, you can send them to me at keith.burgess@webwings.com.au.
        </p>
        <p>To be completed.</p>
      </div>
    </div>
  );
}
