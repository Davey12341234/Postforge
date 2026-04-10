import { auth } from "@/lib/auth";
import StudioErrorBoundary from "@/components/unified/studio-error-boundary";
import UnifiedStudioClient from "./unified-studio-client";

export default async function UnifiedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return (
    <StudioErrorBoundary>
      <UnifiedStudioClient
        userId={session.user.id}
        userEmail={session.user.email ?? ""}
      />
    </StudioErrorBoundary>
  );
}
