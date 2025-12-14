
import { mol } from "@ckb-ccc/core";



// export function parseBalance(serializedBalance: undefined): void
// export function parseBalance(serializedBalance: Perun.SerializedMessage.Balance): Perun.ReadableMessage.Balance
export function parseBalance(serializedBalance: Perun.SerializedMessage.Balance | undefined) {
  if (!serializedBalance) return;
  const readableBalance: Perun.ReadableMessage.Balance = {
    balance: serializedBalance.balance.map(peerBalanceBuffer => {
      const data = peerBalanceBuffer.data;
      const bufferData = Array(16 - data.length).fill(0).concat(data);
      return mol.Uint128BE.decode(bufferData).toString();
    })
  };

  return readableBalance;
}


export function parseBalances(serializedBalances: undefined): undefined
export function parseBalances(serializedBalances: Perun.SerializedMessage.Balances): Perun.ReadableMessage.Balances
export function parseBalances(serializedBalances: Perun.SerializedMessage.Balances | undefined): Perun.ReadableMessage.Balances | undefined
export function parseBalances(serializedBalances?: Perun.SerializedMessage.Balances) {
  if (!serializedBalances) return;
  const readableBalances: Perun.ReadableMessage.Balances = {
    balances: serializedBalances.balances.map(item => {
      return {
        balance: item.balance.map(peerBalanceBuffer => {
          const data = peerBalanceBuffer.data;
          const bufferData = Array(16 - data.length).fill(0).concat(data);
          return mol.Uint128BE.decode(bufferData).toString();
        })
      }
    })
  }
  return readableBalances;
}


export function parseAllocation(serializedAllocation: undefined): undefined
export function parseAllocation(serializedAllocation: Perun.SerializedMessage.Allocation): Perun.ReadableMessage.Allocation
export function parseAllocation(serializedAllocation?: Perun.SerializedMessage.Allocation | undefined): Perun.ReadableMessage.Allocation | undefined
export function parseAllocation(serializedAllocation?: Perun.SerializedMessage.Allocation) {
  if (!serializedAllocation) return;
  const readableAllocation: Perun.ReadableMessage.Allocation = {
    backends: serializedAllocation.backends.map(backend => {
      return "0x" + Buffer.from(backend.data).toString("hex") as Perun.ReadableMessage.HexString
    }),
    assets: serializedAllocation.assets.map(assetBuffer => {
      // todo what marshalled inside buffer if it is a udt
      return assetBuffer.data.length < 2 ? null : "1"
    }),
    balances: parseBalances(serializedAllocation.balances),
    locked: serializedAllocation.locked.map(lockItem => {
      return {
        id: "0x" + Buffer.from(lockItem.id.data).toString("hex") as Perun.ReadableMessage.HexString,
        bals: parseBalance(lockItem.bals),
        indexMap: lockItem.indexMap
      }
    })
  }
  return readableAllocation;
}