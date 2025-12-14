




export function parseSignMessageRequest(serializedRequest: Perun.SerializedMessage.ValidSignMessageRequest) {
  return {
    pubkey: new TextDecoder().decode(Buffer.from(serializedRequest.pubkey.data)),
    data: "0x" + Buffer.from(serializedRequest.data.data).toString("hex"),
    tempChannelID: "0x" + Buffer.from(serializedRequest.tempChannelID.data).toString("hex"),
  } as Perun.ReadableMessage.SignMessageRequest
}