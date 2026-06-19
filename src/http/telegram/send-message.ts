import { telegram } from "./client";
import type { Message, ParseMode, ReplyMarkup } from "./client";

export interface SendMessageOptions {
  parse_mode?: ParseMode;
  disable_notification?: boolean;
  reply_markup?: ReplyMarkup;
  message_thread_id?: number;
}

export function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: SendMessageOptions
): Promise<Message> {
  return telegram.sendMessage({ chat_id: chatId, text, ...options });
}
