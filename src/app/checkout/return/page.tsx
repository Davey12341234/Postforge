import { Suspense } from "react";
import CheckoutReturnClient from "./CheckoutReturnClient";

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
          Loading…
        </div>
      }
    >
      <CheckoutReturnClient />
    </Suspense>
  );
}
