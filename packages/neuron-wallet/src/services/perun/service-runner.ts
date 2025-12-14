import crypto from 'crypto'
import env from '../../env'
import { ChildProcess, fork, spawn } from 'child_process'
import fs from 'fs'
import logger from '../../utils/logger'
import path from 'path'
import { WalletBackend } from '../../utils/perun-wallet-wrapper/services'
import PerunController from '../../controllers/perun'
import { bytes } from '@ckb-lumos/codec'
// import RpcService from '../../services/rpc-service'
// import { TransactionsService } from '../tx'
// import NetworksService from '../networks'
// import { LightRPC } from 'src/utils/ckb-rpc'
// import { NetworkType } from '../../models/network'
import generateConfigFiles, { ConfigFileOptions } from './configFiles'
import SettingsService from '../settings'
import { parseOpenChannelRequest } from './tools/parser.open-channel'
import { parseSignMessageRequest } from './tools/parser.sign-message'
import { parseSignTransactionRequest } from './tools/parser.sign-transaction'
import { parseUpdateNotificationRequest } from './tools/parser.update-notification'

const { app } = env

const platform = (): string => {
  switch (process.platform) {
    case 'win32':
      return 'win'
    case 'linux':
      return 'linux'
    case 'darwin':
      return 'mac'
    default:
      return ''
  }
}

const binaryPath = (): string => {
  return app.isPackaged ? path.join(path.dirname(app.getAppPath()), '..', './bin') : path.join(__dirname, '../../bin')
}
const channelServiceRunnerBinary = (): string => {
  const binary = app.isPackaged ? path.resolve(binaryPath(), './channel-service-runner') : path.resolve(binaryPath(), `./${platform()}`, './channel-service-runner')
  switch (platform()) {
    case 'win':
      return binary + '.exe'
    // case 'mac':
    //   if (app.isPackaged) {
    //     return binary
    //   }
    //   return `${binary}-${process.arch === 'arm64' ? 'arm64' : 'x64'}`
    default:
      return binary
  }
}

// Architecture overview:
//
// [ChannelService] <-via RPC-> [PerunServiceServer] <-via IPC-> [Neuron]
export class PerunServiceRunner {
  private static instance: PerunServiceRunner

  protected runnerProcess?: ChildProcess

  protected channelServiceRunner: ChildProcess | null = null

  private logStream?: fs.WriteStream

  static getInstance(): PerunServiceRunner {
    if (!PerunServiceRunner.instance) {
      logger.info('Creating new PerunServiceRunner instance')
      PerunServiceRunner.instance = new PerunServiceRunner()
    }
    return PerunServiceRunner.instance
  }

  async start() {
    if (this.runnerProcess) {
      logger.info('PerunServiceRunner already started, shutting down first...')
      await this.stop()
    }

    this.runnerProcess = this.spawnProcess()

    if (!this.logStream) {
      this.logStream = fs.createWriteStream('perun-service.log')
    }

    this.runnerProcess.stderr &&
      this.runnerProcess.stderr.on('data', data => {
        logger.error(`PerunServiceRunner stderr: ${data}`)
        this.logStream?.write(data)
      })

    this.runnerProcess.stdout &&
      this.runnerProcess.stdout.on('data', data => {
        logger.info(`PerunServiceRunner stdout: ${data}`)
        this.logStream?.write(data)
      })

    this.runnerProcess.on('error', error => {
      logger.error('PerunServiceRunner error:', error)
      this.runnerProcess?.kill()
      this.runnerProcess = undefined
    })

    this.runnerProcess.on('close', code => {
      logger.info(`PerunServiceRunner exited with code ${code}`)
      this.runnerProcess = undefined
    })

    // 监听ipc 消息
    this.runnerProcess.on('message', this.ipcMessageHandler)
  }

