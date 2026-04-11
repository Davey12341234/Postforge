import { Suspense } from "react";
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
      <Suspense
        fallback={
          <div className="ucs-card" style={{ margin: 16, padding: 20 }}>
            <p style={{ margin: 0, color: "#a1a1aa" }}>Loading studio…</p>
          </div>
        }
      >
        <UnifiedStudioClient
          userId={session.user.id}
          userEmail={session.user.email ?? ""}
        />
      </Suspense>
    </StudioErrorBoundary>
  );
}
