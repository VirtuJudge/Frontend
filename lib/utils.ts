import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-hero",
        "text-headline",
        "text-subheadline",
        "text-body",
        "text-body-large",
        "text-caption",
        "text-inherit",
      ],
      select: ["text-unselectable"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return customTwMerge(clsx(inputs));
}
