import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import "./unified-globals.css";

function metadataBaseUrl(): URL {
  const raw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    return new URL(raw.replace(/\/$/, ""));
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: "AI Content Studio | Unified",
    template: "%s | AI Content Studio",
  },
  description:
    "Generate engaging social posts with AI. Gamified studio with drafts, publishing workflow, and growth tools — inside Postforge.",
  keywords: [
    "AI content",
    "social media",
    "Instagram",
    "LinkedIn",
    "content studio",
  ],
  openGraph: {
    title: "AI Content Studio — Unified",
    description:
      "Conversational AI, drafts, missions, and publishing — one dark-mode studio.",
    url: "/unified",
    siteName: "Postforge",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Content Studio",
    description: "Create and ship social content with AI assistance.",
  },
  alternates: {
    canonical: "/unified",
  },
  manifest: "/unified-manifest.json",
  themeColor: "#6366f1",
  appleWebApp: {
    capable: true,
    title: "AI Studio",
    statusBarStyle: "black-translucent",
  },
};

export default async function UnifiedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/unified");
  }

  return <div className="ucs-root">{children}</div>;
}
