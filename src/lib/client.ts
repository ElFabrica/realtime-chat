import type { App } from "@/app/api/[[...slug]]/route";
import { treaty } from "@elysiajs/eden";

function getBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }

  return window.location.origin;
}

export const client = treaty<App>(getBaseUrl()).api;
