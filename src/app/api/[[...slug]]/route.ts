import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";

const ROOM_TTL_SECOUNDS = 60 * 10;

const rooms = new Elysia({ prefix: "/room" }).post("/create", async () => {
  const roomId = nanoid();

  await redis.hset(`meta:${roomId}`, {
    connected: [],
    createdAt: Date.now(),
  });

  await redis.expire(`meta:${roomId}`, ROOM_TTL_SECOUNDS);

  return { roomId };
});

export const app = new Elysia({ prefix: "/api" })
  .get("/", "Hello Nextjs")
  .use(rooms);

export type App = typeof app;

export const GET = app.fetch;
export const POST = app.fetch;
