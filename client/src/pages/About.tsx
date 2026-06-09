import { Link } from "wouter";
import { ArrowLeft, Search, Award, Sun, Calendar, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const HOW_IT_WORKS_STEPS = [
  {
    icon: Search,
    title: "Find your beach",
    description:
      "Type a coastal town or beach name. Pick your location from the search results.",
  },
  {
    icon: Award,
    title: "Set your skill level",
    description:
      "Choose Beginner, Intermediate, or Advanced. Scores adjust to what you're comfortable paddling in.",
  },
  {
    icon: Sun,
    title: "Pick a time of day",
    description:
      "Select when you usually paddle — early morning through late afternoon.",
  },
  {
    icon: Calendar,
    title: "Read your 7-day forecast",
    description:
      "Each day gets a score (Epic → Poor). Slide the time-of-day control on any card to check different windows.",
  },
] as const;

export function ContactLink() {
  return (
    <section className="mt-10 border border-border rounded-3xl bg-card p-6 shadow-lg shadow-black/5 text-center">
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Get in touch</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Have a suggestion or want to report a problem? Send me a message.
      </p>
      <Button asChild className="w-full sm:w-auto">
        <Link href="/contact">
          Send feedback
          <Mail className="w-4 h-4" />
        </Link>
      </Button>
    </section>
  );
}

export default function About() {
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

        {/* Section 1 — About Keith */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={`${import.meta.env.BASE_URL}images/july2018.jpg`}
              alt="Keith Burgess"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
            />
            <div>
              <h1 className="font-display text-4xl font-black mb-1">Hi, I&apos;m Keith</h1>
              <p className="text-primary font-medium mb-6">Downwind paddler · App builder</p>
              <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  I&apos;m Keith, a downwind paddler who built this app because finding the right
                  day to paddle shouldn&apos;t mean juggling half a dozen weather apps.
                </p>
                <p>
                  Downwind paddling lives or dies on wind direction, swell size, and how those
                  align with your beach. I wanted one place that scores those conditions for any
                  coastline in the world — tuned to your skill level.
                </p>
                <p>
                  I hope it helps you catch more glides. If you have ideas to make it better,
                  I&apos;d love to hear from you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — How The App Works */}
        <section className="border border-border rounded-3xl bg-card p-6 shadow-lg shadow-black/5">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">
            How The App Works
          </h2>
          <ol className="space-y-6">
            {HOW_IT_WORKS_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-4 items-start">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Step {index + 1}
                    </p>
                    <h3 className="font-display text-lg font-bold text-foreground mb-1">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 pt-6 border-t border-border/50 text-muted-foreground leading-relaxed">
            Higher scores mean better downwind alignment. Green is epic, red means sit it out and
            make coffee.
          </p>
        </section>

        <ContactLink />
      </div>
    </div>
  );
}
