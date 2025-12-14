
import CellsService from '../../../services/cells'
import OutPoint from '../../../models/chain/out-point'
import Input from '../../../models/chain/input'
// import Script from '../../../models/chain/script'
import Transaction from '../../../models/chain/transaction'
// import RpcService from '../../../services/rpc-service'
import NetworksService from '../../networks'
import { fetchTargetCell } from '../fetchCell'
import { ccc, ClientPublicMainnet, ClientPublicTestnet, ScriptLike } from '@ckb-ccc/core'
// import { NetworkType } from '../../../models/network'
import { LIGHT_CLIENT_TESTNET } from '../../../utils/const'

export async function parseSignTransactionRequest(serializedRequest: Perun.SerializedMessage.SignTransactionRequest) {

  const network = NetworksService.getInstance().getCurrent()
  // const isLightClient = network.type === NetworkType.Light
  const isTestnet = network.chain === LIGHT_CLIENT_TESTNET
  // const rpcService = new RpcService(network.remote, network.type)
  console.log("network:", network);

  const scriptStr = new TextDecoder("utf-8").decode(Buffer.from(serializedRequest.identifier.data))
  const sdkScript = JSON.parse(scriptStr, snakeCaseToCamelCase) as ScriptLike;
  // todo
  const address = ccc.Address.fromScript(sdkScript, isTestnet ? new ClientPublicTestnet() : new ClientPublicMainnet()).toString();

  const txStr = new TextDecoder("utf-8").decode(Buffer.from(serializedRequest.transaction.data));
  // TODO: The transaction here has unresolved inputs, which are only referenced by their outpoints.
  // - Transaction.inputs have to be resolved.
  // - Transaction.computeHash() has to work.
  // -> Rest seems fine. src/models/chain/transaction.ts
  // logger.info('PerunServiceRunner received signTransactionRequest:sdkScript', sdkScript)
  let sdkTx = JSON.parse(txStr, snakeCaseToCamelCase)
  // logger.info('PerunServiceRunner received signTransactionRequest:sdkTx', sdkTx)
  // Fetch live cells from txs input-outpoints.
  let resolvedInputs = []

  for (const [idx, input] of sdkTx.txView.inputs.entries()) {
    let typedInput = input as { previousOutput: { txHash: string; index: string }; since: string }
    // logger.info('Fetching live cell', input.previousOutput)
    // Try to fetch the live cell from the database multiple times before giving up.
    let retries = 0
    const delay = 5_000 // 5 seconds
    let liveCell = undefined
    while (retries < 25) {
      const fetchedCell = await CellsService.getLiveCell(OutPoint.fromObject(input.previousOutput))
      // const outputs = await CellsService.getOutputsByTransactionHash(input.previousOutput.txHash)
      // logger.info('fetched outputs:', outputs)
      // const tx = await TransactionsService.get(input.previousOutput.txHash)
      // logger.info('fetched tx:', tx)
      if (fetchedCell) {
        liveCell = fetchedCell
        break
      }
      // logger.info('USING RPC-SERVICE')
      // const rpcTip = await rpcService.getTipHeader()
      // logger.info('TIP:', rpcTip)
      // const rpcTx = await rpcService.getTransaction(input.previousOutput.txHash)
      // const rpcTx = network.type === NetworkType.Light
      //   // light rpc did't include the tx of peer A user
      //   ? await (await (rpcService.rpc as LightRPC).fetchTransaction(input.previousOutput.txHash)).txWithStatus
      //   : await rpcService.getTransaction(input.previousOutput.txHash)
      // const targetCell = rpcTx?.transaction?.outputs[Number(input.previousOutput.index)]
      // logger.info('RPC-TX:', rpcTx)
      // todo Full Node Use RPC Service
      const targetCell = await fetchTargetCell(isTestnet ? "testnet" : "mainnet", input.previousOutput.txHash, input.previousOutput.index);
      // console.log("iCell", targetCell);

      if (targetCell) {
        liveCell = targetCell; // rpcTx.transaction.outputs[Number(input.previousOutput.index)]
        break
      }
      // logger.info(`Failed to fetch live cell, retrying in ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
      retries++
    }

    if (!liveCell) {
      throw new Error('Failed to fetch live cell')
      // return reject(new Error('Failed to fetch live cell'))
    }

    const resolvedInput = Input.fromObject({
      previousOutput: OutPoint.fromObject(typedInput.previousOutput),
      since: typedInput.since,
      capacity: liveCell.capacity,
      // @ts-ignore
      lock: liveCell.lock,
      // @ts-ignore
      lockHash: liveCell.lockHash,
      // @ts-ignore
      multiSignBlake160: liveCell.multiSignBlake160,
      // @ts-ignore
      type: liveCell.type,
      // @ts-ignore
      typeHash: liveCell.typeHash,
      // @ts-ignore
      data: liveCell.data,
    })
    resolvedInput.setInputIndex(idx.toString())
    resolvedInputs.push(resolvedInput)
  }
  // logger.info('Resolved inputs', resolvedInputs)
  // logger.info('Transformed request', { sdkScript, sdkTx: JSON.stringify(sdkTx) })
  const identifier = address;
  const transaction = Transaction.fromSDK(sdkTx.txView)
  // Update the transaction with the resolved inputs.
  // Has to happen after `fromSDK` call, because `fromSDK` expects less
  // data than available and ignores the resolved inputs completely.
  transaction.inputs = resolvedInputs
  // logger.info(`tx hash: ${transaction.computeHash()}`)

  return {
    identifier: identifier,
    transaction: transaction,
  } as Perun.ReadableMessage.SignTransactionRequest
}

function snakeCaseToCamelCase(_: string, value: any): any {
  if (Array.isArray(value)) {
    return value.map(item => snakeCaseToCamelCase(_, item))
  }

  const toCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, function (_, group1) {
      return group1.toUpperCase()
    })
  }

  if (typeof value === 'object' && value !== null) {
    const camelCasedObject: any = {}
    for (const originalKey in value) {
      if (value.hasOwnProperty(originalKey)) {
        const camelCasedKey = toCamelCase(originalKey)
        const originalValue = value[originalKey]
        const newValue = camelCasedKey === 'depType' ? toCamelCase(originalValue) : originalValue
        camelCasedObject[camelCasedKey] = newValue
      }
    }
    return camelCasedObject
  }
  return value
}