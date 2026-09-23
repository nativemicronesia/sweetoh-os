import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

/** Headings: a soft, warm serif — boutique gift shop, handmade, island-proud. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "Sweet'Oh Creations",
    template: "%s · Sweet'Oh Creations",
  },
  description:
    "Micronesian-owned creative print shop in Lacey, Washington. Apparel and gifts for everyone.",
  openGraph: {
    title: "Sweet'Oh Creations",
    description:
      "Creative apparel and gifts from Sweet’Oh Creations in Lacey, Washington.",
    siteName: "Sweet'Oh Creations",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <body
        style={
          {
            "--font-body": "var(--font-outfit), system-ui, sans-serif",
            "--font-display": "var(--font-fraunces), Georgia, serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
