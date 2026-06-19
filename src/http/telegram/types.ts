// ─── Primitives ───────────────────────────────────────────────────────────────

export type ParseMode = "HTML" | "Markdown" | "MarkdownV2";

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface Chat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
}

export interface MessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: User;
  language?: string;
  custom_emoji_id?: string;
}

export interface Message {
  message_id: number;
  message_thread_id?: number;
  from?: User;
  sender_chat?: Chat;
  date: number;
  chat: Chat;
  text?: string;
  entities?: MessageEntity[];
  caption?: string;
  caption_entities?: MessageEntity[];
  reply_markup?: InlineKeyboardMarkup;
}

export interface MessageId {
  message_id: number;
}

export interface Update {
  update_id: number;
  message?: Message;
  edited_message?: Message;
  channel_post?: Message;
  edited_channel_post?: Message;
  callback_query?: CallbackQuery;
}

export interface CallbackQuery {
  id: string;
  from: User;
  message?: Message;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

// ─── Keyboards ────────────────────────────────────────────────────────────────

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  switch_inline_query?: string;
  pay?: boolean;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
}

export interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
  is_persistent?: boolean;
}

export interface ReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

export type ReplyMarkup =
  | InlineKeyboardMarkup
  | ReplyKeyboardMarkup
  | ReplyKeyboardRemove;

// ─── Media ────────────────────────────────────────────────────────────────────

export interface InputMediaPhoto {
  type: "photo";
  media: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
}

export interface InputMediaDocument {
  type: "document";
  media: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  disable_content_type_detection?: boolean;
}

export type InputMedia = InputMediaPhoto | InputMediaDocument;

// ─── Internal ─────────────────────────────────────────────────────────────────

export interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  error_code?: number;
  description?: string;
}

// ─── Method Params ────────────────────────────────────────────────────────────

export interface SendMessageParams {
  chat_id: number | string;
  text: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  disable_notification?: boolean;
  reply_markup?: ReplyMarkup;
  message_thread_id?: number;
}

export interface SendPhotoParams {
  chat_id: number | string;
  photo: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  disable_notification?: boolean;
  reply_markup?: ReplyMarkup;
  message_thread_id?: number;
}

export interface SendDocumentParams {
  chat_id: number | string;
  document: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  disable_notification?: boolean;
  reply_markup?: ReplyMarkup;
  message_thread_id?: number;
}

export interface SendMediaGroupParams {
  chat_id: number | string;
  media: InputMedia[];
  message_thread_id?: number;
  disable_notification?: boolean;
}

export interface EditMessageTextParams {
  chat_id: number | string;
  message_id: number;
  text: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  reply_markup?: InlineKeyboardMarkup;
}

export interface DeleteMessageParams {
  chat_id: number | string;
  message_id: number;
}

export interface ForwardMessageParams {
  chat_id: number | string;
  from_chat_id: number | string;
  message_id: number;
  message_thread_id?: number;
  disable_notification?: boolean;
}

export interface CopyMessageParams {
  chat_id: number | string;
  from_chat_id: number | string;
  message_id: number;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  reply_markup?: ReplyMarkup;
  message_thread_id?: number;
  disable_notification?: boolean;
}

export interface GetUpdatesParams {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export interface SetWebhookParams {
  url: string;
  secret_token?: string;
  max_connections?: number;
  allowed_updates?: string[];
  drop_pending_updates?: boolean;
  ip_address?: string;
}

export interface DeleteWebhookParams {
  drop_pending_updates?: boolean;
}

export interface AnswerCallbackQueryParams {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}
