import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shlvy — Your world. Your style.",
  description: "Custom phone case concepts for college life. Florals, pastels, F1, anime, music and everything you love. Get 2–3 personal designs; buy only if you love one.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
