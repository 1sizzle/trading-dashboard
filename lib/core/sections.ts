export type Section = {
  key: string;
  label: string;
  href: string;
  icon: string;
};

// Adding a future section (Etsy, Life) is appending an entry here — the
// dashboard shell and nav render entirely from this list.
export const sections: Section[] = [
  { key: "trading", label: "Trading", href: "/dashboard/trading", icon: "📈" },
  { key: "life", label: "Life", href: "/dashboard/life", icon: "💰" },
];
