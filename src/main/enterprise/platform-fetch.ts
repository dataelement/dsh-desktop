export type EnterpriseFetch = (
  input: string,
  init?: RequestInit
) => Promise<Response>

export function createEnterpriseFetch(fetchImpl: EnterpriseFetch): EnterpriseFetch {
  return async (input, init = {}) => {
    if (init.redirect !== undefined && init.redirect !== 'error') {
      throw new Error('Enterprise requests cannot follow redirects.')
    }
    return fetchImpl(input, {
      ...init,
      redirect: 'error'
    })
  }
}

export function createElectronEnterpriseFetch(netFetch: EnterpriseFetch): EnterpriseFetch {
  return createEnterpriseFetch(netFetch)
}
