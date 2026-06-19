-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('sent', 'received');

-- CreateTable
CREATE TABLE "TelegramContact" (
    "chatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramContact_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable
CREATE TABLE "TelegramMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "telegramMessageId" INTEGER,

    CONSTRAINT "TelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSyncState" (
    "id" SERIAL NOT NULL,
    "offset" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TelegramSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramMessage_telegramMessageId_key" ON "TelegramMessage"("telegramMessageId");

-- CreateIndex
CREATE INDEX "TelegramMessage_chatId_sentAt_idx" ON "TelegramMessage"("chatId", "sentAt");

-- AddForeignKey
ALTER TABLE "TelegramMessage" ADD CONSTRAINT "TelegramMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "TelegramContact"("chatId") ON DELETE CASCADE ON UPDATE CASCADE;
