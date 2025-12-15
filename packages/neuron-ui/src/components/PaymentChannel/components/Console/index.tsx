import { useState as useGlobalState } from 'states'
import { useTranslation } from 'react-i18next'
import { useInterval, useRequest } from 'ahooks'
import { getChannels, openChannel } from '../../api'
import { useEffect, useMemo, useState } from 'react'
import { getCurrentWalletAccountExtendedPubKey, showErrorMessage } from 'services/remote'
import styles from '../../perun.module.scss'
import {
  AddSimple,
  DetailIcon,
  CkbIcon,
  InfoCircleOutlined,
  DepositTimeSort,
  PerunSend,
  PerunClose,
  LineDownArrow,
} from 'widgets/Icons/icon'
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
import ChannelCard from '../ChannelCard'
import PerunCreationRequestList from 'components/PerunCreationRequestList'
import PerunLockedInChannels from 'components/PerunLockedInChannels'
import PerunCloseChannel from 'components/PerunCloseChannel'
import PerunOpenChannel from '../OpenChannel'
import Button from 'widgets/Button'
import Tooltip from 'widgets/Tooltip'
import CopyZone from 'widgets/CopyZone'
import { ChannelInfo, UNMATCH_CHANNEL_ID, useChannelInfoMap } from 'components/PaymentChannel/hooks'

enum DialogType {
  creationRequest = 'creationRequest',
  lockedInChannels = 'lockedInChannels',
  closeChannel = 'closeChannel',
  send = 'send',
  openChannel = 'openChannel',
}

type PerunConsoleProps = {
  publicKey: string
  address: string
  onClose?: () => void
}

