import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useState as useGlobalState } from 'states'
import { bytes } from '@ckb-lumos/codec'
import { blockchain } from '@ckb-lumos/base'
import Dialog from 'widgets/Dialog'
import Table, { TableProps } from 'widgets/Table'
import { Download, Search, ArrowNext, Clean, ArrowUp, ArrowDown } from 'widgets/Icons/icon'
import Button from 'widgets/Button'
import Switch from 'widgets/Switch'
import Tooltip from 'widgets/Tooltip'
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
import PerunCreationRequestList from 'components/PerunCreationRequestList'
import PerunLockedInChannels from 'components/PerunLockedInChannels'
import PerunCloseChannel from 'components/PerunCloseChannel'
import PerunOpenChannel from 'components/PerunOpenChannel'
import styles from './perun.module.scss'
import ChannelCard from './components/ChannelCard'
import { useInterval, useRequest } from 'ahooks'
import { getChannels } from './api'

enum DialogType {
  creationRequest = 'creationRequest',
  lockedInChannels = 'lockedInChannels',
  closeChannel = 'closeChannel',
  send = 'send',
  openChannel = 'openChannel',
}

const PaymentChannel = () => {
  const {
    wallet,
    perun: { requests }, // channels
  } = useGlobalState()
  const [t, _] = useTranslation()
  const [dialogType, setDialogType] = useState<DialogType | undefined>(undefined)

  const [myPubKey, setMyPubKey] = useState<string>('')


  const { data: channels = [], run: syncChannels } = useRequest(async () => {
    const list = await getChannels(myPubKey, wallet.addresses[0].address)
    return list;
  }, {
    ready: !!myPubKey, //  && (wallet.addresses.length > 0)
    manual: true,
  })

  useInterval(syncChannels, !!myPubKey ? 5000 : 0)

  const assets = ['CKB']

  useEffect(() => {
    getCurrentWalletAccountExtendedPubKey({ type: 0, index: 0 }).then(res => {
      if (isSuccessResponse(res)) {
        setMyPubKey(res.result)
      }
    })
  }, [])

  return (
    <PageContainer
      head={
        <div className={styles.pageHeader}>
          <PerunIcon />
          <p>{t('navbar.perun')}</p>
        </div>
      }
    >
      <div className={styles.container}>
        <div className={styles.topWrap}>
          <div className={clsx(styles.panel, styles.leftWrap)}>
            <h2>{t('perun.of-open-channels')}</h2>
            <h1>{channels.length}</h1>
            <Button type="primary" className={styles.createBtn} onClick={() => setDialogType(DialogType.openChannel)}>
              <AddSimple />
              {t('perun.create-new-channel')}
            </Button>
          </div>
          <div className={clsx(styles.panel, styles.rightWrap)}>
            <h2>
              {t('perun.locked-in-channels')}{' '}
              <Button
                type="text"
                className={styles.detailBtn}
                onClick={() => setDialogType(DialogType.lockedInChannels)}
              >
                <DetailIcon />
              </Button>
            </h2>
            <div className={styles.sliderWrap}>
              {assets.map(item => (
                <div className={styles.sliderItem} key={item}>
                  <h2>
                    <CkbIcon />
                    {item}
                  </h2>
                  <p>0</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.creationRequest}>
            <h2 className={styles.title}>
              {t('perun.channel-creation-request')}{' '}
              {requests.length > 0 && <span className={styles.badge}>{requests.length}</span>}
            </h2>
            <Button type="primary" onClick={() => setDialogType(DialogType.creationRequest)}>
              {t('perun.check')}
            </Button>
          </div>
        </div>

        <div className={clsx(styles.panel, styles.overview)}>
          <div className={styles.header}>
            <h2>
              {t('perun.channel-overview')}
              <Tooltip tip={t('perun.channel-overview-tooltip')} showTriangle placement="top">
                <InfoCircleOutlined />
              </Tooltip>
            </h2>
          </div>

          <div className={styles.overviewContent}>
            {/* <Table
              columns={columns}
              dataSource={channels}
              noDataContent={t('overview.no-recent-activities')}
              rowExtendRender={channel => <RowExtend channel={channel} />}
              expandedRow={expandedRow}
              onRowClick={(_, __, idx) => handleExpandClick(idx)}
            /> */}
          </div>
          <div className={styles.overviewWrap}>
            {channels.map(item => (
              <ChannelCard
                key={channelIdToString(item.id)}
                channelState={item}
                onClose={() => { }}
                onSend={() => { }}
              // onClose={() => setShowCloseChannelDialog(true)}
              // onSend={() => setShowSendDialog(true)}
              />
            ))}
          </div>
        </div>

        {dialogType === DialogType.creationRequest && requests.length > 0 && (
          <PerunCreationRequestList
            walletID={wallet?.id ?? ''}
            requests={requests}
            onCancel={() => setDialogType(undefined)}
          />
        )}
        {dialogType === DialogType.lockedInChannels && (
          <PerunLockedInChannels onClose={() => setDialogType(undefined)} />
        )}
        {dialogType === DialogType.closeChannel && <PerunCloseChannel onClose={() => setDialogType(undefined)} />}

        <PerunOpenChannel
          show={dialogType === DialogType.openChannel && myPubKey}
          onClose={() => setDialogType(undefined)}
          myPubKey={myPubKey}
        />

        {/* {dialogType === DialogType.send && <PerunSendPayment onClose={() => setDialogType(undefined)} />} */}
      </div>
    </PageContainer>
  )
}

PaymentChannel.displayName = 'PaymentChannel'

export default PaymentChannel
