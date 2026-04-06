import { Elysia, t } from "elysia";

const rooms = new Elysia({ prefix: "/room" }).post("/", () => {
  console.log("Create a new Room");
});

export const app = new Elysia({ prefix: "/user" })
  .get("/", "Hello Nextjs")
  .use(rooms);

export type App = typeof app;

export const GET = app.fetch;
export const POST = app.fetch;
