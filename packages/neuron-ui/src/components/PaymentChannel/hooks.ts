import { useState } from "react";


export const UNMATCH_CHANNEL_ID = 'UNMATCH_CHANNEL_ID';

export type ChannelInfo = {
  channelId: string;
  me: PerunAPI.PeerUser;
  peer: PerunAPI.PeerUser;
  payload: PerunAPI.OpenChannelParams['balances'],
  myPayloadIndex: 0 | 1;
}

export function useChannelInfoMap() {
  const [map, setMap] = useState<Record<string, ChannelInfo>>({})
  /** will update the channel info */
  const add = (channelId: string, info: ChannelInfo) => setMap(map => ({ ...map, [channelId]: info }))
  const has = (channelId: string) => !!map[channelId];
  const iDelete = (channelId: string) => setMap(map => {
    const { [channelId]: _, ...rest } = map
    return rest
  })
  const get = (channelId: string) => map[channelId] as ChannelInfo | undefined

  return {
    add,
    has,
    get,
    delete: iDelete,
  }
}