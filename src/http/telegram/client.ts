import type {
  AnswerCallbackQueryParams,
  Chat,
  CopyMessageParams,
  DeleteMessageParams,
  DeleteWebhookParams,
  EditMessageTextParams,
  ForwardMessageParams,
  GetUpdatesParams,
  Message,
  MessageId,
  SendDocumentParams,
  SendMediaGroupParams,
  SendMessageParams,
  SendPhotoParams,
  SetWebhookParams,
  TelegramApiResponse,
  Update,
  User,
  WebhookInfo,
} from "./types";

export * from "./types";

// ─── Error ────────────────────────────────────────────────────────────────────

export class TelegramError extends Error {
  constructor(
    public readonly error_code: number,
    public readonly description: string
  ) {
    super(`Telegram API error ${error_code}: ${description}`);
    this.name = "TelegramError";
  }
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class TelegramClient {
  private readonly baseUrl: string;

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  private async call<T>(method: string, params?: object): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: params ? JSON.stringify(params) : undefined,
    });

    const data: TelegramApiResponse<T> = await response.json();

    if (!data.ok) {
      throw new TelegramError(
        data.error_code ?? response.status,
        data.description ?? "Unknown error"
      );
    }

    return data.result;
  }

  getMe(): Promise<User> {
    return this.call<User>("getMe");
  }

  sendMessage(params: SendMessageParams): Promise<Message> {
    return this.call<Message>("sendMessage", params);
  }

  sendPhoto(params: SendPhotoParams): Promise<Message> {
    return this.call<Message>("sendPhoto", params);
  }

  sendDocument(params: SendDocumentParams): Promise<Message> {
    return this.call<Message>("sendDocument", params);
  }

  sendMediaGroup(params: SendMediaGroupParams): Promise<Message[]> {
    return this.call<Message[]>("sendMediaGroup", params);
  }

  editMessageText(params: EditMessageTextParams): Promise<Message> {
    return this.call<Message>("editMessageText", params);
  }

  deleteMessage(params: DeleteMessageParams): Promise<true> {
    return this.call<true>("deleteMessage", params);
  }

  forwardMessage(params: ForwardMessageParams): Promise<Message> {
    return this.call<Message>("forwardMessage", params);
  }

  copyMessage(params: CopyMessageParams): Promise<MessageId> {
    return this.call<MessageId>("copyMessage", params);
  }

  getChat(chat_id: string | number): Promise<Chat> {
    return this.call<Chat>("getChat", { chat_id });
  }

  getUpdates(params?: GetUpdatesParams): Promise<Update[]> {
    return this.call<Update[]>("getUpdates", params);
  }

  setWebhook(params: SetWebhookParams): Promise<true> {
    return this.call<true>("setWebhook", params);
  }

  deleteWebhook(params?: DeleteWebhookParams): Promise<true> {
    return this.call<true>("deleteWebhook", params);
  }

  getWebhookInfo(): Promise<WebhookInfo> {
    return this.call<WebhookInfo>("getWebhookInfo");
  }

  answerCallbackQuery(params: AnswerCallbackQueryParams): Promise<true> {
    return this.call<true>("answerCallbackQuery", params);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const telegram = new TelegramClient(process.env.API_TELEGRAM!);
