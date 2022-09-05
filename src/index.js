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
      if (answer.name === 'repositoryToBuild') {
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
      }

      prompts.complete()
    },
    complete: async () => {
      addNewLine()

      const trackJenkins =
        ['Jenkins', 'Both'].includes(answers.trackBuild) || !REPOSITORIES.get(answers.repositoryToBuild).hasAwsPipeline
      const trackAws = ['AWS', 'Both'].includes(answers.trackBuild)

      if (trackJenkins) {
        const jenkins = new Jenkins(answers)
        await jenkins.start()
      }

      if (trackAws) {
        const aws = new AWS(answers)
        await aws.start()
      }
    },
  })

prompts.next({
  name: 'repositoryToBuild',
  message: 'Which repository do you want to build?',
  type: 'list',
  choices: Array.from(REPOSITORIES.keys()),
})
