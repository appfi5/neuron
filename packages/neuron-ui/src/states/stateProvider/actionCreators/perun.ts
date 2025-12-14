import { perunRequests as perunRequestsCache } from 'services/localCache'
import { StateDispatch, PaymentChannelActions } from 'states'

export const initPerunState = () => (dispatch: StateDispatch) => {
  const requests = perunRequestsCache.load()
  dispatch({
    type: PaymentChannelActions.UpdatePerunRequest,
    payload: requests,
  })
}

export const addPerunRequest = (request: Perun.ReadableMessage.Request) => (dispatch: StateDispatch) => {
  const requests = perunRequestsCache.load()
  perunRequestsCache.save([...requests, request])
  dispatch({
    type: PaymentChannelActions.UpdatePerunRequest,
    payload: perunRequestsCache.load(),
  })
}

export const deletePerunRequest = (request: Perun.ReadableMessage.Request) => (dispatch: StateDispatch) => {
  const requests = perunRequestsCache.load()
  console.log('deletePerunRequest', requests, request)
  perunRequestsCache.save(requests.filter(r => r.timestamp !== request.timestamp))
  console.log('deletePerunRequest------')
  dispatch({
    type: PaymentChannelActions.UpdatePerunRequest,
    payload: perunRequestsCache.load(),
  })
}
