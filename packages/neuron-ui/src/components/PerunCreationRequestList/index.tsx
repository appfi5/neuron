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
import { type CKBComponents } from '@ckb-lumos/lumos/rpc'
import { ControllerResponse } from 'services/remote/remoteApiWrapper'
import {
  bytesToHex,
  ErrorCode,
  isMainnet as isMainnetUtil,
  isSuccessResponse,
  errorFormatter,
  bigIntStringToHex,
  scriptToAddress,
} from 'utils'
import { useDispatch } from 'states'
import Tooltip from 'widgets/Tooltip'
import { PartnerIcon, CkbIcon } from 'widgets/Icons/icon'
import Button from 'widgets/Button'
import Dialog from 'widgets/Dialog'
import { PasswordDialog } from 'components/SignAndVerify'
import { deletePerunRequest } from 'states/stateProvider/actionCreators'
import styles from './perunCreationRequestList.module.scss'

export const PerunCreationRequestList = ({
  requests,
  onCancel,
  walletID,
}: {
  requests: State.PerunRequest[]
  onCancel: () => void
  walletID: string
}) => {
  const [t] = useTranslation()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [currentRequest, setCurrentRequest] = useState<State.PerunRequest | null>(null)
  const dispatch = useDispatch()

  const rejectPerunRequest = async (request: State.PerunRequest, reason: string) => {
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

  const renderPerunRequest = (perunRequest: State.PerunRequest) => {
    switch (perunRequest.type) {
      case 'SignMessage': {
        const request = perunRequest.request as State.PerunSignMessageRequest
        const addressBytes = request.pubkey.data
        const address = new TextDecoder().decode(new Uint8Array(addressBytes))
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
        const { identifier, transaction } = request
        const address = scriptToAddress(identifier, { isMainnet: false })
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

  const handleSigningRequest = async (password: string) => {
    const handleSignMessage = async (perunRequest: State.PerunRequest) => {
      const request = perunRequest.request as State.PerunSignMessageRequest
      const addressBytes = request.pubkey.data
      // Uint8Array -> String
      const address = new TextDecoder().decode(new Uint8Array(addressBytes))
      console.log('signing request for address----------', address)
      const msgToSign = bytesToHex(new Uint8Array(request.data.data))
      // TODO: It would be nice to have a decoder for the Perun encoded messages.
      // We could fetch the channel state here, display it to the user AND update
      // the state cache upon successful signing.

      const res: ControllerResponse = await signRawMessage({
        walletID,
        address,
        message: msgToSign,
        password,
      })

      console.log(`handleSigningRequest: message to sign---------: ${msgToSign}`)

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

    const handleSignTransaction = async (perunRequest: State.PerunRequest) => {
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
      const camelToSnakeReplacer = (s: string) => {
        return s.replace(/([A-Z])/g, '_$1').toLowerCase()
      }
      const camelToSnakeCloner = (obj: any, valueModifier: (key: any, value: any) => [any, any]) => {
        return Object.keys(obj).reduce((acc: any, key) => {
          const newKey = camelToSnakeReplacer(key)
          const val = obj[key as keyof CKBComponents.Transaction]
          if (Array.isArray(val)) {
            acc[newKey] = val.map((v: any) => {
              if (typeof v === 'object' && v !== null) {
                return camelToSnakeCloner(v, valueModifier)
              }
              // eslint-disable-next-line @typescript-eslint/no-shadow
              const [_, modVal] = valueModifier('', v)
              return modVal
            })
          } else if (typeof val === 'object' && val !== null) {
            acc[newKey] = camelToSnakeCloner(val, valueModifier)
          } else {
            const [modKey, modVal] = valueModifier(newKey, val)
            acc[modKey] = modVal
          }
          return acc
        }, {})
      }
      const compatibleTx = camelToSnakeCloner(sdkTx, (key: any, value: any) => {
        let newValue = value
        switch (key) {
          case 'dep_type':
            newValue = camelToSnakeReplacer(value)
            break
          case 'since':
            newValue = `0x${value}`
            break
          case 'input_index':
            newValue = `0x${value}`
            break
          case 'index':
            newValue = `0x${value}`
            break
          case 'capacity':
            newValue = bigIntStringToHex(value)
            break
          case 'version':
            newValue = `0x${value}`
            break
          default:
        }
        return [key, newValue]
      })

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
      case 'SignMessage':
        return handleSignMessage(currentRequest)
      case 'SignTransaction':
        return handleSignTransaction(currentRequest) as any
      default:
    }
  }

  return (
    <div>
      <Dialog show title={t('perun.channel-creation-request-list')} showFooter={false} onCancel={onCancel}>
        <div className={styles.container}>
          {requests.map(request => (
            <div className={styles.cellWrap} key={request.request}>
              {renderPerunRequest(request)}
              <div className={styles.creationRequestBtnWrap}>
                <Button type="cancel" onClick={() => rejectPerunRequest(request, 'User rejected')}>
                  {t('perun.reject')}
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setCurrentRequest(request)
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
