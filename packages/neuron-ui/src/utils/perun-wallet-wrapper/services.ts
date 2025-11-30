import { CallContext, Server, createServer } from "nice-grpc";
import {
  ChannelServiceImplementation,
  GetAssetsRequest,
  OpenChannelRequest,
  SignMessageRequest,
  SignTransactionRequest,
  UpdateNotificationRequest,
  WalletServiceDefinition,
  WalletServiceImplementation,
} from "./perun-wallet";
import { PerunError } from "./error";
import {
  ValidOpenChannelRequest,
  ValidSignMessageRequest,
  verifyOpenChannelRequest,
} from "./verifier";
import { Allocation } from "./wire";

export interface SimpleChannelServiceClient {
  // Request to open a channel with the given peer using the given allocation
  // as the initial channel state. For more information on the Allocation see
  // `verifier.ts` ValidOpenChannelRequest.initBals.
  openChannel(
    me: Uint8Array,
    peerToConnectTo: Uint8Array,
    allocation: Allocation,
    challengeDuration: number,
    tempChannelId: Uint8Array,
  ): ServiceResponse<ChannelServiceImplementation["openChannel"]>;

  getChannels (
    requester: Uint8Array
  ): ServiceResponse<ChannelServiceImplementation["getChannels"]>;

  // Update the channel by paying the given amount to the peer. The asset is
  // identified by the idx of said asset in the channels state. See
  // ValidOpenChannelRequest.fundingAgreement in `verifier.ts` for more
  // details.
  updateChannel(
    channelId: Uint8Array,
    assetIdx: number,
    amount: bigint,
  ): ServiceResponse<ChannelServiceImplementation["updateChannel"]>;

  // Close and settle the channel.
  closeChannel(
    channelId: Uint8Array,
  ): ServiceResponse<ChannelServiceImplementation["closeChannel"]>;

  // Restore all channels for the user
  restoreChannels(
    data: Uint8Array,
  ): ServiceResponse<ChannelServiceImplementation["restoreChannels"]>;
}

// The WalletBackend is parameterized on the MessageType it is able to sign
// when requested to sign an arbitrary data blob.
export interface WalletBackend<MessageType> {
  // A request to open a channel from another peer.
  openChannelRequest(
    req: ValidOpenChannelRequest,
  ): ServiceResponse<WalletServiceImplementation["openChannel"]>;

  // A notification to the wallet, which should be forwarded to the user to ask
  // for agreement to the update.
  updateNotificationRequest(
    req: ServiceRequest<WalletServiceImplementation["updateNotification"]>,
  ): ServiceResponse<WalletServiceImplementation["updateNotification"]>;

  // A request to sign an arbitrary message. The message that is signed is per
  // definition a byte-blob but the wallet can choose to interpret it and deny
  // signing it if it is not of a format it understands.
  signMessageRequest(
    req: ValidSignMessageRequest<MessageType>,
  ): ServiceResponse<WalletServiceImplementation["signMessage"]>;

  signTransactionRequest(
    req: ServiceRequest<WalletServiceImplementation["signTransaction"]>,
  ): ServiceResponse<WalletServiceImplementation["signTransaction"]>;
}

export interface MessageValidator<T> {
  // Tries to parse the message into a known format. If the message is not
  // understood an PerunError is thrown.
  (message: Uint8Array): T;
}

export class WalletServiceServer<MessageType>
  implements WalletServiceImplementation
{
  private b: WalletBackend<MessageType>;

  private messageValidator: MessageValidator<MessageType>;

  constructor(
    backend: WalletBackend<MessageType>,
    messageValidator: MessageValidator<MessageType>,
  ) {
    this.b = backend;
    this.messageValidator = messageValidator;
  }

  async openChannel(
    request: OpenChannelRequest,
    _context: CallContext,
  ): Promise<{
    rejected?: { reason?: string | undefined } | undefined;
    nonceShare?: Uint8Array | undefined;
  }> {
    try {
      console.log("WALLET_SERVER: openChannel");
      let validRequest = verifyOpenChannelRequest(request);
      console.log("WALLET_SERVER: validated request");
      return this.b.openChannelRequest(validRequest);
    } catch (e) {
      console.log("WALLET_SERVER: openChannel: encountered error");
      if (e instanceof PerunError) {
        return { rejected: { reason: e.message } };
      }

      console.log("WALLET_SERVER: openChannel: rethrowing error");
      // Rethrow unexpected errors.
      throw e;
    }
  }

  updateNotification(
    request: UpdateNotificationRequest,
    _context: CallContext,
  ): Promise<{ accepted?: boolean | undefined }> {
    console.log("WALLET_SERVER: updateNotification");
    return this.b.updateNotificationRequest(request);
  }

  async signMessage(
    request: SignMessageRequest,
    _context: CallContext,
  ): Promise<{
    rejected?: { reason?: string | undefined } | undefined;
    signature?: Uint8Array | undefined;
  }> {
    console.log("WALLET_SERVER: signMessage");
    try {
      const validMessage = this.messageValidator(request.data);
      return this.b.signMessageRequest({ ...request, decoded: validMessage });
    } catch (e) {
      if (e instanceof PerunError) {
        return { rejected: { reason: e.message } };
      }
      throw e;
    }
  }

  signTransaction(
    request: SignTransactionRequest,
    _context: CallContext,
  ): Promise<{
    rejected?: { reason?: string | undefined } | undefined;
    transaction?: Uint8Array | undefined;
  }> {
    console.log("WALLET_SERVER: signTransaction");
    return this.b.signTransactionRequest(request);
  }

  getAssets(
    _request: GetAssetsRequest,
    _context: CallContext,
  ): Promise<{
    rejected?:
      | { assetIdx?: number | undefined; reason?: string | undefined }
      | undefined;
  }> {
    throw new Error("Method not implemented.");
  }
}

export function mkWalletServiceServer<MessageType>(
  b: WalletBackend<MessageType>,
  v: MessageValidator<MessageType>,
): Server<{}> {
  const server = createServer();
  server.add(WalletServiceDefinition, new WalletServiceServer(b, v));
  return server;
}

export type ServiceRequest<T> = T extends (
  request: infer U,
  context: CallContext,
) => infer _
  ? U
  : never;

export type ServiceResponse<T> = T extends (
  request: infer _,
  context: CallContext,
) => infer U
  ? U
  : never;
