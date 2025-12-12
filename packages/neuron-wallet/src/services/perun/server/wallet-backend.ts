import { bytes } from '@ckb-lumos/codec'
import { UpdateNotificationRequest, SignTransactionRequest } from '../../../utils/perun-wallet-wrapper/perun-wallet'
import { WalletBackend } from '../../../utils/perun-wallet-wrapper/services'
import { ValidOpenChannelRequest, ValidSignMessageRequest } from '../../../utils/perun-wallet-wrapper/verifier'
import logger from '../../../utils/logger'

export type IPCMessageRequest = keyof WalletBackend<{}>
// | 'openChannelRequest'
// | 'updateNotificationRequest'
// | 'signMessageRequest'
// | 'signTransactionRequest'
// export type IPCMessageResponse =
//   | 'openChannelResponse'
//   | 'updateNotificationResponse'
//   | 'signMessageResponse'
//   | 'signTransactionResponse'
const log = (...messages: any[]) => {
  logger.info('IPCWalletBackend:', ...messages)
}

const genReqeustId = (prefix: string = '') => `${prefix}_${`${Math.random()}`.slice(2, 8)}`;

const stringifyBuffer = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (_, value) => {
    // if value if Buffer
    if (value?.type === 'Buffer' && value.data) {
      return "0x" + Buffer.from(value.data).toString("hex");
    }
    return value;
  }))
}

const commonHandleResponse = <APIName extends keyof WalletBackend<{}>,>(
  type: APIName,
  requestId: string,
  req: Parameters<WalletBackend<{}>[APIName]>[0],
  responseHandler = (a: any) => a
) => {
  type ReponseType = Awaited<ReturnType<WalletBackend<{}>[APIName]>>
  return new Promise<ReponseType>((resolve, reject) => {
    const res = process.send!({ type, req, requestId })
    if (!res) {
      return reject(new Error('Failed to send IPC message'))
    }
    // message from main process
    const listener = (message: { type: IPCMessageRequest; requestId: string; req: ReponseType }) => {
      if (message.type === type && message.requestId === requestId) {
        log(`resolved: [${type}]`, message);
        resolve(responseHandler(message.req))
        process.off('message', listener)
      }
    }
    process.on('message', listener)
  })

}



// The IPCWalletBackend is a WalletBackend that uses IPC to communicate with
// the wallet. It expects to be run in a separate process from the wallet but
// communicates with it via IPC.
export class IPCWalletBackend implements WalletBackend<{}> {

  openChannelRequest(req: ValidOpenChannelRequest) {
    return commonHandleResponse('openChannelRequest', genReqeustId('openChannelRequest'), stringifyBuffer(req))
  }
  // openChannelRequest(
  //   req: ValidOpenChannelRequest
  // ): Promise<{ rejected?: { reason?: string }; nonceShare?: Uint8Array }> {
  //   log("openChannelRequest", JSON.stringify(req));
  //   // Create a new Promise which resovles if the response from the IPC parent process is received.
  //   return new Promise((resolve, reject) => {
  //     // Send the request to the IPC parent process.
  //     log("sending openChannelRequest to HOST process");
  //     const res = process.send!({ type: 'openChannelRequest', req })
  //     if (!res) {
  //       return reject(new Error('Failed to send IPC message'))
  //     }

  //     // Listen for the response from the IPC parent process.
  //     // TODO: Unsubscribe from the message listener when the promise is resolved.
  //     process.on('message', (message: { type: IPCMessageResponse; req: unknown }) => {
  //       log("received HOST process response", message);
  //       if (message.type === 'openChannelResponse') {
  //         // Resolve the promise with the response.
  //         return resolve(message.req as any)
  //       }
  //     })
  //   })
  // }
  updateNotificationRequest(req: UpdateNotificationRequest) {
    return commonHandleResponse('updateNotificationRequest', genReqeustId('updateNotificationRequest'), req)
  }
  // updateNotificationRequest(req: UpdateNotificationRequest): Promise<{ accepted?: boolean | undefined }> {
  //   return new Promise((resolve, _) => {
  //     // Make sure we send the serialized state, otherwise we have to account for weird IPC serialization issues.
  //     log("updateNotificationRequest state", req.state);
  //     //const encodedState = wire.State.encode(req.state!).finish()
  //     //logger.info("wallet: updateNotificationRequest: encodedState = ", encodedState)

