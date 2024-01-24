import path from 'node:path'
import { cpSync, existsSync } from 'node:fs'
import { CronJob } from 'cron'
import psList from 'ps-list'
import dayjs from 'dayjs'
import chalk from 'chalk'
import config from './config.js'

async function isRunning() {
  const processes = await psList()

  return processes.some((process) => process.name === config.BIN_NAME)
}

function generateBackupSuffix() {
  return dayjs().format('YYYYMMDDHHmm')
}

function handleBackup() {
  const src = path.resolve(config.INSTALL_PATH)
  const dest = path.resolve(config.INSTALL_PATH, generateBackupSuffix())

  // throw error if source path does not exist
  if (!existsSync(src)) throw new Error(`Source path "${src}" does not exist`)

  cpSync(src, dest, { recursive: true })

  console.log(chalk.green(`Backup ${src} to ${dest}`))
}

function handlePingHealthCheck(isRunning) {
  if (!config.HEALTHCHECK_URL) return

  // ping healthcheck url
}

function start() {
  const backupCronJob = CronJob.from({
    cronTime: config.BACKUP_CRON,
    onTick: handleBackup,
    timeZone: config.TIMEZONE,
    start: false,
  })

  // start healthcheck
  CronJob.from({
    cronTime: config.HEALTHCHECK_CRON,
    timeZone: config.TIMEZONE,
    onTick: async () => {
      if (await isRunning()) {
        console.log(chalk.blue('Server is running'))

        backupCronJob.start()

        handlePingHealthCheck(true)
      } else {
        console.log(chalk.red('Server is not running'))

        backupCronJob.stop()

        handlePingHealthCheck(false)
      }
    },
    start: true,
  })
}

start()
