import React, { useCallback, useMemo, useState } from 'react'
import { Slider } from 'office-ui-fabric-react'
import { Trans, useTranslation } from 'react-i18next'
import TextField from 'widgets/TextField'
import Spinner, { SpinnerSize } from 'widgets/Spinner'
import { openExternal, MultisigConfig } from 'services/remote'
import { localNumberFormatter, shannonToCKBFormatter } from 'utils'
import Dialog from 'widgets/Dialog'
import styles from './perunSendPayment.module.scss'


const NERVOS_DAO_RFC_URL =
  'https://www.github.com/nervosnetwork/rfcs/blob/master/rfcs/0023-dao-deposit-withdraw/0023-dao-deposit-withdraw.md'

const PerunSendPayment = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (swapAmount: number) => void }) => {
  const [t, { language }] = useTranslation()
  const [errorMessage, setErrorMessage] = useState('')
  const [updateAmount, setUpdateAmount] = useState<number>(0)

  const handleUpdateAmountChange = (am: string) => {
    const amountNum = parseFloat(am)
    if (Number.isNaN(amountNum)) {
      return
    }
    setUpdateAmount(amountNum)
  }

  const [isTyping, setIsTyping] = useState(false)

  const handleBlur = useCallback(() => {
    setIsTyping(false)
  }, [setIsTyping])

  const handleFocus = useCallback(() => {
    setIsTyping(true)
  }, [setIsTyping])

  return (
    <Dialog
      show
      title={t('perun.send-payment')} onCancel={onClose} className={styles.container}
      onConfirm={() => {
        onConfirm(updateAmount);
      }}
    >
      <div>
        <div className={styles.depositValueLabelWrap}>
          <label className={styles.depositValueLabel} htmlFor="depositValue">{`${t(
            'perun.enter-amount'
          )}`}</label>
        </div>
        {/* <Slider
          className={styles.slider}
          value={slidePercent}
          min={0}
          max={100}
          step={1}
          showValue={false}
          onChange={onSliderChange}
        /> */}
        <TextField
          className={styles.depositValue}
          width="100%"
          field="depositValue"
          value={isTyping ? updateAmount : localNumberFormatter(updateAmount)}
          // onChange={onChangeDepositValue}
          onChange={(event: { currentTarget: { value: string } }) => {
            handleUpdateAmountChange(event.currentTarget.value)
          }}
          onBlur={handleBlur}
          onFocus={handleFocus}
          suffix="CKB"
          required
          error={errorMessage}
        />
      </div>
    </Dialog>
  )
}

PerunSendPayment.displayName = 'PerunSendPayment'

export default PerunSendPayment
