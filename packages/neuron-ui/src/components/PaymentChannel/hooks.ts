import { useEffect, useState } from "react";
import { perunServiceAction } from "services/remote";
import { isSuccessResponse } from "utils";


export const UNMATCH_CHANNEL_ID = 'UNMATCH_CHANNEL_ID';

export type ChannelInfo = Perun.ChannelInfo

export function useChannelInfoMap(address: string) {
  const [map, setMap] = useState<Record<string, ChannelInfo>>({})
  /** will update the channel info */
  const add = (channelId: string, info: ChannelInfo) => {
    if (channelId !== UNMATCH_CHANNEL_ID) {
      perunServiceAction({
        type: "add-channel-info",
        payload: info,
      })
    }
    setMap(map => ({ ...map, [channelId]: info }))
  }
  const has = (channelId: string) => !!map[channelId];
  const iDelete = (channelId: string) => {
    setMap(map => {
      const { [channelId]: _, ...rest } = map
      return rest
    })
    perunServiceAction({
      type: "remove-channel-info",
      payload: {
        channelId,
      },
    })
  }
  const get = (channelId: string) => map[channelId] as ChannelInfo | undefined

  useEffect(() => {
    perunServiceAction({
      type: "get-channel-infos",
      payload: {
        address,
      },
    }).then(res => {
      if (!isSuccessResponse(res)) {
        return
      }
      const list: ChannelInfo[] = res.result;
      const map = list.reduce((acc, cur) => {
        acc[cur.channelId] = cur
        return acc
      }, {} as Record<string, ChannelInfo>)
      setMap(map)
    })
  }, [])

  return {
    add,
    has,
    get,
    delete: iDelete,
  }
}