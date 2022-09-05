// eslint-disable-next-line import/prefer-default-export
export class MultipleExecutionsError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MultipleExecutionsError'
    this.code = 'MultipleExecutions'
  }
}
