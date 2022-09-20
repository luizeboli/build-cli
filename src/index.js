#!/usr/bin/env node

import 'dotenv/config'
import inquirer from 'inquirer'
import Rx, { tap } from 'rxjs'

import REPOSITORIES from './constants/repositories.js'
import Jenkins from './jenkins/index.js'
import AWS from './aws/index.js'
import addNewLine from './utils/addNewLine.js'

const answers = {}
const updateAnswers = (answer) => {
  answers[answer.name] = answer.answer
}

const prompts = new Rx.Subject()

inquirer
  .prompt(prompts)
  .ui.process.pipe(tap(updateAnswers))
  .subscribe({
    next: (answer) => {
      if (answer.name === 'operation') {
        if (answer.answer === 'Get last sucessful build') {
          prompts.next({
            name: 'repository',
            message: 'From which repository?',
            type: 'list',
            choices: Array.from(REPOSITORIES.keys()),
          })
          prompts.complete()
        }

        if (answer.answer === 'Create a build') {
          prompts.next({
            name: 'repository',
            message: 'Which repository do you want to build?',
            type: 'list',
            choices: Array.from(REPOSITORIES.keys()),
          })
        }
      }

      if (answer.name === 'repository' && answers.operation === 'Create a build') {
        const { jenkinsParameters, hasAwsPipeline } = REPOSITORIES.get(answer.answer)

        jenkinsParameters?.forEach((parameter) => {
          prompts.next({
            name: `jenkinsParameter${parameter}`,
            message: `Build parameter - ${parameter}:`,
          })
        })

        if (hasAwsPipeline) {
          prompts.next({
            name: 'trackBuild',
            message: 'Which build do you want to track?',
            choices: ['Jenkins', 'AWS', 'Both'],
            type: 'list',
          })
        }

        prompts.complete()
      }
    },
    complete: async () => {
      addNewLine()

      const jenkins = new Jenkins(answers)
      const aws = new AWS(answers)

      if (answers.operation === 'Get last sucessful build') {
        await jenkins.printLastSuccessfulBuild()
        return
      }

      const trackJenkins =
        ['Jenkins', 'Both'].includes(answers.trackBuild) || !REPOSITORIES.get(answers.repository)?.hasAwsPipeline
      const trackAws = ['AWS', 'Both'].includes(answers.trackBuild)

      if (trackJenkins) {
        await jenkins.start()
      }

      if (trackAws) {
        await aws.start()
      }
    },
  })

prompts.next({
  name: 'operation',
  message: 'What do you want to do?',
  type: 'list',
  choices: ['Create a build', 'Get last sucessful build'],
})
