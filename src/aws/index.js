import {
  CodePipelineClient,
  GetPipelineExecutionCommand,
  ListActionExecutionsCommand,
  ListPipelineExecutionsCommand,
} from '@aws-sdk/client-codepipeline'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import chalk from 'chalk'
import { differenceInSeconds } from 'date-fns'
import ora from 'ora'
import { STSClient, GetCallerIdentityCommand, GetSessionTokenCommand } from '@aws-sdk/client-sts'
import { execSync } from 'node:child_process'

import inquirer from 'inquirer'
import timeout from '../utils/timeout.js'
import { MultipleExecutionsError } from './errors.js'
import REPOSITORIES from '../constants/repositories.js'
import addNewLine from '../utils/addNewLine.js'

class AWS {
  constructor(answers) {
    this.pipelineName = REPOSITORIES.get(answers.repository).pipelineName
  }

  async #checkPipelineStarted() {
    const spinner = ora('Waiting for CodePipeline to trigger a new release...').start()
    const command = new ListPipelineExecutionsCommand({
      pipelineName: this.pipelineName,
      maxResults: 5,
    })

    const promise = async () => {
      const response = await this.client.send(command)

      if (response.pipelineExecutionSummaries[0].status !== 'InProgress') {
        await timeout(1000)
        return promise()
      }

      const dateNow = new Date()
      const diffInSecsToPipelineStart = differenceInSeconds(dateNow, response.pipelineExecutionSummaries[0].startTime)
      // Testing if this is a secure threshold to consider that the current pipeline started before this CLI run
      if (diffInSecsToPipelineStart >= 30) {
        spinner.fail('Could not track CodePipeline execution...')
        throw new Error(
          'The current pipeline execution started more than 30 seconds ago, maybe it is a previous execution. Aborting...',
        )
      }

      if (
        response.pipelineExecutionSummaries[0].status === 'InProgress' &&
        response.pipelineExecutionSummaries[1].status === 'InProgress'
      ) {
        spinner.fail('Could not track CodePipeline execution...')
        throw new MultipleExecutionsError()
      }

      return response
    }

    const result = await promise()
    spinner.succeed('CodePipeline triggered a new release...')
    this.pipelineExecutionId = result.pipelineExecutionSummaries[0].pipelineExecutionId
  }

  async #checkPipelineStatus() {
    const spinner = ora('Waiting for pipeline execution...').start()
    const command = new ListActionExecutionsCommand({
      pipelineName: this.pipelineName,
      filter: {
        pipelineExecutionId: this.pipelineExecutionId,
      },
    })

    const promise = async () => {
      const response = await this.client.send(command)
      const item = response.actionExecutionDetails[0]

      if (!item) {
        await timeout(1500)
        return promise()
      }

      if (item.status === 'InProgress') {
        await timeout(1500)
        spinner.start(
          `Pipeline running: \n    Stage: ${item.stageName}\n    Action: ${item.actionName}\n    Status: ${item.status}`,
        )
        return promise()
      }

      if (item.status === 'Abandoned') {
        spinner.fail(`The running action has been abandoned. Stage: ${item.stageName} | Action: ${item.actionName}`)
        throw new Error('The running action has been abandoned.')
      }

      if (item.status === 'Failed') {
        spinner.fail('Pipeline execution has failed.')
        throw new Error('Pipeline execution has failed.')
      }

      // Item can be succeeded but we need to check if the Pipeline itself is succeeded
      if (item.status === 'Succeeded') {
        const pipelineExecutionCommand = new GetPipelineExecutionCommand({
          pipelineName: this.pipelineName,
          pipelineExecutionId: this.pipelineExecutionId,
        })
        const pipelineState = await this.client.send(pipelineExecutionCommand)

        if (pipelineState.pipelineExecution.status !== 'Succeeded') {
          await timeout(1500)
          return promise()
        }
      }

      return response
    }

    const result = await promise()
    spinner.succeed('Pipeline finished...')
    return result
  }

  static async #revalidateSessionToken() {
    const { tokenCode } = await inquirer.prompt([
      {
        name: 'tokenCode',
        message: 'Inform your MFA token code',
      },
    ])

    const spinner = ora('Revalidating AWS session token...').start()

    try {
      const sourceCredentials = fromNodeProviderChain({ profile: 'hiplatf-iden' })
      const stsClient = new STSClient({ credentials: sourceCredentials })
      const sessionTokenCmd = new GetSessionTokenCommand({
        DurationSeconds: 129000,
        SerialNumber: 'arn:aws:iam::028351654420:mfa/luiz.felicio',
        TokenCode: tokenCode,
      })
      const response = await stsClient.send(sessionTokenCmd)
      execSync(`aws configure set aws_access_key_id ${response.Credentials.AccessKeyId} --profile hiplatf-iden-token`, {
        stdio: 'inherit',
      })
      execSync(
        `aws configure set aws_secret_access_key ${response.Credentials.SecretAccessKey} --profile hiplatf-iden-token`,
        { stdio: 'inherit' },
      )
      execSync(
        `aws configure set aws_session_token ${response.Credentials.SessionToken} --profile hiplatf-iden-token`,
        {
          stdio: 'inherit',
        },
      )
      spinner.succeed('Revalidated AWS credentials...')
    } catch (error) {
      spinner.fail('Could not revalidate AWS credentials...')
      console.log(error, 'Error while revalidating token...')
      process.exit(1)
    }
  }

  async #setupClient() {
    const spinner = ora('Configuring AWS client...')
    try {
      const deefaultCredentials = fromNodeProviderChain()
      this.client = new CodePipelineClient({ credentials: deefaultCredentials })
      const stsClient = new STSClient({ credentials: deefaultCredentials })
      const callerIdentityCmd = new GetCallerIdentityCommand()
      await stsClient.send(callerIdentityCmd)
      spinner.succeed('Configured AWS client...')
    } catch (error) {
      if (error.Code === 'InvalidClientTokenId' || error.Code === 'ExpiredToken') {
        spinner.info('Needs to revalidate AWS token...')
        await AWS.#revalidateSessionToken()
        return
      }

      console.log(error, 'Error while setuping AWS client...')
      process.exit(1)
    }
  }

  async start() {
    try {
      await this.#setupClient()
      await this.#checkPipelineStarted()
      await this.#checkPipelineStatus()
    } catch (error) {
      addNewLine()

      if (error.code === 'MultipleExecutions') {
        console.log(
          chalk.red(
            "There are multiple in progress executions for this Pipeline. Can't track which one belongs to this CLI run. Aborting...",
          ),
        )
      }

      if (error.code === 'ENOTFOUND') {
        console.log(chalk.red('Could not resolve the DNS. Are you online?'))
      }

      if (error.Code === 'ExpiredToken' || error.Code === 'InvalidClientTokenId') {
        console.log(chalk.red('Your AWS access token is invalid or expired...'))
      }

      // eslint-disable-next-line no-underscore-dangle
      if (error.__type === 'AccessDeniedException') {
        console.log(error.message, 'Access Denied')
      }

      process.exit(1)
    }
  }
}

export default AWS
