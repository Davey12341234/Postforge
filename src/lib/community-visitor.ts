import { lsKey } from "@/lib/storage";

const KEY = lsKey("community_visitor_v1");

/** Stable random id per browser — used to dedupe appreciations without accounts. */
export function getCommunityVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
