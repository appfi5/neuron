export type ChannelAction = "open" | "update" | "close";

export class PerunError extends Error {
  constructor(action: ChannelAction, message: string) {
    super(`On ${action}: ${message}`);
    this.name = "ChannelError";
  }
}
