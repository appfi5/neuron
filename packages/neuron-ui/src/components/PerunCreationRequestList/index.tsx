import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  showErrorMessage,
  signMessage,
  verifyMessage,
  OfflineSignStatus,
  OfflineSignType,
  getCurrentWalletAccountExtendedPubKey,
  perunServiceAction,
  respondPerunRequest,
  signRawMessage,
  signTransactionOnly,
} from 'services/remote'

import { ControllerResponse } from 'services/remote/remoteApiWrapper'
import {
  bytesToHex,
  ErrorCode,
  isMainnet as isMainnetUtil,
  isSuccessResponse,
  errorFormatter,
  scriptToAddress,
  clsx,
} from 'utils'
import { useDispatch } from 'states'
import Tooltip from 'widgets/Tooltip'
import { PartnerIcon, CkbIcon } from 'widgets/Icons/icon'
import Button from 'widgets/Button'
import Dialog from 'widgets/Dialog'
import { PasswordDialog } from 'components/SignAndVerify'
import { deletePerunRequest } from 'states/stateProvider/actionCreators'
import styles from './perunCreationRequestList.module.scss'
import { getCompatibleTx } from './utils'
import Token from 'components/PaymentChannel/components/Token'

type PerunRequestListProps = {
  requests: Perun.ReadableMessage.Request[]
  onCancel: () => void
  walletID: string
  onOpenChannel: (request: Perun.ReadableMessage.OpenChannelRequest) => void
  onUpdateChannel: (request: Perun.ReadableMessage.UpdateNotificationRequest) => void
}

