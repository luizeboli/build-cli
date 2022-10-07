const REPOSITORIES = new Map([
  ['static-ticket', { jenkinsJob: 'static-ticket_Deploy_RC', jenkinsParameters: ['Branch'], hasAwsPipeline: false }],
  [
    'static-mail-accounts',
    {
      jenkinsJob: 'static-mail-accounts_Deploy_RC_S3',
      jenkinsParameters: ['Branch'],
      pipelineName: 'StaticMailAccounts-pipeline-qa-Pipeline',
      hasAwsPipeline: true,
    },
  ],
  [
    'static-ticket-email-accounts',
    {
      jenkinsJob: 'static-ticket-email-accounts_Deploy_RC_S3',
      jenkinsParameters: ['Branch'],
      pipelineName: 'StaticTicketEmailAccounts-pipeline-qa-Pipeline',
      hasAwsPipeline: true,
    },
  ],
  [
    'static-history',
    {
      jenkinsJob: 'static-history_Deploy_RC_ECS',
      jenkinsParameters: ['Branch'],
      hasAwsPipeline: true,
      pipelineName: 'StaticHistory-pipeline-qa-Pipeline',
    },
  ],
  [
    'ticket',
    {
      jenkinsJob: 'ticket_Deploy_RC',
      jenkinsParameters: ['Branch'],
      hasAwsPipeline: false,
    },
  ],
  [
    'ticket-ui',
    {
      jenkinsJob: 'TicketUIServices_Deploy_RC',
      jenkinsParameters: ['Branch', 'RunTests', 'Machine'],
    },
  ],
])

export default REPOSITORIES