  // 通过 ipc收到 backend 发来的 message
  private ipcMessageHandler = (message: Perun.SerializedMessage.Request) => {
    console.log('receving ipcMessageHandler', message)
    switch (message.type) {
      case 'OpenChannel':
        return this.handleOpenChannelRequest(message.req, message.requestId)
      case 'UpdateNotification':
        return this.handleUpdateNotificationRequest(message.req, message.requestId)
      case 'SignMessage':
        return this.handleSignMessageRequest(message.req, message.requestId)
      case 'SignTransaction':
        return this.handleSignTransactionRequest(message.req, message.requestId)
      default: {
        logger.info('Unknown IPC message type', message)
      }
    }
    logger.info('PerunServiceRunner received unexpected IPC message', message)
  }

  // private ipcReturn(type: string, req: unknown, requestId?: string) {
  //   logger.info('runner: ipcReturn-----------', type, requestId, req)
  //   return new Promise<void>((resolve, reject) => {
  //     this.runnerProcess?.send({ type, req, requestId }, error => {
  //       if (error) {
  //         logger.error('PerunServiceRunner failed to send IPC message', error)
  //         reject(error)
  //       } else {
  //         logger.info('PerunServiceRunner successfully sent IPC message')
  //         resolve()
  //       }
  //     })
  //   })
  // }

  private ipcResponse(type: Perun.RequestType, requestId: string, req: unknown) {
    logger.info('runner: ipcResponse-----------', type, requestId, req)
    return new Promise<void>((resolve, reject) => {
      this.runnerProcess?.send({ type, req, requestId }, error => {
        if (error) {
          logger.error('PerunServiceRunner failed to send IPC message', error)
          reject(error)
        } else {
          logger.info('PerunServiceRunner successfully sent IPC message')
          resolve()
        }
      })
    })
  }

  private async handleOpenChannelRequest(_req: Perun.SerializedMessage.ValidOpenChannelRequest, requestId: string) {
    type ResponseType = Awaited<ReturnType<WalletBackend<{}>['openChannelRequest']>>
    const readableReq = await parseOpenChannelRequest(_req);
    return new Promise<void>((resolve, reject) => {
      if (
        !PerunController.emiter.emit('perun-request', {
          type: "OpenChannel",
          request: readableReq,
        })
      ) {
        this.ipcResponse("OpenChannel", requestId, { rejected: { reason: 'offline' } })
        return reject(new Error('Failed to send perun request, no listener registered'))
      }

      PerunController.emiter.once('perun-response', (res: Controller.Params.RespondPerunRequestParams) => {
        if (res.response.rejected) {
          this.ipcResponse("OpenChannel", requestId, { rejected: { reason: res.response.rejected.reason } })
          return resolve();
        }

        // Validate the request.
        // this.validateOpenChannelRequest(req)
        logger.info('runner: handleOpenChannelRequest-----------PerunServiceRunner received openChannelRequest', _req);
        const nonceShare = new Uint8Array(32)

        // 处理这个，比如让用户通过请求？？
        crypto.getRandomValues(nonceShare)
        const responseData: ResponseType = {
          nonceShare
        }
        // goto file:///./server/wallet-backend.ts#L40
        this.ipcResponse("OpenChannel", requestId, responseData)
        resolve();
      })
    })
  }

  private handleUpdateNotificationRequest(req: Perun.SerializedMessage.UpdateNotificationRequest, requestId: string) {
    type ResponseType = Awaited<ReturnType<WalletBackend<{}>["updateNotificationRequest"]>>
    const readableReq = parseUpdateNotificationRequest(req);
    logger.info('PerunServiceRunner received updateNotificationRequest', readableReq)
    return new Promise<void>((resolve, reject) => {
      if (
        !PerunController.emiter.emit('perun-request', {
          type: 'UpdateNotification',
          request: readableReq,
        })
      ) {
        this.ipcResponse("UpdateNotification", requestId, { rejected: { reason: 'offline' } })
        return reject(new Error('Failed to send perun request, no listener registered'))
      }

      PerunController.emiter.once('perun-response', (res: Controller.Params.RespondPerunRequestParams) => {
        if (res.response.rejected) {
          this.ipcResponse("UpdateNotification", requestId, { rejected: { reason: res.response.rejected.reason } })
          return resolve();
        }

        const responseData: ResponseType = { accepted: true }
        // goto file:///./server/wallet-backend.ts#L40
        this.ipcResponse("UpdateNotification", requestId, responseData)
        resolve();
      })

    })
  }