export default function PerunConsole(props: PerunConsoleProps) {
  const { publicKey: myPubKey, address: myAddress, onClose } = props
  const {
    wallet,
    perun: { requests }, // channels
  } = useGlobalState()
  const [t] = useTranslation()
  const [dialogType, setDialogType] = useState<DialogType | undefined>(undefined)
  const channelInfoMap = useChannelInfoMap()
  // const [pendingChannels, setPendingChannels] = useState<ChannelInfo[]>([])
  // const [channelMap, setChannelMap] = useState<Record<string, ChannelInfo>>({})
  const { data: channelStates = [], run: syncChannels } = useRequest(async () => {
    const list = await getChannels(myPubKey, myAddress)
    return list;
  }, {
    ready: !!myPubKey, //  && (wallet.addresses.length > 0)
    manual: true,
  })

  useInterval(syncChannels, !!myPubKey ? 5000 : 0)

  const assets = ['CKB']
  console.log("perun requests", requests);
  console.log("perun channle states", channelStates);

  return (
    <div className={styles.container}>
      <div className='flex flex-row justify-between items-center mb-4'>
        <Button type="danger" className={styles.createBtn} onClick={() => { }}>
          Exit
        </Button>
        <Button type="primary" className={styles.createBtn} onClick={() => setDialogType(DialogType.openChannel)}>
          <AddSimple />
          {t('perun.create-new-channel')}
        </Button>
      </div>
      <div className={styles.topWrap}>
        <div className={clsx(styles.panel)} style={{ width: "50%" }}>
          <div className="flex flex-col gap-2">
            <div>
              <div className='text-secondary mb-1'>My Address:  </div>
              <div>
                <CopyZone
                  className="break-all"
                  style={{ padding: 0 }}
                  content={myAddress}
                >
                  {myAddress}
                </CopyZone>
              </div>
            </div>
            <div>
              <div className='text-secondary mb-1'>My Public Key:  </div>
              <CopyZone
                className="break-all"
                style={{ padding: 0 }}
                content={myPubKey}
              >{myPubKey}</CopyZone>
            </div>
          </div>
          {/* <h2>{t('perun.of-open-channels')}</h2>
          <h1>{channels.length}</h1>
          <Button type="primary" className={styles.createBtn} onClick={() => setDialogType(DialogType.openChannel)}>
            <AddSimple />
            {t('perun.create-new-channel')}
          </Button> */}

          {/* <Button
            onClick={() => {
              restoreChannels();
            }}
          >
            Restore Channels
          </Button>
          <Button
            onClick={() => {
              startupChannelServiceRunner(myPubKey)
            }}
          >
            Startup Channel Service Runner
          </Button> */}
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
          {/* {pendingChannels.map(info => (
            <ChannelCard
              key={info.id}
              channelInfo={info}
            />
          ))} */}
          {channelStates.map(state => (
            <ChannelCard
              key={state.id}
              channelInfo={channelInfoMap.get(state.id)}
              channelState={state}
              onClose={() => { }}
              onSend={() => { }}
            />
          ))}
        </div>
      </div>

      {dialogType === DialogType.creationRequest && requests.length > 0 && (
        <PerunCreationRequestList
          walletID={wallet?.id ?? ''}
          requests={requests}
          onOpenChannel={(request) => {
            // todo convert request.initBals to payload
            const payload: PerunAPI.OpenChannelParams['balances'] = [{ type: null, balances: ["1", "2"]}]
            const channelInfo: ChannelInfo = {
              channelId: UNMATCH_CHANNEL_ID,
              me: {
                address: myAddress,
                publicKey: myPubKey,
              },
              peer: request.participant,
              payload,
              myPayloadIndex: 1,
            }
            channelInfoMap.add(UNMATCH_CHANNEL_ID, channelInfo);
          }}
          onUpdateChannel={(request) => {
            const channelId = request.state?.id as string
            if(channelId && !channelInfoMap.has(channelId) && channelInfoMap.has(UNMATCH_CHANNEL_ID)) {
              const temChannelInfo = channelInfoMap.get(UNMATCH_CHANNEL_ID)
              const channelInfo = {
                ...temChannelInfo,
                channelId: channelId,
              }
              channelInfoMap.add(channelId, channelInfo)
              channelInfoMap.delete(UNMATCH_CHANNEL_ID)
            }
            // setChannelMap(prev => {
            //   prev[channelInfo.id] = channelInfo
            //   return { ...prev }
            // })
          }}
          onCancel={() => setDialogType(undefined)}
        />
      )}
      {dialogType === DialogType.lockedInChannels && (
        <PerunLockedInChannels onClose={() => setDialogType(undefined)} />
      )}
      {dialogType === DialogType.closeChannel && <PerunCloseChannel onClose={() => setDialogType(undefined)} />}

      <PerunOpenChannel
        show={dialogType === DialogType.openChannel}
        onRequest={(peerUser: PerunAPI.PeerUser, payload: PerunAPI.OpenChannelParams['balances']) => {
          // todo check if have channel with this peer
          const channelInfo: ChannelInfo = {
            channelId: "",
            me: {
              address: myAddress,
              publicKey: myPubKey,
            },
            peer: peerUser,
            payload,
            myPayloadIndex: 0,
          }
          // setPendingChannels(prev => [...prev, channelInfo]);
          // setChannelMap(prev => {
          //   prev[channelInfo.id] = channelInfo
          //   return { ...prev }
          // })

          openChannel(myPubKey, myAddress, peerUser, payload, 1000)
            .then(res => {
              if (!isSuccessResponse(res)) {
                // remove from pending channels
                // setPendingChannels(prev => {
                //   return prev.filter(item => item.id !== channelInfo.id)
                // })
                // remove temp Channel ID
                // setChannelMap(prev => {
                //   delete prev[channelInfo.id];
                //   return { ...prev }
                // })
                showErrorMessage('Error', errorFormatter(res.message, t))
                return;
              }

              // remove from pending channels
              // setPendingChannels(prev => {
              //   return prev.filter(item => item.id !== channelInfo.id)
              // })
              // update Channel ID
              channelInfo.channelId = res.result.channelId
              channelInfoMap.add(channelInfo.channelId, channelInfo)
            })
            .catch(err => {
              console.log("openChannel error", err);
              debugger
              showErrorMessage('Error', errorFormatter(err.message, t))
            })
        }}
        onClose={() => setDialogType(undefined)}
        myPubKey={myPubKey}
      />

      {/* {dialogType === DialogType.send && <PerunSendPayment onClose={() => setDialogType(undefined)} />} */}
    </div>
  )
}