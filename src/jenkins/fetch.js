import nodeFetch from 'node-fetch'
import { oraPromise } from 'ora'
import config from '../config/index.js'

const fetch = (url, options = {}) => {
  const useBaseUrl = !url.startsWith(config.jenkins.baseUrl)
  const urlToFetch = useBaseUrl ? `${config.jenkins.baseUrl}${url}` : url

  return nodeFetch(urlToFetch, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Basic ${Buffer.from(`${config.jenkins.user}:${config.jenkins.password}`).toString('base64')}`,
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
