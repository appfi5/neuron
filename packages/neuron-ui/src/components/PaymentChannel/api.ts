import { perunServiceAction } from "services/remote";
import { bigintFromBEBytes, equalNumPaddedHex, getParticipantByAddressAndPubkey, isSuccessResponse } from "utils";
import { bytes } from '@ckb-lumos/codec'
import { channelIdToString } from "utils/perun-wallet-wrapper/translator";
import * as wire from "utils/perun-wallet-wrapper/wire";
import { PackableScript } from "@ckb-lumos/helpers/lib/models/script";
import { ControllerResponse } from "services/remote/remoteApiWrapper";

export type PeerUser = {
  address: string;
  publicKey?: string;
}

export type TradePayload = {
  type: PackableScript | null
  amount: number | bigint
}

export const CONNECTING_ID = "CONNECTING_ID";

export type ChannelInfo = {
  id: string;
  me: PeerUser;
  status: "connecting" | "connected" | "closed"
  peer: PeerUser;
  payload?: [TradePayload, TradePayload]
  state?: wire.State;
  myPayloadIndex: 0 | 1;
}
export async function startupChannelServiceRunner(publicKey: string) {
  const actionRes = await perunServiceAction({
    type: 'startup',
    payload: {
      network: "testnet",
      publicKey,
    },
  })
  if (!isSuccessResponse(actionRes)) {
    return []
  }
}
export async function getChannels(publicKey: string, address: string) {
  const actionRes = await perunServiceAction({
    type: 'get',
    payload: {
      requester: getParticipantByAddressAndPubkey(address, publicKey),
    },
  }) as ControllerResponse<{ channels: { actorIdxs: (0|1)[], states: any[] } }>
  if (!isSuccessResponse(actionRes)) {
    return []
  }
  console.log(actionRes.result);
  const channels = actionRes.result?.channels.states.map((channelState, idx) => {
    const { id: idObj, version, app, allocation, data, isFinal } = channelState;
    const id = idObj.data;
    const alloc = wire.Allocation.create(allocation);
    const state = wire.State.create({
      id,
      version,
      app,
      allocation: alloc,
      data,
      isFinal,
    })

    const channel: ChannelInfo = {
      id: channelIdToString(id),
      me: {
        publicKey,
        address: address,
      },
      peer: {
        // publicKey: peerPublicKey,
        address: 'where-to-get-the-address-from',
      },
      payload: [
        {
          // todo decode type script
          type: null,
          amount: bigintFromBEBytes(channelState.allocation?.balances?.balances[0].balance[0]!.data) / BigInt(1e8),
        },
        {
          // todo decode type script
          type: null,
          amount: bigintFromBEBytes(channelState.allocation?.balances?.balances[0].balance[1]!.data) / BigInt(1e8),
        },
      ],
      status: "connected",
      state: state,
      myPayloadIndex: actionRes.result!.channels.actorIdxs[idx],
    }

    return channel;
  }) ?? [];
  return channels;
}

export async function openChannel(publicKey: string, address: string, peerUser: PeerUser, payload: [TradePayload, TradePayload], challengeDuration: number) {
  // open channel request will return after both peer user signed transaction
  return perunServiceAction({
    type: 'open',
    payload: {
      me: getParticipantByAddressAndPubkey(address, publicKey),
      peer: getParticipantByAddressAndPubkey(peerUser.address, peerUser.publicKey),
      // todo move TradePayload process to main progress
      balances: [
        bytes.bytify(equalNumPaddedHex(BigInt(payload[0].amount * 1e8))),
        bytes.bytify(equalNumPaddedHex(BigInt(payload[1].amount * 1e8))),
      ],
      challengeDuration: Number(challengeDuration),
    },
  })
}

export async function updateChannel(channelState: wire.State, balanceIndex: number, swapAmount: number | bigint) {

  const res = await perunServiceAction({
    type: 'update',
    payload: {
      channelId: channelIdToString(channelState.id),
      // here means which asset to update
      index: balanceIndex,
      amount: swapAmount,
    },
  })


  return res;

}

export async function restoreChannels() {
  const actionRes = await perunServiceAction({
    type: 'restore',
    payload: {
      data: new Uint8Array(0),
    },
  })
  return actionRes;
}


export async function closeChannel(channelId: Uint8Array<ArrayBufferLike>) {
  return perunServiceAction({
    type: 'close',
    payload: {
      channelId,
    },
  })
}

