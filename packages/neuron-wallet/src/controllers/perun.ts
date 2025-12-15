import EventEmitter from 'events'
import { PerunRequestSubject } from '../models/subjects/perun'
import PerunService from '../services/perun/service'
import logger from '../utils/logger'
import { ResponseCode } from '../utils/const'
import { SimpleChannelServiceClient } from '../utils/perun-wallet-wrapper/services'
import {
  AddressEncoder,
  channelIdFromString,
  channelIdToString,
} from '../utils/perun-wallet-wrapper/translator'
// import { interval } from 'rxjs'
import { mkSimpleChannelServiceClient } from '../utils/perun-wallet-wrapper/client'
import { bytes } from '@ckb-lumos/codec'
import { Allocation, Balances } from '../utils/perun-wallet-wrapper/wire'
// import PerunPersistorService from '../services/perun/persistor'
// import PerunChannelEntity from '../database/chain/entities/perun-channel'
import { ccc, mol } from "@ckb-ccc/core"
import participant from '../services/perun/tools/participant'

const defaultAddressEncoder: AddressEncoder = (add: Uint8Array | string) => {
  if (typeof add === 'string') {
    return bytes.bytify(add)
  }
  return add
}
const equalNumPaddedHex = (num: bigint) => {
  const hex = num.toString(16)
  const res = hex.length % 2 === 0 ? hex : `0${hex}`
  return `0x${res}`
}

export default class PerunController {
  static emiter = new EventEmitter()
  private static instance: PerunController
  private static serviceClient: SimpleChannelServiceClient

  public static getInstance() {
    logger.info('PerunController: getInstance-----PerunController-----')
    if (!PerunController.instance) {
      PerunController.instance = new PerunController()
      PerunController.serviceClient = PerunController.mkClient()
    }
    logger.info(
      'PerunController: getInstance-----PerunController.instance-----',
      JSON.stringify(PerunController.instance)
    )
    logger.info(
      'PerunController: getInstance-----PerunController.serviceClient-----',
      JSON.stringify(PerunController.serviceClient)
    )
    return PerunController.instance
  }

  // Create a new client for each call, in case the connection break for some reason.
  private static mkClient(): SimpleChannelServiceClient {
    logger.info('PerunController: mkClient-----SimpleChannelServiceClient--')
    // 实际上是创建了一个 gRPC的 client，就是 ChannelServiceClient ，对应的服务器地址是
    const rpcEndpoint = 'http://localhost:4322'
    return mkSimpleChannelServiceClient(defaultAddressEncoder, rpcEndpoint)
  }

  public async start() {
    logger.info('PerunController: start-----PerunService-----')
    return PerunService.getInstance().start()
  }

  public mount() {
    logger.info('PerunController: mount-----PerunController-----')
    this.registerHandlers()

    // interval(20000).subscribe(async () => {
    //   try {
    //     // const res = await PerunController.serviceClient.restoreChannels(new Uint8Array([]))
    //     // if (res.accepted) {
    //     //   for (const channel of channels) {
    //     //     const perunChannel = PerunChannelEntity.fromObject({
    //     //       channelId: channelIdToString(new Uint8Array(channel.id.data)),
    //     //       allocation: channel.allocation,
    //     //       data: channel.data,
    //     //       isFinal: channel.isFinal,
    //     //       version: channel.version.toString(),
    //     //     })
    //     //     await PerunPersistorService.updateChannel(perunChannel)
    //     //     const res = await PerunPersistorService.getChannels()
    //     //     PerunChannelSubject.next(res)
    //     //   }
    //     // }
    //   } catch (err) {
    //     logger.warn(`restoreChannels error: ${err}`)
    //   }
    // })
  }

  private registerHandlers = () => {
    logger.info('PerunController: registerHandlers-----PerunController-----')
    PerunController.emiter.on('perun-request', req => {
      logger.info('PerunController: received perun request', req)
      PerunRequestSubject.next({
        ...req,
        timestamp: Date.now(),
      })
    })
  }

  public respondPerunRequest(params: Controller.Params.RespondPerunRequestParams): Promise<Controller.Response> {
    logger.info('PerunController: respondPerunRequest-----PerunController-----')
    if (!PerunController.emiter.emit('perun-response', params)) {
      return Promise.reject(new Error('Failed to send perun response, no listener registered'))
    }
    return Promise.resolve({
      status: ResponseCode.Success,
    })
  }

