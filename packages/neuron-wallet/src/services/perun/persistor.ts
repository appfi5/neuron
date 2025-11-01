import { getConnection } from '../../database/chain/connection'
import PerunChannelEntity from '../../database/chain/entities/perun-channel'
// import PerunActivityEntity from '../../database/chain/entities/perun-activity'

export default class PerunPersistorService {
  static async updateChannel(channel: PerunChannelEntity) {
    const exist = await getConnection().getRepository(PerunChannelEntity).findOneBy({
      channelId: channel.channelId,
    })
    if (exist) {
      return await getConnection().manager.update(PerunChannelEntity, exist.id, channel)
    }

    return await getConnection().manager.save(channel)
  }

  static async getChannels() {
    const channels = await getConnection().getRepository(PerunChannelEntity).find()
    return channels.map(v => v.toModel())
  }
}
