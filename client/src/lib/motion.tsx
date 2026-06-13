import { LazyMotion, domAnimation, m, AnimatePresence, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { isNativeApp } from "@/lib/platform";

/** Loads only DOM animation features (~75% smaller than full framer-motion). */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={isNativeApp() ? "always" : "user"}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

export { m as motion, AnimatePresence };
