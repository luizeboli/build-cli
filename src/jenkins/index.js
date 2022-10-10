import chalk from 'chalk'
import ora from 'ora'
import notifier from 'node-notifier'

import fetch, { fetchWithTimeout } from './fetch.js'
import timeout from '../utils/timeout.js'
import REPOSITORIES from '../constants/repositories.js'
import config from '../config/index.js'
import addNewLine from '../utils/addNewLine.js'

class Jenkins {
  constructor(answers) {
    this.repository = answers.repository
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
      const url = `/job/${this.jenkinsJob}/${this.buildId}`
      const res = await fetch(`${url}/api/json?tree=result,id`)
      const result = await res.json()

      if (result.result === 'SUCCESS') {
        spinner.succeed('Build completed...')
        notifier.notify({
          title: 'Hi Build - Jenkins',
          message: `Build completed successfully!`,
          sound: true,
        })
        return result
      }

      if (['FAILURE', 'ABORTED'].includes(result.result)) {
        const isFailure = result.result === 'FAILURE'
        spinner.fail(
          `Build has been ${isFailure ? 'failed' : result.result.toLowerCase()}...\n  Link: ${
            config.jenkins.baseUrl
          }${url}`,
        )
        throw new Error('Something wrong happened to the build... Go check!')
      }

      await timeout(2000)
      return promise()
    }

    const response = await promise()
    return response
  }

  async printLastSuccessfulBuild() {
    const spinner = ora('Checking for last sucessful build...').start()

    try {
      await Jenkins.#connectToJenkins()

      const url = `/job/${this.jenkinsJob}/lastSuccessfulBuild/api/json`
      const response = await fetch(url)
      const data = await response.json()
      spinner.succeed('Retrieved last successful build...')
      addNewLine()

      const actionCauses = data.actions.find((action) => !!action.causes)
      const actionParameter = data.actions.find((action) => !!action.parameters)

      console.log(chalk.blue('Build id:'), chalk.blueBright(`#${data.id}`))
      console.log(chalk.blue('Build url:'), chalk.blueBright(data.url))
      console.log(chalk.blue('Date:'), chalk.blueBright(new Date(data.timestamp)))
      addNewLine()

      actionCauses.causes.forEach((cause) => {
        console.log(`${chalk.blueBright(cause.shortDescription)}\r`)
        if (cause.userId) console.log(chalk.blueBright(cause.userId))
        addNewLine()
      })
      actionParameter.parameters.forEach((parameter) => {
        console.log(chalk.blue('Parameter:\r'))
        console.log(chalk.blueBright(`${parameter.name.trim()}: ${parameter.value}`))
        addNewLine()
      })
    } catch (error) {
      console.log(error, 'Uncaught error when checking last successful build')

      spinner.fail()
      process.exit(1)
    }
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

      notifier.notify({
        title: 'Hi Build - Jenkins',
        message: `Something went wrong!`,
        sound: true,
      })

      process.exit(1)
    }
  }
}

export default Jenkins
