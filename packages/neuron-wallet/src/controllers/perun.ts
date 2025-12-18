import EventEmitter from 'events'
import { PerunRequestSubject, PerunRunnerStateSubject } from '../models/subjects/perun'
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
import { parseState } from '../services/perun/tools/tool'
import * as wire from "../utils/perun-wallet-wrapper/wire"
// import PerunChannelServiceRunner from '../services/perun/channel-service-runner'
import { PerunMessageReceiver } from '../services/perun/message-receiver'
import { getConnection } from '../database/chain/connection'
import PerunChannelInfoEntity from '../database/chain/entities/perun-channel-info'
// import PerunChannelServiceRunner from '../services/perun/channel-service-runner'

// const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
  public runnerStatus: Perun.RunnerStatus = { running: false }
  private static instance: PerunController
  private static serviceClient: SimpleChannelServiceClient

  constructor() {
    if (PerunController.instance) {
      return PerunController.instance
    }
    PerunController.instance = this;
    PerunController.serviceClient = PerunController.mkClient()
  }
  public static getInstance() {
    // logger.info('PerunController: getInstance-----PerunController-----')
    if (!PerunController.instance) {
      PerunController.instance = new PerunController()
      PerunController.serviceClient = PerunController.mkClient()
    }
    return PerunController.instance
  }

  // Create a new client for each call, in case the connection break for some reason.
  private static mkClient(): SimpleChannelServiceClient {
    logger.info('PerunController: mkClient-----SimpleChannelServiceClient--')
    // channelServiceClient
    const rpcEndpoint = 'http://localhost:4322'
    return mkSimpleChannelServiceClient(defaultAddressEncoder, rpcEndpoint)
  }


  public mount() {
    this.registerHandlers()
  }

  public unmount() {
    this.stopRunner();
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
    PerunController.emiter.on('perun-service', req => {
      logger.info('PerunController: received perun service', req)
      if (req.type === "stop") {
        this.stopRunner(req.message ? `${req.runner} is stopped: ${req.message}` : "");
      }
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
  public perunServiceAction(params: Perun.ServiceActionParams): Promise<Controller.Response> {
    logger.info('PerunController: perunServiceAction-----PerunController-----', params.type)
    switch (params.type) {
      case 'start-runner':
        return this.startRunner(params.payload);
      case 'stop-runner':
        return this.stopRunner();
      // case 'get-runner-context':
      //   return this.getRunnerContext();
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
      case 'get-channel-infos':
        return this.getChannelInfos(params.payload)
      case 'remove-channel-info':
        return this.removeChannelInfo(params.payload)
      case 'add-channel-info':
        return this.addChannelInfo(params.payload)
      default:
        return Promise.reject(new Error('Invalid perun service action type'))
    }
  }

  async getChannelInfos(params: (Perun.ServiceActionParams & { type: "get-channel-infos" })['payload']) {
    const res = await getConnection().getRepository(PerunChannelInfoEntity).find({
      where: {
        meAddress: params.address,
      }
    })
    return {
      status: ResponseCode.Success,
      result: res.map(item => item.toModel()),
    }
  }

  async removeChannelInfo(params: (Perun.ServiceActionParams & { type: "remove-channel-info" })['payload']) {
    await getConnection().getRepository(PerunChannelInfoEntity).delete({
      channelId: params.channelId,
    })
    return {
      status: ResponseCode.Success,
      result: true,
    }
  }

  async addChannelInfo(params: (Perun.ServiceActionParams & { type: "add-channel-info" })['payload']) {
    const channelInfo = params;
    // if exist remove it 
    const db = getConnection().getRepository(PerunChannelInfoEntity)
    const flag = await db.exist({
      where: {
        channelId: channelInfo.channelId,
      }
    })
    if (flag) {
      await db.delete({
        channelId: channelInfo.channelId,
      })
    }
    await db.insert(PerunChannelInfoEntity.fromObject(channelInfo))
    return {
      status: ResponseCode.Success,
      result: true,
    }
  }

  // async getRunnerContext(): Promise<Controller.Response> {
  //   return {
  //     status: ResponseCode.Success,
  //     result: this.context,
  //   }
  // }
  async startRunner(context: NonNullable<Perun.RunnerStatus['context']>) {
    console.log("PerunController:", this.runnerStatus);
    if (this.runnerStatus.running) {
      throw new Error('PerunController: Perun Already Started')
    }
    this.runnerStatus = {
      running: true,
      context
    }
    logger.info('PerunController: start-----PerunService-----')
    // todo 
    // start channel-service-runner
    // await PerunChannelServiceRunner.getInstance().start(context)
    // start wallet-backend
    await PerunMessageReceiver.getInstance().start()

    // await sleep(3000)

    PerunRunnerStateSubject.next(this.runnerStatus)

    return {
      status: ResponseCode.Success,
      result: true,
    }
  }

  async stopRunner(message?: string) {
    this.runnerStatus = {
      running: false,
      message: message,
    }
    PerunRunnerStateSubject.next(this.runnerStatus)
    // todo
    // stop channel-service-runner
    // PerunChannelServiceRunner.getInstance().stop();
    // stop wallet-backend 
    PerunMessageReceiver.getInstance().stop();
    return {
      status: ResponseCode.Success,
      result: true,
    }
  }

  // channel info api


  async openChannel(params: PerunAPI.OpenChannelParams): Promise<Controller.Response> {
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
        balances: iBalances.map(balance => ({ balance }))
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

  async updateChannel(params: Perun.UpdateChannelParams): Promise<Controller.Response> {
    console.log("before update", params.channelId, params.index, params.amount)
    const res = await PerunController.serviceClient
      .updateChannel(channelIdFromString(params.channelId), params.index, params.amount)
      .catch(e => {
        return {
          rejected: {
            reason: e.message,
          },
          update: undefined,
        }
      })
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

  async closeChannel(params: Perun.CloseChannelParams): Promise<Controller.Response> {
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

  async getChannels(params: Perun.GetChannelsParams): Promise<Controller.Response> {
    const res = await PerunController.serviceClient.getChannels(params.requester)
    // logger.info('PerunController: getChannels----------res:', res)

    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }

    const serializedStates = res.channelStates?.states ?? [];
    const actorIdxs = res.channelStates?.actorIdxs ?? [];

    const channelInfos = serializedStates.map((serializedState, idx) => {
      const state = parseState(serializedState as wire.State);

      return {
        id: state.id,
        state: state,
        actorIdx: actorIdxs[idx],
      }
    })

    return {
      status: ResponseCode.Success,
      result: channelInfos,
    }
  }

  async restoreChannels(params: Perun.RestoreChannelsParams): Promise<Controller.Response> {
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
