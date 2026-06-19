import type { Variants } from "framer-motion";

const transition = {
  duration: 0.45,
  ease: "easeOut",
} as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...transition,
      duration: 0.5,
    },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
      ease: "easeOut",
    },
  },
};

export const staggerItem: Variants = slideUp;
