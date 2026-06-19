import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";
import { telegram } from "@/http/telegram/client";

const ROOM_TTL_SECOUNDS = 60 * 10;

const rooms = new Elysia({ prefix: "/room" })
  .post("/create", async () => {
    const roomId = nanoid();

    await redis.hset(`meta:${roomId}`, {
      connected: [],
      createdAt: Date.now(),
    });

    await redis.expire(`meta:${roomId}`, ROOM_TTL_SECOUNDS);

    return { roomId };
  })
  .use(authMiddleware)
  .get(
    "/",
    async ({ auth }) => {
      const messages = await redis.lrange<Message>(
        `messages:${auth.roomId}`,
        0,
        -1,
      );
      return {
        messages: messages.map((message) => ({
          ...message,
          token: message.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    { query: z.object({ roomId: z.string() }) },
  )
  .use(authMiddleware)
  .get(
    "/ttl",
    async ({ auth }) => {
      const ttl = await redis.ttl(`meta:${auth.roomId}`);

      return { ttl: ttl > 0 ? ttl : 0 };
    },
    {
      query: z.object({
        roomId: z.string(),
      }),
    },
  )
  .delete(
    "/",
    async ({ auth }) => {
      await Promise.all([
        redis.del(auth.roomId),
        redis.del(`meta:${auth.roomId}`),
        redis.del(`messages:${auth.roomId}`),
      ]);
      await realtime
        .channel(auth.roomId)
        .emit("chat.destroy", { isDestroyed: true });
    },

    { query: z.object({ roomId: z.string() }) },
  );

const messages = new Elysia({
  prefix: "/messages",
})
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text } = body;
      const { roomId } = auth;

      const roomExists = await redis.exists(`meta:${roomId}`);

      if (!roomExists) {
        throw new Error("Room does not exist");
      }

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId,
      };

      //Add message to history
      await redis.rpush(`messages:${roomId}`, {
        ...message,
        token: auth.token,
      });
      await realtime.channel(roomId).emit("chat.message", message);

      //houdekeeping
      const remaining = await redis.ttl(`meta:${roomId}`);
      await Promise.all([
        redis.expire(`messages:${roomId}`, remaining),
        redis.expire(`history ${roomId}`, remaining),
        redis.expire(roomId, remaining),
      ]);
    },
    {
      query: z.object({ roomId: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
      }),
    },
  );

// ─── Telegram types ──────────────────────────────────────────────────────────

interface TelegramContact {
  chatId: string;
  name: string;
  username?: string;
  addedAt: number;
}

interface TelegramStoredMessage {
  id: string;
  chatId: string;
  text: string;
  direction: "sent" | "received";
  timestamp: number;
  telegramMessageId?: number;
}

// ─── Telegram routes ─────────────────────────────────────────────────────────

const telegramRoutes = new Elysia({ prefix: "/telegram" })
  .get("/contacts", async () => {
    const chatIds = await redis.smembers("telegram:contacts");

    if (!chatIds.length) return { contacts: [] as TelegramContact[] };

    const contacts = await Promise.all(
      chatIds.map(async (id) => {
        const data = await redis.hgetall(`telegram:contact:${id}`);
        return data as TelegramContact | null;
      }),
    );

    return {
      contacts: contacts
        .filter((c): c is TelegramContact => c !== null)
        .sort((a, b) => Number(b.addedAt) - Number(a.addedAt)),
    };
  })
  .post(
    "/contacts",
    async ({ body }) => {
      const contact: TelegramContact = {
        chatId: body.chatId,
        name: body.name,
        username: body.username,
        addedAt: Date.now(),
      };

      await Promise.all([
        redis.sadd("telegram:contacts", body.chatId),
        redis.hset(`telegram:contact:${body.chatId}`, contact as unknown as Record<string, unknown>),
      ]);

      return { contact };
    },
    {
      body: z.object({
        chatId: z.string().min(1),
        name: z.string().min(1).max(100),
        username: z.string().optional(),
      }),
    },
  )
  .get(
    "/messages",
    async ({ query }) => {
      const messages = await redis.lrange<TelegramStoredMessage>(
        `telegram:messages:${query.chatId}`,
        0,
        -1,
      );
      return { messages };
    },
    { query: z.object({ chatId: z.string() }) },
  )
  .post(
    "/send",
    async ({ body }) => {
      const { chatId, text } = body;

      const sent = await telegram.sendMessage({ chat_id: chatId, text });

      const message: TelegramStoredMessage = {
        id: nanoid(),
        chatId,
        text,
        direction: "sent",
        timestamp: Date.now(),
        telegramMessageId: sent.message_id,
      };

      await redis.rpush(`telegram:messages:${chatId}`, message);

      return { message };
    },
    {
      body: z.object({
        chatId: z.string().min(1),
        text: z.string().min(1).max(4096),
      }),
    },
  )
  .get("/sync", async () => {
    const storedOffset = await redis.get<number>("telegram:update_offset");
    const offset = storedOffset ?? 0;

    const updates = await telegram.getUpdates({ offset, limit: 100, timeout: 0 });

    if (!updates.length) return { synced: 0 };

    const textUpdates = updates.filter((u) => u.message?.text);

    await Promise.all(
      textUpdates.map(async (u) => {
        const msg = u.message!;
        const chatId = String(msg.chat.id);

        const stored: TelegramStoredMessage = {
          id: nanoid(),
          chatId,
          text: msg.text!,
          direction: "received",
          timestamp: msg.date * 1000,
          telegramMessageId: msg.message_id,
        };

        await redis.rpush(`telegram:messages:${chatId}`, stored);
      }),
    );

    await redis.set(
      "telegram:update_offset",
      updates[updates.length - 1].update_id + 1,
    );

    return { synced: textUpdates.length };
  });

// ─── App ──────────────────────────────────────────────────────────────────────

export const app = new Elysia({ prefix: "/api" })
  .get("/", "Hello Nextjs")
  .use(rooms)
  .use(messages)
  .use(telegramRoutes);

export type App = typeof app;

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;
