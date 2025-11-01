import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { bytes } from '@ckb-lumos/codec'
import { showErrorMessage, perunServiceAction } from 'services/remote'
import {
  isSuccessResponse,
  useExitOnWalletChange,
  validateAddress,
  isMainnet as isMainnetUtil,
  equalNumPaddedHex,
  getParticipantByAddressAndPubkey,
  errorFormatter,
} from 'utils'
import { isErrorWithI18n } from 'exceptions'
import { useState as useGlobalState } from 'states'
import TextField from 'widgets/TextField'
import Dialog from 'widgets/Dialog'
import Alert from 'widgets/Alert'
import styles from './perunOpenChannel.module.scss'

const PerunOpenChannel = ({ show, onClose, myPubKey }: { show: boolean; onClose?: () => void; myPubKey: string }) => {
  const [t] = useTranslation()

  const {
    chain: { networkID },
    settings: { networks },
    wallet,
  } = useGlobalState()

  const [formData, setFormData] = useState({
    myAmount: 0,
    peerAddress: '',
    peerPubKey: '',
    peerAmount: 0,
  })

  const [formErrors, setFormErrors] = useState({
    myAmount: '',
    peerAddress: '',
    peerPubKey: '',
    peerAmount: '',
  })

  const isMainnet = isMainnetUtil(networks, networkID)
  useExitOnWalletChange()

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
      const {
        dataset: { field },
        value,
      } = e.target
      switch (field) {
        case 'myAmount': {
          setFormData({ ...formData, myAmount: Number(value) })
          break
        }
        case 'peerAddress': {
          setFormData({ ...formData, peerAddress: value })

          let errText = ''
          try {
            validateAddress(value, isMainnet)
          } catch (err) {
            if (isErrorWithI18n(err)) {
              errText = t(err.message, err.i18n)
            }
          }
          setFormErrors({ ...formErrors, peerAddress: errText })
          break
        }
        case 'peerPubKey': {
          setFormData({ ...formData, peerPubKey: value })
          break
        }
        case 'peerAmount': {
          setFormData({ ...formData, peerAmount: Number(value) })
          break
        }
        default: {
          // ignore
        }
      }
    },
    [setFormData, isMainnet, t]
  )

  const handleOpenChannel = () => {
    const { myAmount, peerAddress, peerPubKey, peerAmount } = formData

    const myBalanceShannon = equalNumPaddedHex(BigInt(myAmount * 1e8))
    const peerBalanceShannon = equalNumPaddedHex(BigInt(peerAmount * 1e8))

    perunServiceAction({
      type: 'open',
      payload: {
        me: getParticipantByAddressAndPubkey(wallet.addresses[0].address, myPubKey),
        peer: getParticipantByAddressAndPubkey(peerAddress, peerPubKey),
        balances: [bytes.bytify(myBalanceShannon), bytes.bytify(peerBalanceShannon)],
        challengeDuration: Number(10000),
      },
    }).then(actionRes => {
      if (!isSuccessResponse(actionRes)) {
        showErrorMessage('Error', errorFormatter(actionRes.message, t))
      }
    })

    onClose?.()
  }

  return (
    <Dialog
      show={show}
      title={t('perun.open-channel')}
      onCancel={onClose}
      onConfirm={handleOpenChannel}
      confirmText={t('perun.open-channel')}
      contentClassName={styles.contentClassName}
    >
      <div className={styles.container}>
        <Alert status="warn" className={styles.notification}>
          {t('perun.open-channel-notification')}
        </Alert>

        <div className={styles.mainContent}>
          <TextField label="My Public Key" disabled value={myPubKey} />
          <TextField
            field="myAmount"
            label="My Amount"
            value={formData.myAmount}
            onChange={handleInputChange}
            error={formErrors.myAmount}
          />
          <TextField
            field="peerPubKey"
            label="Peer Public Key"
            value={formData.peerPubKey}
            onChange={handleInputChange}
            error={formErrors.peerPubKey}
          />
          <TextField
            field="peerAddress"
            label="Peer Address"
            rows={formData.peerAddress ? 2 : 1}
            value={formData.peerAddress}
            onChange={handleInputChange}
            error={formErrors.peerAddress}
          />
          <TextField
            field="peerAmount"
            label="Peer Amount"
            value={formData.peerAmount}
            onChange={handleInputChange}
            error={formErrors.peerAmount}
          />
        </div>
      </div>
    </Dialog>
  )
}

PerunOpenChannel.displayName = 'PerunOpenChannel'

export default PerunOpenChannel
