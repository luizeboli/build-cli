import chalk from 'chalk'
import ora from 'ora'

import fetch, { fetchWithTimeout } from './fetch.js'
import timeout from '../utils/timeout.js'
import REPOSITORIES from '../constants/repositories.js'
import config from '../config/index.js'

class Jenkins {
  constructor(answers) {
    this.repository = answers.repositoryToBuild
    this.branch = answers.jenkinsParameterBranch
    this.jenkinsJob = REPOSITORIES.get(this.repository).jenkinsJob
  }

  static async #connectToJenkins() {
    await fetchWithTimeout({
      url: config.jenkins.healthCheck,
      oraOptions: {
        text: 'Trying to connect to Jenkins.',
        failText: chalk.red('Could not connect to Jenkins. Maybe you are not connected to the VPN?'),
        successText: 'Connection to Jenkins established...',
      },
    })
  }

  async #createNewBuild() {
    const buildParams = new URLSearchParams()
    buildParams.append('Branch', this.branch)
    const createdBuild = await fetchWithTimeout({
      url: `/job/${this.jenkinsJob}/buildWithParameters`,
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: buildParams,
      },
      oraOptions: {
        text: 'Creating new build..',
        failText: chalk.red('Could not request a new build.'),
        successText: 'Created new build...',
      },
    })

    const queuedItemUrl = `${createdBuild.headers.get('Location')}api/json`
    this.queuedItemUrl = queuedItemUrl
  }

  async #getCreatedBuildId() {
    const spinner = ora('Retrieving build id..')
    spinner.start()
    const promise = async () => {
      const res = await fetch(this.queuedItemUrl)

      if (res.status !== 200) {
        throw new Error(res)
      }

      const result = await res.json()

      if (result.cancelled) {
        spinner.fail('The build has been cancelled...')
        throw new Error('The build has been cancelled...')
      }

      // This means the build is still in the queue and has not started
      if (!result.executable?.number) {
        await timeout(1000)
        return promise()
      }

      return result
    }

    const result = await promise()
    spinner.succeed(`Retrieved build id... (${chalk.blueBright(`#${result.executable.number}`)})`)
    this.buildId = result.executable.number
  }

  async #checkBuildStatus() {
    const spinner = ora('Checking for build status...')
    spinner.start()

    const promise = async () => {
      const res = await fetch(`/job/${this.jenkinsJob}/${this.buildId}/api/json?tree=result,id`)
      const result = await res.json()

      if (result.result === 'SUCCESS') {
        spinner.succeed('Build completed...')
        return result
      }

      if (['FAILURE', 'ABORTED'].includes(result.result)) {
        const isFailure = result.result === 'FAILURE'
        spinner.fail(`Build has been ${isFailure ? 'failed' : result.result.toLowerCase()}...`)
        throw new Error('Something wrong happened to the build... Go check!')
      }

      await timeout(2000)
      return promise()
    }

    const response = await promise()
    return response
  }

  async start() {
    try {
      await Jenkins.#connectToJenkins()
      await this.#createNewBuild()
      await this.#getCreatedBuildId()
      await this.#checkBuildStatus()
    } catch (error) {
      if (error.type === 'aborted') {
        console.log(chalk.red('✖ The operation was aborted'))
      }

      console.log(error, 'Uncaught error')

      process.exit(1)
    }
  }
}

export default Jenkins
