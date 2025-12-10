import { perunServiceAction } from "services/remote";
import { getParticipantByAddressAndPubkey, isSuccessResponse } from "utils";
import * as wire from "utils/perun-wallet-wrapper/wire";


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
  })
  if (!isSuccessResponse(actionRes)) {
    return []
  }
  const channelStates = actionRes.result.channels.states.map(channelState => {
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
    return state;
  });
  return channelStates as wire.State[];
}

export async function updateChannel(channelId: string, swapAmount: number) {

  const res = await perunServiceAction({
    type: 'update',
    payload: {
      channelId: channelId,
      // todo 找到正确属于己方的balance
      index: 0,
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