  private handleSignMessageRequest(req: Perun.SerializedMessage.ValidSignMessageRequest, requestId: string) {
    logger.info('runner: handleSignMessageRequest-----------', req)
    return new Promise<void>((resolve, reject) => {
      if (
        !PerunController.emiter.emit('perun-request', {
          type: 'SignMessage',
          request: parseSignMessageRequest(req),
        })
      ) {
        return reject(new Error('Failed to send perun request, no listener registered'))
      }

      PerunController.emiter.once('perun-response', (res: Controller.Params.RespondPerunRequestParams) => {
        if (res.response.rejected) {
          this.ipcResponse("SignMessage", requestId, {
            rejected: {
              reason: res.response.rejected.reason,
            },
          })
          return resolve()
        }

        // walletSig is a recoverable signature
        //
        // 0x + <32-byte-r> + <32-byte-s> + <8-byte-recover>
        //
        // has to be transformed into a DER encoded signature.
        const walletSig: string = res.response.data
        // Strip `0x` prefix if present.
        const sig = walletSig.startsWith('0x') ? walletSig.slice(2) : walletSig
        // r and s values are padded with 0 prefix if they are less than 32 bytes.
        // We need to remove the padding.
        const tmp_r = bytes.bytify('0x' + sig.slice(0, 64).replace(/^(00)+/, ''))
        const first_byte = tmp_r[0]
        let r: Uint8Array = new Uint8Array()
        if ((first_byte & 0x80) >= 0x80) {
          // logger.info("Padding R with '00'")
          r = new Uint8Array([0x00])
        }
        r = bytes.concat(r, tmp_r)

        const s = bytes.bytify('0x' + sig.slice(64, 128).replace(/^(00)+/, ''))
        // logger.info(`full signature: ${sig}`)
        // logger.info(`r before stripping padding: ${sig.slice(0, 64)}`)
        // logger.info(`s before stripping padding: ${sig.slice(64, 128)}`)
        // logger.info(`r after stripping padding: ${bytes.hexify(r)}`)
        // logger.info(`s after stripping padding: ${bytes.hexify(s)}`)
        const numberToHexString = (num: number) => {
          const hex = num.toString(16)
          return hex.length === 1 ? '0' + hex : hex
        }
        const derSig = `0x30${numberToHexString(0x04 + r.length + s.length)}02${numberToHexString(r.length)}${bytes
          .hexify(r)
          .slice(2)}02${numberToHexString(s.length)}${bytes.hexify(s).slice(2)}`

        // Pad the signature to 73 bytes if it is shorter than that.
        // MarkerByte = 0xff
        // Examples:
        // Input: <DER encoded signature of length 70 bytes>
        // Output: <DER encoded signature of length 70 byte> | MarkerByte | ZeroByte | ZeroByte
        //
        // Input: <DER encoded signature of length 72 bytes>
        // Output: <DER encoded signature of length 72 byte> | MarkerByte
        //
        // We always append the marker byte and only pad with zero bytes if the signature is shorter than 72 bytes.
        const paddedSig = `${derSig}${'ff'}${'00'.repeat(72 - derSig.slice(2).length / 2)}`
        this.ipcResponse('SignMessage', requestId, {
          signature: paddedSig,
        })
        resolve()
      })
    })
  }

