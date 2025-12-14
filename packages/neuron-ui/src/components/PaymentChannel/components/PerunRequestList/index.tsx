

import { useTranslation } from 'react-i18next'
import Button from 'widgets/Button'
import Dialog from 'widgets/Dialog'

type PerunRequestListProps = {
  requests: State.PerunRequest[]
  onClose: () => void
}
export default function PerunRequestList(props: PerunRequestListProps) {
  const { requests, onClose } = props
  const [t] = useTranslation()
  return (
    <>
      <Dialog show title={t('perun.channel-creation-request-list')} showFooter={false} onCancel={onClose}>
        <div>
          {/* channel reqeust list */}
        </div>
      </Dialog>
    </>
  )
}


function OpenChannelRequestForm({ request }: { request: State.PerunRequest }) {
  const [t] = useTranslation()

  return (
    <div>
      <div>Open Channel Request from XXX</div>
      <div className='flex flex-row items-center'>
        <div>
          <div>My Token</div>
          <div>xx.xx</div>
        </div>
        <div>
          <div>Peer Token</div>
          <div>yy.yy</div>
        </div>
      </div>
      <div>
        <Button
          type="cancel"
          onClick={() => {
            // rejectPerunRequest(request, 'User rejected')
          }}
        >
          {t('perun.reject')}
        </Button>
        <Button
          type="primary"
          onClick={() => {
            // setCurrentRequest(request)
            // setShowPasswordDialog(true)
          }}
        >
          {t('perun.accept')}
        </Button>
      </div>
    </div>
  )
}