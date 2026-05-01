import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /** Helps Android Chrome resize the layout when the soft keyboard opens (keeps composer in view). */
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "bbGPT — AI Chat Assistant",
  description:
    "bbGPT — a dark conversational assistant with quantum-inspired controls. Not affiliated with OpenAI.",
  icons: { icon: "/bbgpt-logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh overflow-x-hidden supports-[min-height:100dvh]:min-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}
