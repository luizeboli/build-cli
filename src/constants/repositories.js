const REPOSITORIES = new Map([
  ['static', { jenkinsJob: 'static-Deploy_RC', jenkinsParameters: ['Branch', 'Machine'], hasAwsPipeline: false }],
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
    'static-ticket-email-formatter',
    {
      jenkinsJob: 'static-ticket-email-formatter_Deploy_RC_S3',
      jenkinsParameters: ['Branch'],
      pipelineName: 'StaticTicketEmailFormatter-pipeline-qa-Pipeline',
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
    'static-history-playground',
    {
      jenkinsJob: 'static-history-playground_Deploy_RC_S3',
      jenkinsParameters: ['Branch'],
      hasAwsPipeline: true,
      pipelineName: 'StaticHistoryPlayground-pipeline-qa-Pipeline',
    },
  ],
  [
    'static-status-report',
    {
      jenkinsJob: 'static-status-report_Deploy_RC_S3',
      jenkinsParameters: ['Branch'],
      hasAwsPipeline: true,
      pipelineName: 'StaticStatusReport-pipeline-qa-Pipeline',
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
  [
    'static-agent-contact',
    {
      jenkinsJob: 'static-agent-contact_Deploy_RC_S3',
      jenkinsParameters: ['Branch'],
      pipelineName: 'StaticAgentContact-pipeline-qa-Pipeline',
      hasAwsPipeline: true,
    },
  ],
  [
    'static-chat-agent',
    {
      jenkinsJob: 'static-novoChatAgent_Deploy_RC_ECS',
      jenkinsParameters: ['Branch', 'ECSClusterName'],
      pipelineName: 'StaticChatAgent-pipeline-qa-Pipeline',
      hasAwsPipeline: true,
    },
  ],
])

export default REPOSITORIES