  //     /*const res = process.send!({
  //     //  type: 'updateNotificationRequest',
  //       req
  //     })
  //     if (!res) {
  //       return reject(new Error('Failed to send IPC message'))
  //     }*/
  //     resolve({ accepted: true })

  //     /*process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
  //       if (message.type === 'updateNotificationResponse') {
  //         return resolve(message.req as any)
  //       }
  //     })*/
  //   })
  // }

  signMessageRequest(req: ValidSignMessageRequest<{}>) {
    return commonHandleResponse(
      'signMessageRequest',
      genReqeustId('signMessageRequest'),
      stringifyBuffer(req),
      (responseData) => {
        if(responseData.signature) {
          responseData.signature = bytes.bytify(responseData.signature)
        }
        return responseData;
      }
    )
  }
  // signMessageRequest(
  //   req: ValidSignMessageRequest<{}>
  // ): Promise<{ rejected?: { reason?: string | undefined } | undefined; signature?: Uint8Array | undefined }> {
  //   return new Promise((resolve, reject) => {
  //     const res = process.send!({ type: 'signMessageRequest', req })
  //     if (!res) {
  //       return reject(new Error('Failed to send IPC message'))
  //     }

  //     process.once('message', (message: { type: IPCMessageResponse; req: any }) => {
  //       log("on signMessageRequest", message);
  //       if (message.type === 'signMessageResponse') {
  //         // logger.info('received signMessageResponse', message)
  //         // The resulting signature is string, so we convert it back into a
  //         // Uint8Array.

  //         if (message.req.rejected) {
  //           return resolve({
  //             rejected: message.req.rejected,
  //           })
  //         }
  //         return resolve({
  //           signature: bytes.bytify(message.req.signature as string),
  //         })
  //       }
  //       logger.error("signMessageRequest: message.type != 'signMessageResponse'", message)
  //     })
  //   })
  // }

  signTransactionRequest(req: SignTransactionRequest) {
    return commonHandleResponse(
      'signTransactionRequest', 
      genReqeustId('signTransactionRequest'), 
      stringifyBuffer(req),
      (responseData) => {
        if(responseData.transaction) {
          responseData.transaction = new TextEncoder().encode(responseData.transaction)
        }
        return responseData;
      }
    )
  }
  // signTransactionRequest(
  //   req: SignTransactionRequest
  // ): Promise<{ rejected?: { reason?: string | undefined } | undefined; transaction?: Uint8Array | undefined }> {
  //   return new Promise((resolve, reject) => {
  //     log('signTransactionRequest', req)
  //     // logger.info(new Uint8Array((req as any).identifier))
  //     // logger.info(new Uint8Array((req as any).transaction))
  //     const stringifiedReq: any = {
  //       identifier: new TextDecoder('utf-8').decode(new Uint8Array((req as any).identifier)),
  //       transaction: new TextDecoder('utf-8').decode(new Uint8Array((req as any).transaction)),
  //     }
  //     log('Sending signTransactionRequest', stringifiedReq)
  //     const res = process.send!({
  //       type: 'signTransactionRequest',
  //       req: stringifiedReq,
  //     })
  //     if (!res) {
  //       return reject(new Error('Failed to send IPC message'))
  //     }

  //     process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
  //       if (message.type === 'signTransactionResponse') {
  //         log('Received signTransactionResponse', message)

  //         if (message.req && (message.req as any).rejected) {
  //           return resolve({
  //             rejected: (message.req as any).rejected,
  //           })
  //         }

  //         return resolve({
  //           transaction: new TextEncoder().encode((message.req as any).transaction),
  //         })
  //       }
  //     })
  //   })
  // }
}
