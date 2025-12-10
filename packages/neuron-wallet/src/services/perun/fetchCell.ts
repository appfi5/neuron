import { ccc } from "@ckb-ccc/core";


const networkMap = {
  // https://testnet.ckb.dev,https://testnet.ckbapp.dev
  testnet: "https://testnet.ckb.dev",
  // https://mainnet.ckb.dev,https://mainnet.ckbapp.dev
  mainnet: "https://mainnet.ckb.dev",
} as const

const testnetService = new ccc.ClientPublicTestnet({ url: networkMap.testnet })

export async function fetchTargetCell(txhash: string, outputIndex: number) {
  const txResponse = await testnetService.getTransaction(txhash);
  const tx = txResponse?.transaction;
  if (!tx) {
    return null;
  }
  const cellInfo = tx.getOutput(outputIndex);
  const cell = {
    capacity: '0x' + cellInfo?.cellOutput.capacity.toString(16),
    lock: cellInfo?.cellOutput.lock,
    lockHash: cellInfo?.cellOutput.lock.hash(),
    // todo
    multiSignBlake160: null,
    type: cellInfo?.cellOutput.type,
    typeHash: cellInfo?.cellOutput.type?.hash(),
    data: cellInfo?.outputData,
  }
  return cell;
}