
import { PerunClose, PerunSend } from 'widgets/Icons/icon'
import styles from './ChannelCard.module.scss'
import Button from 'widgets/Button'
import * as wire from 'utils/perun-wallet-wrapper/wire'
import { bigintFromBEBytes, isSuccessResponse } from 'utils'
import { channelIdToString } from 'utils/perun-wallet-wrapper/translator'
import { perunServiceAction, showErrorMessage } from 'services/remote'
import PerunSendPayment from 'components/PerunSendPayment'
import { useState } from 'react'
import { ChannelState, closeChannel, updateChannel } from '../../api'
import { ChannelInfo } from 'components/PaymentChannel/hooks'
import Token from '../Token'

type ChannelCardProps = {
  channelInfo?: ChannelInfo
  channelState: ChannelState
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
  const peerAddress = channelInfo?.peer.address;
  return (
    <>
      <div className={styles.overviewItem}>
        <div className={styles.overviewItemContent}>
          <div className={styles.itemCell}>
            <p>Channel with</p>
            {/* <p>
            at <span className={styles.time}>0x241872 20:15:24</span>
          </p> */}
            <p>Status</p>
            {/* <p>{channelInfo.state?.isFinal === true ? "closed" : channelInfo.status}</p> */}
          </div>
          <div className={styles.itemCell}>
            <h2>{peerAddress ? `${peerAddress.slice(0, 6)}...${peerAddress.slice(-6)}` : ""}</h2>
            <h2>{channelState.state.isFinal === true ? "closed" : "connected"}</h2>
          </div>
          {/* <h2 className={styles.address}>{channelInfo.peer.address.slice(0, 16)}...{channelInfo.peer.address.slice(-16)}</h2> */}
          {/* <div>{channelInfo.id}</div> */}
          <div className={styles.itemCell}>
            <p>My Token Locked</p>
            <p>Funds other party</p>
          </div>
          <div className={styles.itemCell}>
            <h2>
              <Token
                amount={channelState.state.allocation?.balances?.balances[0].balance[channelState.actorIdx] ?? "0"}
                type={null}
              />
            </h2>
            <h2>
              <Token
                amount={channelState.state.allocation?.balances?.balances[0].balance[channelState.actorIdx === 1 ? 0 : 1] ?? "0"}
                type={null}
              />
            </h2>
          </div>
        </div>

        {
          !!channelState.state && channelState.state.isFinal !== true && (
            <div className={styles.overviewItemActions}>
              <Button
                type="text"
                data-color="error"
                onClick={async () => {
                  const res = await closeChannel(channelState.id);
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
            updateChannel(channelState.id, 0, BigInt(swapAmount! * 1e8))
            // close
            setDialogType(undefined);
          }}
          onClose={() => setDialogType(undefined)}
        />
      )}
    </>

  )
}
