


declare namespace Perun {

  type RequestType =
    | 'OpenChannel'
    | 'SignMessage'
    | 'SignTransaction'
    | 'UpdateNotification'

  // message from wallet-backend
  namespace SerializedMessage {
    // type SerializedBuffer = `0x${string}`
    type SerializedBuffer = {
      type: 'Buffer',
      data: number[]
    }
    type Balance = {
      balance: SerializedBuffer[];
    }
    type Balances = {
      balances: Balance[];
    }
    type ValidAllocation = {
      assets: SerializedBuffer[];
      balances: Balances;
    }
    type AddressMapping = {
      key: SerializedBuffer;
      address: SerializedBuffer;
    }
    type Address = {
      addressMapping: AddressMapping[];
    }
    /**
     * IndexMap represents the mapping of a participant indices in a sub allocation
     * or a virtual channel funding proposal to the corresponding indices in the
     * parent channel.
     */
    type IndexMap = {
      indexMap: number[];
    }

    /** SubAlloc represts a sub allocation. */
    type SubAlloc = {
      id: SerializedBuffer;
      bals: Balance | undefined;
      indexMap: IndexMap | undefined;
    }
    /** Allocation represents channel.Allocation. */
    type Allocation = {
      backends: SerializedBuffer[];
      assets: SerializedBuffer[];
      balances: Balances | undefined;
      locked: SubAlloc[];
    }

    type State = {
      id: SerializedBuffer;
      version: number;
      app: SerializedBuffer;
      allocation: Allocation | undefined;
      data: SerializedBuffer;
      isFinal: boolean;
    }

    type ValidOpenChannelRequest = {
      // The participant opening the channel.
      participant: Address | undefined;
      // Peers requested to participate in the channel.
      peers: Address[];
      // Id of this channel proposal, can be used to match the request.
      proposalId: SerializedBuffer;
      // Duration of the challenge phase in seconds.
      challengeDuration: number;
      // Nonce share of the participant.
      nonceShare: SerializedBuffer;
      // The initial balance distribution of the channel.
      initBals: ValidAllocation;
      // Possibly differing balance distribution from the initBals one. E.g. the
      // request might contain the following initBals:
      //
      //  initBals = [CKBytes: [100, 100], SUDT: [50, 50]]
      //
      // initBals[0] identifies CKBytes, initBals[1] identifies SUDT.
      // initBals[0][0] is the balance of CKBytes for the participant identified by
      // the first index.
      // initBals[0][1] is the balance of CKBytes for the participant identified by
      // the second index.
      //
      // The fundingAgreement can specify that the first participant is paying to
      // cover the balances of the second participant. E.g.:
      //
      //  fundingAgreement = [CKBytes: [200, 0], SUDT: [100, 0]]
      //
      // So the first participant is paying 200 CKBytes and 100 SUDT to also cover
      // the balances of the second participant.
      fundingAgreement: Balances;
      // The temporary channel ID used to identify the peer in the first SignMsg request
      tempChannelId: SerializedBuffer;
    }

    type ValidSignMessageRequest = { // <T> 
      pubkey: SerializedBuffer;
      data: SerializedBuffer;
      tempChannelID: SerializedBuffer;
      // decoded: T;
    }

    type SignTransactionRequest = {
      identifier: SerializedBuffer;
      /** The transaction to be signed. */
      transaction: SerializedBuffer;
    }

    type UpdateNotificationRequest = {
      /** The state with which the channel should be updated. */
      state: State | undefined;
    }

    type Request =
      | {
        type: "OpenChannel",
        req: ValidOpenChannelRequest
        requestId: string,
      }
      | {
        type: "SignMessage",
        req: ValidSignMessageRequest,
        requestId: string,
      }
      | {
        type: "SignTransaction",
        req: SignTransactionRequest,
        requestId: string,
      }
      | {
        type: "UpdateNotification",
        req: UpdateNotificationRequest,
        requestId: string,
      }

  }


  // for web
  namespace ReadableMessage {
    type HexString = string // `0x${string}`
    type PeerUser = {
      publicKey: HexString,
      address: string,
    }
    type Balance = {
      /** bigint string */
      balance: string[];
    }
    type Balances = {
      balances: Balance[];
    }
    type ValidAllocation = {
      // todo hexstring?
      assets: (string | null)[];
      balances: Balances;
    }
    type IndexMap = {
      indexMap: number[];
    }
    /** SubAlloc represts a sub allocation. */
    type SubAlloc = {
      id: HexString;
      bals: Balance | undefined;
      indexMap: IndexMap | undefined;
    }
    /** Allocation represents channel.Allocation. */
    type Allocation = {
      backends: HexString[];
      // todo hexstring?
      assets: (string | null)[];
      balances: Balances | undefined;
      locked: SubAlloc[];
    }
    type State = {
      id: HexString;
      version: number;
      app: HexString;
      allocation: Allocation | undefined;
      data: HexString;
      isFinal: boolean;
    }

    type OpenChannelRequest = {
      participant: PeerUser,
      // not sure how to decode peers
      // peers: [],
      /** channelId from Proprosal Id? */
      proposalId: HexString,

      challengeDuration: number,

      nonceShare: HexString,

      initBals: ValidAllocation,

      fundingAgreement: Balances;

      tempChannelId: HexString,
    }

    type SignMessageRequest = { // <T> 
      /**  ckb address? */
      pubkey: string;
      data: HexString;
      tempChannelID: HexString;
      // decoded: T;
    }

    type SignTransactionRequest = {
      identifier: string;
      /** The transaction to be signed. */
      transaction: CKBComponents.Transaction;
      // tx: CKBComponents.Transaction
    }

    type UpdateNotificationRequest = {
      /** The state with which the channel should be updated. */
      state: State | undefined;
    }

    type Request =
      | {
        type: "OpenChannel",
        request: OpenChannelRequest
        timestamp: number,
      }
      | {
        type: "SignMessage",
        request: SignMessageRequest,
        timestamp: number,
      }
      | {
        type: "SignTransaction",
        request: SignTransactionRequest,
        timestamp: number,
      }
      | {
        type: "UpdateNotification",
        request: UpdateNotificationRequest,
        timestamp: number,
      }


  }

}


declare namespace PerunAPI {
  type PeerUser = Perun.ReadableMessage.PeerUser;
  type Script = { codeHash: string, hashType: string, args: string }

  type OpenChannelParams = {
    me: PeerUser,
    peer: PeerUser,
    balances: Array<{
      type: null | Script
      balances: [string, string]
    }>
    challengeDuration: number
  }
}