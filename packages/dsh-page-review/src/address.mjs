export const SEARCH_ENGINES = {
  bing: { name: '必应', url: 'https://www.bing.com/search', param: 'q' },
  baidu: { name: '百度', url: 'https://www.baidu.com/s', param: 'wd' },
  google: { name: 'Google', url: 'https://www.google.com/search', param: 'q' },
}

export function resolveAddress(value, hostOrigin = '', searchEngine = 'bing') {
  const input = String(value || '').trim()
  if (!input) throw Error('请输入网址或搜索内容')
  if (input === 'about:blank') return input
  // Explicit schemes are addresses, never search terms. Local host:port is not a scheme.
  const explicit =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ||
    (/^[a-z][a-z0-9+-]*:/i.test(input) && !/^localhost:\d/i.test(input))
  if (explicit && !/^https?:\/\//i.test(input))
    throw Error('只支持 HTTP(S) 网页')
  if (/^[^\s/@]+:[^\s/@]+@/.test(input)) throw Error('网址不能包含用户名或密码')
  const local =
    /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|\[::1\])(?::\d+)?(?:[/?#]|$)/i.test(
      input,
    )
  const domain =
    /^(?:[\p{L}\p{N}_-]+\.)+[\p{L}\p{N}-]{2,}(?::\d+)?(?:[/?#]|$)/u.test(input)
  const port = /^\d{2,5}$/.test(input) && Number(input) <= 65535
  if (explicit || local || domain || port) {
    let u
    try {
      u = new URL(
        explicit
          ? input
          : port
            ? 'http://127.0.0.1:' + input
            : (local ? 'http://' : 'https://') + input,
      )
    } catch {
      throw Error('网址格式不正确，请检查后重试')
    }
    if (u.username || u.password) throw Error('网址不能包含用户名或密码')
    if (hostOrigin) {
      const host = new URL(hostOrigin),
        loopback = (name) => ['localhost', '127.0.0.1', '[::1]'].includes(name)
      if (
        u.origin === host.origin ||
        (loopback(u.hostname) &&
          loopback(host.hostname) &&
          u.port === host.port)
      )
        throw Error('请在浏览器中打开其他网站，避免嵌套 DSH 自身')
    }
    return u.href
  }
  const engine = SEARCH_ENGINES[searchEngine] || SEARCH_ENGINES.bing
  const url = new URL(engine.url)
  url.searchParams.set(engine.param, input)
  return url.href
}
