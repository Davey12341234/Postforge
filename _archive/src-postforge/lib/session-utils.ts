import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const getOrganizationFromSession = cache(async () => {
  const session = await auth();
  if (!session?.user?.orgId) return null;

  const organization = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
  });
  if (!organization) return null;

  return {
    organizationId: organization.id,
    organization,
    userId: session.user.id as string,
  };
});

export const getBrandFromSession = cache(
  async (organizationId: string) => {
    const brand = await prisma.brand.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    if (!brand) {
      return prisma.brand.create({
        data: { name: "Default Brand", organizationId },
      });
    }
    return brand;
  },
);
