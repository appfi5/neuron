
import { mol } from "@ckb-ccc/core";



// export function parseBalance(serializedBalance: undefined): void
// export function parseBalance(serializedBalance: Perun.SerializedMessage.Balance): Perun.ReadableMessage.Balance
export function parseBalance(serializedBalance: Perun.SerializedMessage.Balance<Uint8Array | Perun.SerializedMessage.SerializedBuffer> | undefined) {
  if (!serializedBalance) return;
  const readableBalance: Perun.ReadableMessage.Balance = {
    balance: serializedBalance.balance.map(peerBalanceBuffer => {
      const data = Array.from(toUint8Array(peerBalanceBuffer));
      const bufferData = Array(16 - data.length).fill(0).concat(data);
      return mol.Uint128BE.decode(bufferData).toString();
    })
  };

  return readableBalance;
}


export function parseBalances(serializedBalances: undefined): undefined
export function parseBalances(serializedBalances: Perun.SerializedMessage.Balances<Uint8Array | Perun.SerializedMessage.SerializedBuffer>): Perun.ReadableMessage.Balances
export function parseBalances(serializedBalances: Perun.SerializedMessage.Balances<Uint8Array | Perun.SerializedMessage.SerializedBuffer> | undefined): Perun.ReadableMessage.Balances | undefined
export function parseBalances(serializedBalances?: Perun.SerializedMessage.Balances<Uint8Array | Perun.SerializedMessage.SerializedBuffer>) {
  if (!serializedBalances) return;
  const readableBalances: Perun.ReadableMessage.Balances = {
    balances: serializedBalances.balances.map(item => {
      return {
        balance: item.balance.map(peerBalanceBuffer => {
          const data = Array.from(toUint8Array(peerBalanceBuffer));
          const bufferData = Array(16 - data.length).fill(0).concat(data);
          return mol.Uint128BE.decode(bufferData).toString();
        })
      }
    })
  }
  return readableBalances;
}


export function parseAllocation(serializedAllocation: undefined): undefined
export function parseAllocation(serializedAllocation: Perun.SerializedMessage.Allocation<Uint8Array | Perun.SerializedMessage.SerializedBuffer>): Perun.ReadableMessage.Allocation
export function parseAllocation(serializedAllocation?: Perun.SerializedMessage.Allocation<Uint8Array | Perun.SerializedMessage.SerializedBuffer> | undefined): Perun.ReadableMessage.Allocation | undefined
export function parseAllocation(serializedAllocation?: Perun.SerializedMessage.Allocation<Uint8Array | Perun.SerializedMessage.SerializedBuffer>) {
  if (!serializedAllocation) return;
  const readableAllocation: Perun.ReadableMessage.Allocation = {
    backends: serializedAllocation.backends.map(backend => {
      return "0x" + toBuffer(backend).toString("hex") as Perun.ReadableMessage.HexString
    }),
    assets: serializedAllocation.assets.map(assetBuffer => {
      // todo what marshalled inside buffer if it is a udt
      const buf = toBuffer(assetBuffer);
      if(buf.length > 2) {
        console.log("trigger unknown asset")
      }
      return buf.length < 2 ? null : "1"
    }),
    balances: parseBalances(serializedAllocation.balances),
    locked: serializedAllocation.locked.map(lockItem => {
      return {
        id: "0x" + toBuffer(lockItem.id).toString("hex") as Perun.ReadableMessage.HexString,
        bals: parseBalance(lockItem.bals),
        indexMap: lockItem.indexMap
      }
    })
  }
  return readableAllocation;
}


function toUint8Array(data: Uint8Array | Perun.SerializedMessage.SerializedBuffer) {
  return data instanceof Uint8Array ? data : new Uint8Array(data.data);
}

function toBuffer(data: Uint8Array | Perun.SerializedMessage.SerializedBuffer) {
  return data instanceof Uint8Array ? Buffer.from(data) : Buffer.from(data.data);
}


export function parseState(serializedState: Perun.SerializedMessage.State<Uint8Array | Perun.SerializedMessage.SerializedBuffer>) {

  const readableState: Perun.ReadableMessage.State = {
    id: "0x" + toBuffer(serializedState.id).toString("hex"),
    version: serializedState.version,
    allocation: parseAllocation(serializedState.allocation),
    app: "0x" + toBuffer(serializedState.app).toString("hex"),
    data: "0x" + toBuffer(serializedState.app).toString("hex"),
    isFinal: serializedState.isFinal,
  }
  return readableState;
}