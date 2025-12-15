import { perunServiceAction } from "services/remote";
import { getParticipantByAddressAndPubkey, isSuccessResponse } from "utils";
import { ControllerResponse } from "services/remote/remoteApiWrapper";
import { hexToUint8Array } from "utils/bufferConvert";


export type ChannelState = {
  id: string;
  state: Perun.ReadableMessage.State;
  actorIdx: 0 | 1;
}

// export type ChannelInfo = {
//   id: string;
//   me: PeerUser;
//   status: "connecting" | "connected" | "closed"
//   peer: PeerUser;
//   payload?: [TradePayload, TradePayload]
//   // state?: wire.State;
//   myPayloadIndex: 0 | 1;
// }
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
  }) as ControllerResponse<ChannelState[]>
  if (!isSuccessResponse(actionRes)) {
    return []
  }
  return actionRes.result ?? [];
}

export async function openChannel(publicKey: string, address: string, peerUser: PerunAPI.PeerUser, balances: PerunAPI.OpenChannelParams['balances'], challengeDuration: number) {
  // open channel request will return after both peer user signed transaction
  return perunServiceAction({
    type: 'open',
    // payload: {
    //   me: getParticipantByAddressAndPubkey(address, publicKey),
    //   peer: getParticipantByAddressAndPubkey(peerUser.address, peerUser.publicKey),
    //   // todo move TradePayload process to main progress
    //   balances: [
    //     bytes.bytify(equalNumPaddedHex(BigInt(payload[0].amount * 1e8))),
    //     bytes.bytify(equalNumPaddedHex(BigInt(payload[1].amount * 1e8))),
    //   ],
    //   challengeDuration: Number(challengeDuration),
    // },
    payload: {
      me: { publicKey, address },
      peer: peerUser,
      balances,
      challengeDuration: Number(challengeDuration),
    }
  })
}

export async function updateChannel(channelId: string, balanceIndex: number, swapAmount: number | bigint) {

  const res = await perunServiceAction({
    type: 'update',
    payload: {
      channelId: channelId,
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


export async function closeChannel(channelId: string) {
  return perunServiceAction({
    type: 'close',
    payload: {
      channelId: hexToUint8Array(channelId),
    },
  })
}

