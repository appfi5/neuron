
import { PerunClose, PerunSend } from 'widgets/Icons/icon'
import styles from './ChannelCard.module.scss'
import Button from 'widgets/Button'
import * as wire from 'utils/perun-wallet-wrapper/wire'
import { bigintFromBEBytes, isSuccessResponse } from 'utils'
import { channelIdToString } from 'utils/perun-wallet-wrapper/translator'
import { perunServiceAction, showErrorMessage } from 'services/remote'

type ChannelCardProps = {
  channelId: string
  channelState: wire.State
  key: string
  onClose: (channelId: string) => void
  onSend: (channelId: string) => void
}
export default function ChannelCard(props: ChannelCardProps) {
  const { channelState, key, onClose, onSend } = props
  return (
    <div key={key} className={styles.overviewItem}>
      <div className={styles.overviewItemContent}>
        {/* <div className={styles.itemCell}>
          <p>Channel with</p>
          <p>
            at <span className={styles.time}>0x241872 20:15:24</span>
          </p>
        </div> */}
        <div className={styles.itemCell}>
          <p>Id</p>
          {/* <p>
            at <span className={styles.time}>0x241872 20:15:24</span>
          </p> */}
        </div>
        <h2 className={styles.address}>{channelIdToString(channelState.id)}</h2>
        <div className={styles.itemCell}>
          <p>My Token Locked</p>
          <p>Funds other party</p>
        </div>
        <div className={styles.itemCell}>
          <h2>{`${bigintFromBEBytes(channelState.allocation?.balances?.balances[0].balance[0]!.data) / BigInt(1e8)}`} CKB</h2>
          <h2>{`${bigintFromBEBytes(channelState.allocation?.balances?.balances[0].balance[1]!.data) / BigInt(1e8)}`} CKB</h2>
        </div>
      </div>

      <div className={styles.overviewItemActions}>
        <Button
          type="text"
          data-color="error"
          onClick={async () => {
            const res = await perunServiceAction({
              type: 'close',
              payload: {
                channelId: channelState.id,
              },
            })
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
        // onClick={() => onSend(channelId)}
        >
          <PerunSend />
          Send
        </Button>
      </div>
    </div>
  )
}