  // 去 请求 ChannelService Server 的
  public perunServiceAction(params: Controller.Params.PerunServiceActionParams): Promise<Controller.Response> {
    logger.info('PerunController: perunServiceAction-----PerunController-----', params.type)
    switch (params.type) {
      case 'startup':
        return this.startupChannelServiceRunner(params.payload);
      case 'open':
        return this.openChannel(params.payload)
      case 'update':
        return this.updateChannel(params.payload)
      case 'close':
        return this.closeChannel(params.payload)
      case 'get':
        return this.getChannels(params.payload)
      case 'restore':
        return this.restoreChannels(params.payload)
      default:
        return Promise.reject(new Error('Invalid perun service action type'))
    }
  }

  async startupChannelServiceRunner(opt: Controller.Params.PerunChannelServiceRunnerStartupsParams) {
    const flag = await PerunService.getInstance().startChannelServiceRunner(opt)
    return {
      status: flag ? ResponseCode.Success : ResponseCode.Fail,
      result: flag,
      message: flag ? "" : "Failed to start PerunChannelServiceRunner"
    } as Controller.Response
  }

  async openChannel(params: PerunAPI.OpenChannelParams): Promise<Controller.Response> {
    logger.info('PerunController: openChannel----------')
    const { me, peer, balances, challengeDuration } = params;
    const meRequestId = await participant.encode(me.publicKey, me.address);
    const peerRequestId = await participant.encode(peer.publicKey, peer.address);
    const { assets, balances: iBalances } = balances.reduce((obj, item) => {
      obj.assets.push(item.type ? ccc.Script.from(item.type).toBytes() : new Uint8Array(1))
      obj.balances.push(
        item.balances.map(balance => bytes.bytify(equalNumPaddedHex(BigInt(balance)))),
      )
      return obj;
    }, { assets: [] as Uint8Array[], balances: [] as Uint8Array[][] })
    const alloc = Allocation.create({
      assets: assets,
      balances: Balances.create({
        balances: iBalances.map(balance => ({
          balance
        }))
        // balances: [
        //   {
        //     balance: params.balances,
        //   },
        // ],
      }),
    })

    const res = await PerunController.serviceClient
      .openChannel(meRequestId, peerRequestId, alloc, challengeDuration, mol.Uint32.encode(123))
      .catch(e => {
        logger.info('PerunController: openChannel-----error-----', e)
        return {
          rejected: {
            reason: e.message,
          },
          channelId: undefined,
        }
      })
    logger.info('PerunController: serviceClient.openChannel------res----', res)
    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }
    const channelId = channelIdToString(new Uint8Array(res.channelId!))
    // logger.log('Controler Buffer channelId', res.channelId!)
    // logger.log('Controler channelID', channelId)
    return {
      status: ResponseCode.Success,
      result: {
        channelId: channelId,
        alloc: alloc,
      },
    }
  }

  async updateChannel(params: Controller.Params.UpdateChannelParams): Promise<Controller.Response> {
    console.log("before update", params.channelId, params.index, params.amount)
    const res = await PerunController.serviceClient
      .updateChannel(channelIdFromString(params.channelId), params.index, params.amount)
      .catch(e => {
        console.log("1", e);
        return {
          rejected: {
            reason: e.message,
          },
          update: undefined,
        }
      })
    console.log("2", res);
    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }

    const state = res.update!.state!

    return {
      status: ResponseCode.Success,
      result: {
        state: state,
      },
    }
  }

  async closeChannel(params: Controller.Params.CloseChannelParams): Promise<Controller.Response> {
    const res = await PerunController.serviceClient.closeChannel(params.channelId)

    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }

    return {
      status: ResponseCode.Success,
      result: {
        channelId: res.close!.channelId!,
      },
    }
  }

  async getChannels(params: Controller.Params.GetChannelsParams): Promise<Controller.Response> {
    const res = await PerunController.serviceClient.getChannels(params.requester)
    // logger.info('PerunController: getChannels----------res:', res)

    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }

    return {
      status: ResponseCode.Success,
      result: {
        channels: res.channelStates,
      },
    }
  }

  async restoreChannels(params: Controller.Params.RestoreChannelsParams): Promise<Controller.Response> {
    logger.info('PerunController: restoreChannels----------', params)
    const res = await PerunController.serviceClient.restoreChannels(params.data)

    if (!res.accepted) {
      return {
        status: ResponseCode.Fail,
        message: 'Restore channels failed',
      }
    }

    return {
      status: ResponseCode.Success,
      result: {
        channels: res.data,
      },
    }
  }
}
