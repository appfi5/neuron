
import { parseAllocation } from "./tool";

export function parseUpdateNotificationRequest(
  request: Perun.SerializedMessage.UpdateNotificationRequest,
) {

  if (!request.state) {
    return {} as Perun.ReadableMessage.UpdateNotificationRequest;
  }
  const serializedState = request.state;

  const readableReq: Perun.ReadableMessage.UpdateNotificationRequest = {
    state: {
      id: "0x" + Buffer.from(serializedState.id.data).toString("hex") as Perun.ReadableMessage.HexString,
      version: serializedState.version,
      app: "0x" + Buffer.from(serializedState.app.data).toString("hex") as Perun.ReadableMessage.HexString,
      allocation: parseAllocation(serializedState.allocation),
      data: "0x" + Buffer.from(serializedState.data.data).toString("hex") as Perun.ReadableMessage.HexString,
      isFinal: serializedState.isFinal,
    }
  }

  return readableReq;
}





