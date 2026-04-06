import { app } from "@/app/api/[[...slug]]/route";
import { treaty } from "@elysiajs/eden";

export const client =
  typeof process !== "undefined"
    ? treaty(app).user
    : treaty<typeof app>("localhost:3000").user;

const res = client.get();
