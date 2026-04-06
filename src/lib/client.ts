import { App, app } from "@/app/api/[[...slug]]/route";
import { treaty } from "@elysiajs/eden";

export const client = treaty<App>("localhost:3000").api;

const res = client.get();
