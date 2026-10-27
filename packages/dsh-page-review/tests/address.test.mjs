import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveAddress } from '../src/address.mjs'

test('地址栏识别域名、中文域名、本地端口和 IPv6，不误发搜索', () => {
  for (const [input, url] of [
    [' example.com/docs?q=test ', 'https://example.com/docs?q=test'],
    ['example.com:8080/path', 'https://example.com:8080/path'],
    ['https://example.com/a b', 'https://example.com/a%20b'],
    ['例子.中国', 'https://xn--fsqu00a.xn--fiqs8s/'],
    ['localhost:3000/app', 'http://localhost:3000/app'],
    ['[::1]:8016/#test', 'http://[::1]:8016/#test'],
    ['8016', 'http://127.0.0.1:8016/'],
    ['about:blank', 'about:blank'],
  ])
    assert.equal(resolveAddress(input), url, input)
})
test('关键词使用所选搜索引擎，特殊字符和中文保留原意', () => {
  for (const query of [
    'DeepSeek 官网',
    '天气 & 日历 #2026',
    '人工智能网站',
    'how to build a browser',
  ]) {
    const bing = new URL(resolveAddress(query))
    assert.equal(bing.hostname, 'www.bing.com')
    assert.equal(bing.searchParams.get('q'), query)
    const baidu = new URL(resolveAddress(query, '', 'baidu'))
    assert.equal(baidu.hostname, 'www.baidu.com')
    assert.equal(baidu.searchParams.get('wd'), query)
    const google = new URL(resolveAddress(query, '', 'google'))
    assert.equal(google.hostname, 'www.google.com')
    assert.equal(google.searchParams.get('q'), query)
  }
})
test('禁止的协议和凭据不会被当成搜索关键词提交，空输入不导航', () => {
  for (const input of [
    '',
    ' ',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'ftp://example.com',
    'data:text/html,test',
    'https://name:secret@example.com',
    'name:secret@example.com',
  ])
    assert.throws(() => resolveAddress(input), undefined, input)
  assert.throws(
    () => resolveAddress('localhost:43129', 'http://127.0.0.1:43129'),
    /DSH/,
  )
  assert.equal(
    new URL(resolveAddress('test query', '', 'https://evil.example')).hostname,
    'www.bing.com',
  )
})
