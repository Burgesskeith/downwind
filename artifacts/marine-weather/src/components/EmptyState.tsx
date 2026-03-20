import { motion } from "framer-motion";
import { Compass } from "lucide-react";

export function EmptyState() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 mt-12 text-center max-w-md mx-auto"
    >
      <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 shadow-xl shadow-primary/5 ring-4 ring-primary/5">
        <Compass className="w-12 h-12" />
      </div>
      <h2 className="font-display text-3xl font-bold text-foreground mb-4">
        Ready for a downwinder?
      </h2>
      <p className="text-lg text-muted-foreground">
        Search for your favorite beach or coastal spot above to get a 7-day marine forecast optimized for paddle boarding.
      </p>
    </motion.div>
  );
}
