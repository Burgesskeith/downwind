export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Hero */}
      <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-background flex items-end">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[100px]" />
        </div>
        <div className="relative z-10 w-full max-w-3xl mx-auto px-6 pb-10">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
            About Us
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Say something about us here.
        </p>
      </div>
    </div>
  );
}
