import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BabyGPT — AI Chat Assistant",
  description:
    "BabyGPT — a dark conversational assistant with quantum-inspired controls. Not affiliated with OpenAI.",
  icons: { icon: "/babygpt-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
