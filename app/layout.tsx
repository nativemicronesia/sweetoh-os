import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sweet'Oh Creations",
    template: "%s · Sweet'Oh Creations",
  },
  description:
    "Micronesian print-on-demand. Shop ready designs or create your own — order once, wait for the package.",
  openGraph: {
    title: "Sweet'Oh Creations",
    description:
      "Micronesian print-on-demand. Shop or create — then wait for your package.",
    siteName: "Sweet'Oh Creations",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${syne.variable}`}>
      <body
        style={
          {
            "--font-body": "var(--font-outfit), system-ui, sans-serif",
            "--font-display": "var(--font-syne), system-ui, sans-serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
