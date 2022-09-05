import nodeFetch from 'node-fetch'
import { oraPromise } from 'ora'

const fetch = (url, options = {}) => {
  const useBaseUrl = !url.startsWith(process.env.JENKINS_BASE_URL)
  const urlToFetch = useBaseUrl ? `${process.env.JENKINS_BASE_URL}${url}` : url

  return nodeFetch(urlToFetch, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Basic ${Buffer.from(`${process.env.JENKINS_USER}:${process.env.JENKINS_USER_PASS}`).toString(
        'base64',
      )}`,
    },
  })
}

export const fetchWithTimeout = async ({ url, timeoutMs = 10000, oraOptions, fetchOptions = {} }) => {
  const abortController = new AbortController()
  const id = setTimeout(() => abortController.abort(), timeoutMs)
  const response = await oraPromise(async () => {
    const apiRes = await fetch(url, {
      ...fetchOptions,
      signal: abortController.signal,
    })
    if (!apiRes.ok) {
      throw apiRes
    }
    return apiRes
  }, oraOptions)
  clearTimeout(id)
  return response
}

export default fetch
