import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "bbGPT — AI Chat Assistant",
  description:
    "bbGPT — a dark conversational assistant with quantum-inspired controls. Not affiliated with OpenAI.",
  icons: { icon: "/bbgpt-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
