import { bytes } from '@ckb-lumos/codec'
import { UpdateNotificationRequest, SignTransactionRequest } from '@ckb-connect/perun-wallet-wrapper/dist/perun-wallet'
import { WalletBackend } from '@ckb-connect/perun-wallet-wrapper/dist/services'
import { ValidOpenChannelRequest, ValidSignMessageRequest } from '@ckb-connect/perun-wallet-wrapper/dist/verifier'
import logger from '../../../utils/logger'

export type IPCMessageRequest =
  | 'openChannelRequest'
  | 'updateNotificationRequest'
  | 'signMessageRequest'
  | 'signTransactionRequest'
export type IPCMessageResponse =
  | 'openChannelResponse'
  | 'updateNotificationResponse'
  | 'signMessageResponse'
  | 'signTransactionResponse'

// The IPCWalletBackend is a WalletBackend that uses IPC to communicate with
// the wallet. It expects to be run in a separate process from the wallet but
// communicates with it via IPC.
export class IPCWalletBackend implements WalletBackend<{}> {
  openChannelRequest(
    req: ValidOpenChannelRequest
  ): Promise<{ rejected?: { reason?: string }; nonceShare?: Uint8Array }> {
    logger.info('IPCWalletBackend: openChannelRequest-----', JSON.stringify(req))
    // Create a new Promise which resovles if the response from the IPC parent process is received.
    return new Promise((resolve, reject) => {
      // Send the request to the IPC parent process.
      logger.info('IPCWalletBackend: sending openChannelRequest to HOST process')
      const res = process.send!({ type: 'openChannelRequest', req })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }

      logger.info('IPCWalletBackend: waiting for HOST process response')
      // Listen for the response from the IPC parent process.
      // TODO: Unsubscribe from the message listener when the promise is resolved.
      process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
        logger.info('IPCWalletBackend: received HOST process response', message)
        if (message.type === 'openChannelResponse') {
          // Resolve the promise with the response.
          return resolve(message.req as any)
        }
      })
    })
  }

  updateNotificationRequest(req: UpdateNotificationRequest): Promise<{ accepted?: boolean | undefined }> {
    return new Promise((resolve, _) => {
      // Make sure we send the serialized state, otherwise we have to account for weird IPC serialization issues.
      logger.info('wallet: updateNotificationRequest: state = ', req.state!)
      //const encodedState = wire.State.encode(req.state!).finish()
      //logger.info("wallet: updateNotificationRequest: encodedState = ", encodedState)

      /*const res = process.send!({
      //  type: 'updateNotificationRequest',
        req
      })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }*/
      resolve({ accepted: true })

      /*process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
        if (message.type === 'updateNotificationResponse') {
          return resolve(message.req as any)
        }
      })*/
    })
  }

  signMessageRequest(
    req: ValidSignMessageRequest<{}>
  ): Promise<{ rejected?: { reason?: string | undefined } | undefined; signature?: Uint8Array | undefined }> {
    return new Promise((resolve, reject) => {
      const res = process.send!({ type: 'signMessageRequest', req })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }

      process.once('message', (message: { type: IPCMessageResponse; req: any }) => {
        if (message.type === 'signMessageResponse') {
          logger.info('received signMessageResponse', message)
          // The resulting signature is string, so we convert it back into a
          // Uint8Array.

          if (message.req.rejected) {
            return resolve({
              rejected: message.req.rejected,
            })
          }
          return resolve({
            signature: bytes.bytify(message.req.signature as string),
          })
        }
        logger.error("signMessageRequest: message.type != 'signMessageResponse'", message)
      })
    })
  }

  signTransactionRequest(
    req: SignTransactionRequest
  ): Promise<{ rejected?: { reason?: string | undefined } | undefined; transaction?: Uint8Array | undefined }> {
    return new Promise((resolve, reject) => {
      logger.info('signTransactionRequest', req)
      logger.info(new Uint8Array((req as any).identifier))
      logger.info(new Uint8Array((req as any).transaction))
      const stringifiedReq: any = {
        identifier: new TextDecoder('utf-8').decode(new Uint8Array((req as any).identifier)),
        transaction: new TextDecoder('utf-8').decode(new Uint8Array((req as any).transaction)),
      }
      logger.info('Sending signTransactionRequest', stringifiedReq)
      const res = process.send!({
        type: 'signTransactionRequest',
        req: stringifiedReq,
      })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }

      process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
        if (message.type === 'signTransactionResponse') {
          logger.info('Received signTransactionResponse', message)

          if (message.req && (message.req as any).rejected) {
            return resolve({
              rejected: (message.req as any).rejected,
            })
          }

          return resolve({
            transaction: new TextEncoder().encode((message.req as any).transaction),
          })
        }
      })
    })
  }
}
