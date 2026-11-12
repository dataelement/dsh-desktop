import { describe,it,expect } from 'vitest'
import { startMarketDownload,allowedMarketDownload } from '../src/main/runtime/market-download'
describe('native market downloads',()=>{
 it('rejects private, credentialed and unapproved destinations',()=>{
  for(const url of ['http://github.com/a','https://127.0.0.1/a','https://github.com.evil.test/a','https://user:pass@github.com/a','https://github.com:444/a']) expect(allowedMarketDownload(url)).toBe(false)
  expect(allowedMarketDownload('https://codeload.github.com/o/r/tar.gz/abc')).toBe(true)
 })
 it('requires authentication and validates every redirect',async()=>{
  let calls=0
  const bridge=await startMarketDownload(async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})})
  try{
   const url=new URL(bridge.url);url.searchParams.set('url','https://github.com/o/r')
   expect((await fetch(url)).status).toBe(403);expect(calls).toBe(0)
   expect((await fetch(url,{headers:{authorization:`Bearer ${bridge.token}`}})).status).toBe(400);expect(calls).toBe(1)
  }finally{bridge.close()}
 })
})
