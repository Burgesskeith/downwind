import { motion } from "framer-motion";

export function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-12 w-full max-w-7xl mx-auto px-4">
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="bg-card rounded-3xl p-6 border border-border shadow-sm h-[400px] flex flex-col"
        >
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded-md animate-pulse" />
            </div>
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded-md animate-pulse" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted rounded-2xl animate-pulse" />
            <div className="col-span-2 h-12 bg-muted rounded-2xl animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
