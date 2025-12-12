
import { PerunClose, PerunSend } from 'widgets/Icons/icon'
import styles from './ChannelCard.module.scss'
import Button from 'widgets/Button'
import * as wire from 'utils/perun-wallet-wrapper/wire'
import { bigintFromBEBytes, isSuccessResponse } from 'utils'
import { channelIdToString } from 'utils/perun-wallet-wrapper/translator'
import { perunServiceAction, showErrorMessage } from 'services/remote'
import PerunSendPayment from 'components/PerunSendPayment'
import { useState } from 'react'
import { ChannelInfo, closeChannel, updateChannel } from '../../api'

type ChannelCardProps = {
  channelState?: wire.State
  channelInfo: ChannelInfo
  key: string
  onClose?: (channelId: string) => void
  onSend?: (channelId: string) => void
}
enum DialogType {
  closeChannel = 'closeChannel',
  send = 'send',
}
export default function ChannelCard(props: ChannelCardProps) {
  const { channelState, channelInfo, onClose, onSend } = props
  const [dialogType, setDialogType] = useState<DialogType | undefined>(undefined)
  return (
    <>
      <div className={styles.overviewItem}>
        <div className={styles.overviewItemContent}>
          <div className={styles.itemCell}>
            <p>Channel with</p>
            {/* <p>
            at <span className={styles.time}>0x241872 20:15:24</span>
          </p> */}
            <p>{channelInfo.status}</p>
          </div>
          <h2 className={styles.address}>{channelInfo.peer.address.slice(0, 16)}...{channelInfo.peer.address.slice(-16)}</h2>
          <div className={styles.itemCell}>
            <p>My Token Locked</p>
            <p>Funds other party</p>
          </div>
          <div className={styles.itemCell}>
            <h2>{`${channelInfo.payload?.[channelInfo.myPayloadIndex].amount}`} CKB</h2>
            <h2>{`${channelInfo.payload?.[channelInfo.myPayloadIndex === 0 ? 1 : 0].amount}`} CKB</h2>
          </div>
        </div>

        {
          channelInfo.status === "connected" && (
            <div className={styles.overviewItemActions}>
              <Button
                type="text"
                data-color="error"
                onClick={async () => {
                  const res = await closeChannel(channelInfo.state!.id);
                  if (!isSuccessResponse(res)) {
                    showErrorMessage('Close Channel Failed', res.message as string);
                    // handleRejected(res.message as string)
                    return
                  }
                }}
              // onClick={() => onClose(channelId)}
              >
                <PerunClose />
                Close
              </Button>
              <Button
                type="text"
                onClick={() => setDialogType(DialogType.send)}
              >
                <PerunSend />
                Send
              </Button>
            </div>

          )
        }

      </div>
      {dialogType === DialogType.send && (
        <PerunSendPayment
          onConfirm={async (swapAmount) => {
            updateChannel(channelInfo.state!, 0, BigInt(swapAmount! * 1e8))
            // close
            setDialogType(undefined);
          }}
          onClose={() => setDialogType(undefined)}
        />
      )}
    </>

  )
}