export const PerunCreationRequestList = (props: PerunRequestListProps) => {
  const {
    requests,
    onCancel,
    walletID,
    onOpenChannel,
    onUpdateChannel,
  } = props
  const [t] = useTranslation()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<Perun.ReadableMessage.Request | null>(null)
  const dispatch = useDispatch()

  const rejectPerunRequest = async (request: Perun.ReadableMessage.Request, reason: string) => {
    deletePerunRequest(request)(dispatch)
    await respondPerunRequest({
      type: request.type,
      response: {
        rejected: {
          reason,
        },
        data: undefined,
      },
    })
  }

  const renderPerunRequest = (perunRequest: Perun.ReadableMessage.Request) => {
    switch (perunRequest.type) {
      case "OpenChannel": {
        // console.log("PerunCreationRequestList open channel", perunRequest.request);
        const request = perunRequest.request;
        const address = request.participant.address;
        return (
          <>
            <h3 className='my-0'>Open Channel Request from {address.slice(0, 10)}...{address.slice(-10)}</h3>
            <p>{`Channel ID: ${request.proposalId}`}</p>
            <div className='flex flex-row gap-4 mt-2'>
              <div>
                <div className='text-secondary'>My Token Locked</div>
                <div className='mt-1'><Token type={null} amount={request.initBals.balances.balances[0].balance[1]} /></div>
              </div>
              <div>
                <div className='text-secondary'>Peer Token Locked</div>
                <div className='mt-1'><Token type={null} amount={request.initBals.balances.balances[0].balance[0]} /></div>
              </div>
            </div>
          </>
        )
      }
      case 'SignMessage': {
        const request = perunRequest.request
        const address = request.pubkey
        // const content = bytesToHex(new Uint8Array(request.request.data.data))
        return (
          <h2 className={styles.content}>
            <Tooltip tip={address} showTriangle placement="top">
              <PartnerIcon />
            </Tooltip>
            <p className={styles.address}>
              {address.slice(0, 6)}...{address.slice(-6)}
            </p>
            {/* <CkbIcon />
              <p>CKB</p>
              <p className={styles.amount}>34,000.1</p> */}
            {perunRequest.type}
          </h2>
        )
      }
      case 'SignTransaction': {
        const request = perunRequest.request as State.PerunSignTransactionRequest
        const { identifier: address, transaction } = request
        // const content = JSON.stringify(transaction)
        return (
          <h2 className={styles.content}>
            <Tooltip tip={address} showTriangle placement="top">
              <PartnerIcon />
            </Tooltip>
            <p className={styles.address}>
              {address.slice(0, 6)}...{address.slice(-6)}
            </p>
            {/* <CkbIcon />
              <p>CKB</p>
              <p className={styles.amount}>34,000.1</p> */}
            {perunRequest.type}
          </h2>
        )
      }
      case "UpdateNotification": {
        console.log('UpdateNotification request: ', perunRequest.request)
        const channelState = perunRequest.request.state;
        return (
          <>
            <h3 className='my-0'>Update Notification</h3>
            <p>{`Channel ID: ${channelState?.id}`}</p>
            <div className='flex flex-row gap-4 mt-2'>
              <div>
                <div className='text-secondary'>Who's Token Locked</div>
                <div className='mt-1'>
                  <Token type={null} amount={channelState?.allocation?.balances?.balances[0].balance[0] ?? "0"} />
                </div>
              </div>
              <div>
                <div className='text-secondary'>Who's Token Locked</div>
                <div className='mt-1'>
                  <Token type={null} amount={channelState?.allocation?.balances?.balances[0].balance[1] ?? "0"} />
                </div>
              </div>
            </div>
            <div>
              isFinal: {channelState?.isFinal === true ? 'true' : 'false'}
            </div>
          </>
        )
      }
      // case 'UpdateNotification': {
      //   console.log('UpdateNotification request: ', state.request)
      //   const ps = state.request.state
      //   const id = ps.id.data
      //   const { version } = ps
      //   const alloc = wire.Allocation.create({
      //     assets: [new Uint8Array(32)],
      //     balances: wire.Balances.create({
      //       balances: [
      //         {
      //           balance: [
      //             ps.allocation.balances.balances[0].balance[0].data,
      //             ps.allocation.balances.balances[0].balance[1].data,
      //           ],
      //         },
      //       ],
      //     }),
      //     locked: [],
      //   })
      //   const { isFinal } = ps
      //   return (
      //     <>
      //       <h3>Update Notification</h3>
      //       <p>{`Channel ID: ${channelIdToString(id)}`}</p>
      //       <p>{`State: `}</p>
      //       <p>{`Version: ${version}`}</p>
      //       <p>{`Balances: A: ${bigintFromBEBytes(alloc.balances?.balances[0].balance[0]!)}, B: ${bigintFromBEBytes(
      //         alloc.balances?.balances[0].balance[1]!
      //       )}`}</p>
      //       <p>{`IsFinal: ${isFinal}`}</p>
      //     </>
      //   )
      // }
      default:
        return null
    }
  }
  const handleOpenChannelRequest = async (perunRequest: Perun.ReadableMessage.Request & { type: "OpenChannel" }) => {
    onOpenChannel(perunRequest.request)
    deletePerunRequest(perunRequest)(dispatch)
    await respondPerunRequest({
      type: "OpenChannel",
      response: {
        data: true,
      },
    })
    setCurrentRequest(null)
  }
  const handleUpdateNotificatoinRequest = async (perunRequest: Perun.ReadableMessage.Request & { type: "UpdateNotification" }) => {
    onUpdateChannel(perunRequest.request)
    deletePerunRequest(perunRequest)(dispatch)
    await respondPerunRequest({
      type: "UpdateNotification",
      response: {
        data: true,
      },
    })
    setCurrentRequest(null)
  }

  const handleSigningRequest = async (password: string) => {



    const handleSignMessage = async (perunRequest: Perun.ReadableMessage.Request) => {
      const request = perunRequest.request as Perun.ReadableMessage.SignMessageRequest
      // Uint8Array -> String
      const address = request.pubkey
      console.log('signing request for address----------', address)
      // const msgToSign = bytesToHex(new Uint8Array(request.data.data))
      // TODO: It would be nice to have a decoder for the Perun encoded messages.
      // We could fetch the channel state here, display it to the user AND update
      // the state cache upon successful signing.

      const res: ControllerResponse = await signRawMessage({
        walletID,
        address,
        message: request.data,
        password,
      })

      // console.log(`handleSigningRequest: message to sign---------: ${msgToSign}`)

      if (isSuccessResponse(res)) {
        deletePerunRequest(perunRequest)(dispatch)
        await respondPerunRequest({
          type: 'SignMessage',
          response: {
            data: res.result,
          },
        })
      } else if (res.status === ErrorCode.PasswordIncorrect) {
        showErrorMessage('Error', 'Password incorrect')
      } else if (res.status === ErrorCode.AddressNotFound) {
        showErrorMessage('Error', 'Address not found')
      }
      setShowPasswordDialog(false)
      return res
    }

    const handleSignTransaction = async (perunRequest: Perun.ReadableMessage.Request) => {
      const request = perunRequest.request as State.PerunSignTransactionRequest
      console.log('handleSignTransaction', request)
      console.log('inputs', request.transaction.inputs)
      const offlineTx = {
        transaction: { ...request.transaction, fee: '1' },
        status: OfflineSignStatus.Unsigned,
        type: OfflineSignType.Regular,
        description: 'Perun channel transaction',
        walletID,
        password,
      }
      console.log(`trying to sign with wallet ${walletID}`)
      const res: ControllerResponse = await signTransactionOnly(offlineTx as any)

      if (!isSuccessResponse(res)) {
        showErrorMessage('Error', errorFormatter(res.message, t))
        return res
      }

      console.log('sign transaction success')

      // Bring into backend compatible JSON format.
      const sdkTx = res.result.transaction

      const compatibleTx = getCompatibleTx(sdkTx)

      deletePerunRequest(perunRequest)(dispatch)
      await respondPerunRequest({
        type: 'SignTransaction',
        response: {
          data: JSON.stringify(compatibleTx),
        },
      })
      setCurrentRequest(null)
      setShowPasswordDialog(false)
      return res
    }

    if (!currentRequest) {
      return Promise.reject(new Error('No request selected'))
    }

    switch (currentRequest.type) {
      // case "OpenChannel":
      //   return handleOpenChannelRequest(currentRequest)
      case 'SignMessage':
        return handleSignMessage(currentRequest)
      case 'SignTransaction':
        return handleSignTransaction(currentRequest)
      // case "UpdateNotification":
      //   return handleUpdateNotificatoinRequest(currentRequest);
      default:
    }
  }

  return (
    <div>
      <Dialog show title={t('perun.channel-creation-request-list')} showFooter={false} onCancel={onCancel}>
        <div className={styles.container}>
          {requests.map(request => (
            <div
              key={request.request}
              className={clsx(styles.cellWrap, request.type === "OpenChannel" || request.type === "UpdateNotification" ? "flex-col" : "flex-row")}
            >
              {renderPerunRequest(request)}
              <div className={styles.creationRequestBtnWrap}>
                <Button type="cancel" onClick={() => rejectPerunRequest(request, 'User rejected')}>
                  {t('perun.reject')}
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setCurrentRequest(request)
                    if (request.type === "OpenChannel") {
                      handleOpenChannelRequest(request)
                      return;
                    }
                    if (request.type === "UpdateNotification") {
                      handleUpdateNotificatoinRequest(request)
                      return;
                    }
                    setShowPasswordDialog(true)
                  }}
                >
                  {t('perun.accept')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Dialog>
      {showPasswordDialog && currentRequest && (
        <PasswordDialog
          show
          walletName=""
          onSubmit={pass => handleSigningRequest(pass).catch(err => rejectPerunRequest(currentRequest, err.message))}
          onCancel={() => setShowPasswordDialog(false)}
        />
      )}
    </div>
  )
}

PerunCreationRequestList.displayName = 'PerunCreationRequestList'

export default PerunCreationRequestList