  private handleSignTransactionRequest(_req: Perun.SerializedMessage.SignTransactionRequest, requestId: string) {
    // logger.info('PerunServiceRunner received signTransactionRequest prev', _req)
    return new Promise<void>(async (resolve, reject) => {
      type ResponseType = Awaited<ReturnType<WalletBackend<{}>["signTransactionRequest"]>>
      const req = await parseSignTransactionRequest(_req)
        .catch(e => {
          this.ipcResponse('SignTransaction', requestId, { rejected: { reason: `sign transaction error: ${e.message}` } } as ResponseType)
          reject(e);
        })
        
      // 这里看出来是谁的请求
      // 是 开？ 是关？ 是更新？
      logger.info('PerunServiceRunner received signTransactionRequest', req)
      
      if (
        !PerunController.emiter.emit('perun-request', {
          type: 'SignTransaction',
          request: req,
        })
      ) {
        return reject(new Error('Failed to send perun request, no listener registered'))
      }

      PerunController.emiter.once('perun-response', (res: Controller.Params.RespondPerunRequestParams) => {
        if (res.response.rejected) {
          this.ipcResponse('SignTransaction', requestId, {
            rejected: {
              reason: res.response.rejected.reason,
            },
          })
          return resolve()
        }
        const signedTx = res.response.data
        this.ipcResponse('SignTransaction', requestId, { transaction: signedTx })
        resolve()
      })
    })
  }

  private spawnProcess(): ChildProcess {
    const grpcModulePath = path.join(__dirname, 'server/index.js')
    return fork(grpcModulePath, [], {
      stdio: ['ipc', process.stdout, 'pipe'],
    })
  }

  async stop() {
    this.runnerProcess?.kill()
  }

  // channel service runner

  async startChannelServiceRunner(opt: ConfigFileOptions) {
    if (this.channelServiceRunner) {
      logger.info('ChannelServiceRunner is already running')
      return
    }

    const { config, contractCellDeps, systemScripts } = generateConfigFiles(opt)

    const perunFolderPath = SettingsService.getInstance().getPeurnDataFolderPath();
    const pathWithNetwork = path.join(perunFolderPath, opt.network);
    fs.mkdirSync(pathWithNetwork, { recursive: true });

    const file_config_path = path.join(pathWithNetwork, 'config.json');
    fs.writeFileSync(file_config_path, JSON.stringify(config, null, 2));

    const file_contractCellDeps_path = path.join(pathWithNetwork, 'contracts_cell_deps.json');
    fs.writeFileSync(file_contractCellDeps_path, JSON.stringify(contractCellDeps, null, 2));

    const file_systemScripts_path = path.join(pathWithNetwork, 'system_scripts.json');
    fs.writeFileSync(file_systemScripts_path, JSON.stringify(systemScripts, null, 2));
    console.log("args", [
      // --config           config.json
      '--config',
      file_config_path,
      // --system_scripts   default_scripts.json
      '--system_scripts',
      file_systemScripts_path,
      // --migration_data   contracts_cell_deps.json
      '--migration_data',
      file_contractCellDeps_path,
    ].join(" "))
    const scrProcess = spawn(channelServiceRunnerBinary(), [
      // --config           config.json
      '--config',
      `"${file_config_path}"`,
      // --system_scripts   default_scripts.json
      '--system_scripts',
      `"${file_systemScripts_path}"`,
      // --migration_data   contracts_cell_deps.json
      '--migration_data',
      `"${file_contractCellDeps_path}"`,
    ])

    scrProcess.stderr?.on('data', data => {
      logger.error('Perun Service Runner:\tChannelServiceRunner fail:', data.toString())
    })

    scrProcess.on("error", error => {
      logger.error('Perun Service Runner:\tChannelServiceRunner fail:', error)
    })

    scrProcess.once("close", () => {
      logger.info('Perun Service Runner:\tChannelServiceRunner closed')
      this.channelServiceRunner = null;
    })
  }

  async stopChannelServiceRunner() {
    if (!this.channelServiceRunner) {
      logger.info('ChannelServiceRunner is not running')
      return
    }

    this.channelServiceRunner.kill()
    // this.channelServiceRunner = null
  }

  // TODO: CKBNode probably executes its starting twice.
}
