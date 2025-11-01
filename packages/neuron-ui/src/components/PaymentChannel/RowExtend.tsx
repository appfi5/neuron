import React, { useCallback, useEffect, useState } from 'react'
import { showPageNotice, useDispatch } from 'states'
import { openExternal, perunServiceAction, showErrorMessage } from 'services/remote'

import {
  clsx,
  equalNumPaddedHex,
  getExplorerUrl,
  isSuccessResponse,
  localNumberFormatter,
  RoutePath,
  useLocalDescription,
} from 'utils'
import { TableProps } from 'widgets/Table'
import { useNavigate } from 'react-router-dom'
import { ExplorerIcon, Copy, DetailIcon } from 'widgets/Icons/icon'
import { useTranslation } from 'react-i18next'
import Dialog from 'widgets/Dialog'
import TextField from 'widgets/TextField'
import ShowOrEditDesc from 'widgets/ShowOrEditDesc'
import Tooltip from 'widgets/Tooltip'
import AmendPendingTransactionDialog from 'components/AmendPendingTransactionDialog'
import { getTransaction as getOnChainTransaction } from 'services/chain'

import Button from 'widgets/Button'
import styles from './perun.module.scss'

const RowExtend = ({ channel }: { channel: State.PerunChannel }) => {
  const dispatch = useDispatch()
  const [t] = useTranslation()
  const [updateChannelDialog, setUpdateChannelDialog] = useState(false)
  const [updateAmount, setUpdateAmount] = useState<number>(0)

  const handleCloseChannel = async (channelId: string) => {
    console.log('handleCloseChannel-----', channelId)
    const res = await perunServiceAction({
      type: 'close',
      payload: {
        channelId,
      },
    })

    if (!isSuccessResponse(res)) {
      // handleRejected(res.message as string)
      return
    }
    console.log('handleCloseChannel-----res-----', res)
    // channels.delete(channelIdToString(res.result.channelId))
  }

  const handleUpdateChannel = async (channelId: string, swapAmount: number) => {
    console.log('handleUpdateChannel-----', channelId, swapAmount)

    const res = await perunServiceAction({
      type: 'update',
      payload: {
        channelId,
        index: 0,
        amount: equalNumPaddedHex(BigInt(swapAmount * 1e8)),
      },
    })
    console.log('HANDLE UPDATE CHANNEL RES: ', res)
    if (!isSuccessResponse(res)) {
      // handleRejected(res.message as string)
      return
    }
    // If we could update the chanenl, we cache the updated channel state.
    const updatedChannelState = res.result.state
    console.log('updatedChannelState-----', updatedChannelState)
    // const channel = channels.get(channelIdToString(channelId))
    if (!channel) {
      showErrorMessage('Error', `channel ${channelId} not found`)
      // return
    }
    // channel.version = updatedChannelState.version
    // channel.allocation = updatedChannelState.allocation
    // channel.isFinal = updatedChannelState.isFinal
  }

  const handleUpdateAmountChange = (am: string) => {
    const amountNum = parseFloat(am)
    if (Number.isNaN(amountNum)) {
      return
    }
    setUpdateAmount(amountNum)
  }

  return (
    <div>
      <Button type="text" onClick={() => handleCloseChannel(channel.channelId)}>
        Close
      </Button>
      <Button type="text" onClick={() => setUpdateChannelDialog(true)}>
        Update Channel
      </Button>

      <Dialog
        show={updateChannelDialog}
        showFooter={false}
        onClose={() => {
          setUpdateChannelDialog(false)
        }}
      >
        <p>{t(`perun.enter-amount`)}</p>
        <div className={styles.formGroup}>
          <p className={styles.formLabel}>Amount:</p>
          <TextField
            type="number"
            value={updateAmount || ''}
            onChange={(event: { currentTarget: { value: string } }) => {
              handleUpdateAmountChange(event.currentTarget.value)
            }}
          />
          <span className={styles.formText}>CKB</span>
        </div>
        <Button
          className={styles.updateButton}
          onClick={() => {
            setUpdateChannelDialog(false)
            handleUpdateChannel(channel.channelId, updateAmount!)
          }}
        >
          {t(`perun.update-channel`)}
        </Button>
      </Dialog>
    </div>
  )
}

export default RowExtend
