import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centrale 41 · Padel",
  description: "Prenota il tuo campo da padel",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
