export default {
  jenkins: {
    baseUrl: process.env.JENKINS_BASE_URL,
    healthCheck: process.env.JENKINS_HEALTH_CHECK_PATH,
    user: process.env.JENKINS_USER,
    password: process.env.JENKINS_USER_PASS,
  },
}
