import path from 'node:path'
import { cpSync, existsSync } from 'node:fs'
import { CronJob } from 'cron'
import psList from 'ps-list'
import dayjs from 'dayjs'
import axios from 'axios'
import chalk from 'chalk'
import config from './config.js'

async function checkProcessRunning() {
  const processes = await psList()

  return processes.some((process) => process.name === config.BIN_NAME)
}

function checkSourcePathExist() {
  const source = path.resolve(config.SOURCE_PATH)

  // throw error if source path does not exist
  if (!existsSync(source)) throw new Error(`Source path "${source}" does not exist`)
}

function getBackupTime() {
  return dayjs().format('YYYYMMDDHHmmss')
}

function handleBackup() {
  const source = path.resolve(config.SOURCE_PATH)
  const sourceBasename = path.basename(source)
  const target = path.resolve(config.TARGET_PATH, `${sourceBasename}-${getBackupTime()}`)

  cpSync(source, target, { recursive: true })

  console.log(chalk.green(`Backup "${source}" to "${target}"`))
}

function handlePingHealthCheck(isRunning) {
  if (!config.HEALTHCHECK_URL) return

  const url = isRunning ? `${config.HEALTHCHECK_URL}/0` : `${config.HEALTHCHECK_URL}/1`

  axios
    .get(url)
    .then(() => console.log(chalk.green('Ping healthcheck success')))
    .catch(() => console.log(chalk.red('Ping healthcheck failed')))
}

function start() {
  checkSourcePathExist()

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
      if (await checkProcessRunning()) {
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
