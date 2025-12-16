import env from '../../env'
import { ChildProcess, spawn } from 'child_process'
import logger from '../../utils/logger'
import generateConfigFiles, { ConfigFileOptions } from './configFiles'
import path from 'path'
import SettingsService from '../settings'
import fs from 'fs'

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

export default class PerunChannelServiceRunner {

  protected runnerProcess?: ChildProcess

  private static instance: PerunChannelServiceRunner
  public static getInstance() {
    if (!PerunChannelServiceRunner.instance) {
      PerunChannelServiceRunner.instance = new PerunChannelServiceRunner()
    }

    return PerunChannelServiceRunner.instance
  }


  async start(opt: ConfigFileOptions) {
    if (this.runnerProcess) {
      logger.info('PerunChannelServiceRunner is already running')
      await this.stop()
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
      logger.error('PerunChannelServiceRunner:\t fail:', data.toString())
    })

    scrProcess.on("error", error => {
      logger.error('PerunChannelServiceRunner:\t fail:', error)
    })

    scrProcess.once("close", () => {
      logger.info('PerunChannelServiceRunner:\t closed')
      this.runnerProcess = undefined;
    })

    return true
  }

  async stop() {
    this.runnerProcess?.kill()
    this.runnerProcess = undefined
  }

}