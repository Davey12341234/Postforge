import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/constants";
import { ensureStarterCreditsIfEligible } from "@/lib/ensure-org-credits";
import { unlockDashboardOnFirstScheduledPost } from "@/services/activation-unlock";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const emailStr = credentials.email as string;
        const user = await prisma.user.upsert({
          where: { email: emailStr },
          update: {},
          create: { email: emailStr, name: emailStr.split("@")[0] },
        });
        const orgId = "temp_org_123";
        await prisma.organization.upsert({
          where: { id: orgId },
          update: {},
          create: {
            id: orgId,
            name: "My Agency",
            aiCredits: PLAN_LIMITS.FREE.credits,
          },
        });
        await prisma.organizationMember.upsert({
          where: {
            organizationId_userId: { organizationId: orgId, userId: user.id },
          },
          update: {},
          create: {
            organizationId: orgId,
            userId: user.id,
            role: "OWNER",
          },
        });
        await ensureStarterCreditsIfEligible(orgId);
        try {
          await unlockDashboardOnFirstScheduledPost(orgId, {
            caption: "Welcome to PostForge! 🚀",
            platform: "LINKEDIN",
            scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          });
        } catch {
          /* already unlocked */
        }
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.id) {
        const m = await prisma.organizationMember.findFirst({
          where: { userId: token.id as string },
          select: { organizationId: true },
        });
        token.orgId = m?.organizationId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.orgId = token.orgId as string;
      session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
