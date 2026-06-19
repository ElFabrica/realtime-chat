import { redis } from "@/lib/redis";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";
import { telegram } from "@/http/telegram/client";
import { prisma } from "@/lib/prisma";

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

// ─── Telegram routes ─────────────────────────────────────────────────────────

const telegramRoutes = new Elysia({ prefix: "/telegram" })
  .get("/contacts", async () => {
    const contacts = await prisma.telegramContact.findMany({
      orderBy: { addedAt: "desc" },
    });
    return { contacts };
  })
  .post(
    "/contacts",
    async ({ body }) => {
      try {
        await telegram.getChat(body.chatId);
      } catch {
        throw new Error("Room does not exist");
      }

      const contact = await prisma.telegramContact.upsert({
        where: { chatId: body.chatId },
        update: { name: body.name, username: body.username },
        create: {
          chatId: body.chatId,
          name: body.name,
          username: body.username,
        },
      });
      return { contact };
    },
    {
      body: z.object({
        chatId: z
          .string()
          .regex(
            /^-?[1-9]\d*$/,
            "Chat ID inválido: deve ser um número inteiro sem zeros à esquerda",
          ),
        name: z.string().min(1).max(100),
        username: z.string().optional(),
      }),
    },
  )
  .get(
    "/messages",
    async ({ query }) => {
      const messages = await prisma.telegramMessage.findMany({
        where: { chatId: query.chatId },
        orderBy: { sentAt: "asc" },
      });
      return { messages };
    },
    { query: z.object({ chatId: z.string() }) },
  )
  .post(
    "/send",
    async ({ body }) => {
      const { chatId, text } = body;

      let sent;
      try {
        sent = await telegram.sendMessage({ chat_id: chatId, text });
      } catch (err) {
        const description = err instanceof Error ? err.message : String(err);
        throw new Error(description);
      }

      const message = await prisma.telegramMessage.create({
        data: {
          id: nanoid(),
          chatId,
          text,
          direction: "sent",
          sentAt: new Date(),
          telegramMessageId: sent.message_id,
        },
      });

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
    let state;
    try {
      state = await prisma.telegramSyncState.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, offset: 0 },
      });
      console.log("[sync] state ok", state);
    } catch (err) {
      console.error("[sync] prisma.upsert FAILED", err);
      throw err;
    }

    let updates;
    try {
      updates = await telegram.getUpdates({
        offset: state.offset,
        limit: 100,
        timeout: 0,
      });
      console.log("[sync] getUpdates ok", { count: updates.length });
    } catch (err) {
      console.error("[sync] getUpdates FAILED", err);
      throw err;
    }

    if (!updates.length) return { synced: 0 };

    const textUpdates = updates.filter((u) => u.message?.text);

    if (textUpdates.length > 0) {
      try {
        for (const u of textUpdates) {
          const msg = u.message!;
          const chatId = String(msg.chat.id);
          const name =
            msg.chat.title ??
            ([msg.from?.first_name, msg.from?.last_name]
              .filter(Boolean)
              .join(" ") ||
              chatId);
          const username = msg.from?.username ?? msg.chat.username ?? undefined;

          await prisma.telegramContact.upsert({
            where: { chatId },
            update: {},
            create: { chatId, name, username },
          });

          await prisma.telegramMessage.create({
            data: {
              id: nanoid(),
              chatId,
              text: msg.text!,
              direction: "received",
              sentAt: new Date(msg.date * 1000),
              telegramMessageId: msg.message_id,
            },
          });
        }
        console.log("[sync] messages saved", { count: textUpdates.length });
      } catch (err) {
        console.error("[sync] save FAILED", err);
        throw err;
      }
    }

    try {
      await prisma.telegramSyncState.update({
        where: { id: 1 },
        data: { offset: updates[updates.length - 1].update_id + 1 },
      });
    } catch (err) {
      console.error("[sync] update offset FAILED", err);
      throw err;
    }

    return { synced: textUpdates.length };
  })
  .post("/webhook", async ({ body }) => {
    const update = body as {
      message?: {
        message_id: number;
        date: number;
        text?: string;
        chat: { id: number; title?: string; username?: string };
        from?: { first_name?: string; last_name?: string; username?: string };
      };
    };

    const msg = update.message;
    if (!msg?.text) return { ok: true };

    const chatId = String(msg.chat.id);
    const name =
      msg.chat.title ??
      ([msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
        chatId);
    const username = msg.from?.username ?? msg.chat.username ?? undefined;

    await prisma.telegramContact.upsert({
      where: { chatId },
      update: {},
      create: { chatId, name, username },
    });

    await prisma.telegramMessage.upsert({
      where: { telegramMessageId: msg.message_id },
      update: {},
      create: {
        chatId,
        text: msg.text,
        direction: "received",
        sentAt: new Date(msg.date * 1000),
        telegramMessageId: msg.message_id,
      },
    });

    return { ok: true };
  })
  .get("/webhook/setup", async () => {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    if (!url) throw new Error("NEXT_PUBLIC_APP_URL não definida no .env");

    await telegram.setWebhook({ url: `${url}/api/telegram/webhook` });
    return { ok: true, webhook: `${url}/api/telegram/webhook` };
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
