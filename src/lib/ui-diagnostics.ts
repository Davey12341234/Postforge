import { lsKey } from "./storage";

const KEY = lsKey("ui_diag_v1");

export type UiDiagStatus = "ok" | "fail" | "skip";

/** Console diagnostics for control paths — enable via Settings or `NEXT_PUBLIC_UI_DIAGNOSTICS=true`. */
export function isUiDiagnosticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (process.env.NEXT_PUBLIC_UI_DIAGNOSTICS === "true") return true;
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function getUiDiagnosticsEnabled(): boolean {
  return isUiDiagnosticsEnabled();
}

export function setUiDiagnosticsEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function uiDiag(controlId: string, status: UiDiagStatus, detail?: Record<string, unknown>): void {
  if (!isUiDiagnosticsEnabled()) return;
  const line = {
    app: "BabyGPT",
    controlId,
    status,
    at: new Date().toISOString(),
    ...detail,
  };
  const msg = `[BabyGPT UI] ${JSON.stringify(line)}`;
  if (status === "fail") console.warn(msg);
  else console.log(msg);
}
