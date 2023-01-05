export default {
  jenkins: {
    baseUrl: process.env.JENKINS_BASE_URL || 'https://ci.qa.directtalk.com.br/jenkins',
    healthCheck: process.env.JENKINS_HEALTH_CHECK_PATH || '/login',
    user: process.env.JENKINS_USER || 'luiz.felicio@hiplatform.com',
    password: process.env.JENKINS_USER_PASS || '11250c20b154e611b820b7893da3668aff',
  },
}
