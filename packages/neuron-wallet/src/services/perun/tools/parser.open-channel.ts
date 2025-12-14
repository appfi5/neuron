import participant from "./participant"
import { mol } from "@ckb-ccc/core";
import { parseBalances } from "./tool";


export async function parseOpenChannelRequest(serializedRequest: Perun.SerializedMessage.ValidOpenChannelRequest) {
  const peer = await participant.decode(serializedRequest.participant!.addressMapping[0].address.data, "testnet");
  const readableRequest: Perun.ReadableMessage.OpenChannelRequest = {
    participant: peer,

    proposalId: "0x" + Buffer.from(serializedRequest.proposalId.data).toString("hex") as Perun.ReadableMessage.HexString,

    challengeDuration: serializedRequest.challengeDuration,

    nonceShare: Buffer.from(serializedRequest.nonceShare.data).toString("hex") as Perun.ReadableMessage.HexString,

    initBals: {
      assets: serializedRequest.initBals.assets.map(assetBuffer => {
        // todo what marshalled inside buffer if it is a udt
        return assetBuffer.data.length < 2 ? null : "1"
      }),
      balances: parseBalances(serializedRequest.initBals.balances),
    },

    fundingAgreement: {
      balances: serializedRequest.fundingAgreement.balances.map(item => {
        return {
          balance: item.balance.map(peerBalanceBuffer => {
            const data = peerBalanceBuffer.data;
            const bufferData = Array(16 - data.length).fill(0).concat(data);
            return mol.Uint128BE.decode(bufferData).toString()
          })
        }
      })
    },

    tempChannelId: Buffer.from(serializedRequest.tempChannelId.data).toString("hex") as Perun.ReadableMessage.HexString,
  }
  return readableRequest
}