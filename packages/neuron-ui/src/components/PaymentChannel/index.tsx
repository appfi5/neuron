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
  isMainnet,
} from 'utils'
import { PasswordDialog } from 'components/SignAndVerify'

import styles from './perun.module.scss'

import { useTranslation } from 'react-i18next'
import Button from 'widgets/Button'
import PerunConsole from './components/Console'
import AddressSelector from './components/AddressSelector'
import { useRequest } from 'ahooks'




const PaymentChannel = () => {
  const {
    chain: { networkID },
    settings: { networks },
    wallet,
    perun: { runnerState }
  } = useGlobalState()
  const [t, _] = useTranslation()
  const [enable, setEnable] = useState(runnerState.running);
  const [publicKey, setMyPubKey] = useState(runnerState.context?.publicKey ?? "")
  const [address, setMyAddress] = useState(runnerState.context?.address ?? "")
  const isTestnet = !isMainnet(networks, networkID)

  const { loading, run: startRunner } = useRequest(async (cfg: NonNullable<Perun.RunnerStatus['context']>) => {
    const res = await perunServiceAction({ type: "start-runner", payload: cfg })
    return res;
  }, {
    manual: true,
  })

  useEffect(() => {
    if(!enable && runnerState.running) {
      setEnable(true)
    }
    if (enable && !runnerState.running) {
      setEnable(false)
    }
    if (enable && !runnerState.running && runnerState.message) {
      showErrorMessage('Error', runnerState.message);
    }
  }, [enable, runnerState.running, runnerState.message])


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
                loading={loading}
                className={styles.startButton}
                onClick={async () => {
                  if (!isTestnet) {
                    showErrorMessage('Error', t('perun.testnet-only'))
                    return;
                  }
                  await startRunner({
                    walletId: wallet.id,
                    publicKey: publicKey,
                    address: address,
                    network: isTestnet ? 'testnet' : 'mainnet',
                  })
                }}
              >
                Start
              </Button>
            </div>
          )
          : (
            <PerunConsole
              publicKey={publicKey}
              address={address}
            />
          )
      }

    </PageContainer>
  )
}

PaymentChannel.displayName = 'PaymentChannel'

export default PaymentChannel
