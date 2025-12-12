import React, { useState, useEffect, useCallback } from 'react'

import { useState as useGlobalState } from 'states'
import { bytes } from '@ckb-lumos/codec'
import { blockchain } from '@ckb-lumos/base'
import Dialog from 'widgets/Dialog'
import Table, { TableProps } from 'widgets/Table'
import PageContainer from 'components/PageContainer'
import {
  PerunIcon,
  AddSimple,
  DetailIcon,
  CkbIcon,
  InfoCircleOutlined,
  DepositTimeSort,
  PerunSend,
  PerunClose,
  LineDownArrow,
} from 'widgets/Icons/icon'
import TableNoData from 'widgets/Icons/TableNoData.png'
import { type CKBComponents } from '@ckb-lumos/lumos/rpc'
import {
  SerializeOffChainParticipant,
  SerializeSEC1EncodedPubKey,
} from 'utils/perun-wallet-wrapper/ckb/serialization'
import { channelIdToString, channelIdFromString } from 'utils/perun-wallet-wrapper/translator'
import * as wire from 'utils/perun-wallet-wrapper/wire'

import { ControllerResponse } from 'services/remote/remoteApiWrapper'
import {
  OfflineSignStatus,
  OfflineSignType,
  getCurrentWalletAccountExtendedPubKey,
  perunServiceAction,
  respondPerunRequest,
  signRawMessage,
  signTransactionOnly,
  showErrorMessage,
} from 'services/remote'
import {
  addressToScript,
  scriptToAddress,
  bytesToHex,
  ErrorCode,
  errorFormatter,
  isSuccessResponse,
  clsx,
  getParticipantByAddressAndPubkey,
} from 'utils'
import { PasswordDialog } from 'components/SignAndVerify'

import styles from './perun.module.scss'

import { useTranslation } from 'react-i18next'
import Button from 'widgets/Button'
import PerunConsole from './components/Console'
import AddressSelector from './components/AddressSelector'




const PaymentChannel = () => {
  const {
    chain: { networkID },
    settings: { networks },
    wallet,
  } = useGlobalState()
  const [t, _] = useTranslation()
  const [enable, setEnable] = useState(false);
  const [publicKey, setMyPubKey] = useState('')
  const [address, setMyAddress] = useState('')
  return (
    <PageContainer
      head={
        <div className={styles.pageHeader}>
          <PerunIcon />
          <p>{t('navbar.perun')}</p>
        </div>
      }
      className=''
    >
      {
        !enable
          ? (
            <div className={styles.startView}>
              <AddressSelector
                value={address}
                onChange={(nextAddress, nextPubKey) => {
                  setMyAddress(nextAddress)
                  setMyPubKey(nextPubKey)
                }}
              />
              <div className={styles.pubkeyContainer}>
                {
                  publicKey && (
                    <>
                      <div className={styles.title}>PublicKey</div>
                      <div>{publicKey}</div>
                    </>
                  )
                }
              </div>

              <Button
                type="primary"
                className={styles.startButton}
                // todo start channel-service-runner
                // then invoke restore-channel
                onClick={() => { setEnable(true) }}
              >
                Start
              </Button>
            </div>
          )
          : (
            <PerunConsole
              publicKey={publicKey}
              address={address}
              // todo
              onClose={() =>{}}
            />
          )
      }

    </PageContainer>
  )
}

PaymentChannel.displayName = 'PaymentChannel'

export default PaymentChannel
