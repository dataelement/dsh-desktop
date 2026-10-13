import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks=vi.hoisted(()=>({access:vi.fn(),import:vi.fn()}));
vi.mock('../packages/ppt-runtime/core/lib/office-font-access.js',()=>({prepareOfficeFontAccess:mocks.access}));
vi.mock('../packages/ppt-runtime/core/lib/personal-template-import.js',()=>({runPersonalTemplateImport:mocks.import}));
const {prepareOfficeFontAccess}=await vi.importActual('../packages/ppt-runtime/core/lib/office-font-access.js');
const {PersonalTemplateLibrary}=await import('../packages/ppt-runtime/core/lib/personal-templates.js');
let root,library,audits;
beforeEach(async()=>{
  vi.resetAllMocks();root=await mkdtemp(path.join(os.tmpdir(),'ppt-font-access-'));audits=[];
  library=new PersonalTemplateLibrary({root,appendAudit:async(_session,event)=>audits.push(event)});
  mocks.access.mockResolvedValue({status:'ready'});
  mocks.import.mockImplementation(async job=>({draftId:job.draftId,template:{}}));
});
afterEach(async()=>{await rm(root,{recursive:true,force:true});});

it('opens only the optional Office font-cache directory and releases the descriptor',async()=>{
  const close=vi.fn().mockResolvedValue(),read=vi.fn().mockResolvedValue(null),openDirectory=vi.fn().mockResolvedValue({read,close});
  expect(await prepareOfficeFontAccess({platform:'darwin',home:'/isolated-user',openDirectory})).toEqual({status:'ready'});
  expect(openDirectory.mock.calls).toEqual([['/isolated-user/Library/Group Containers/UBF8T346G9.Office/FontCache']]);
  expect(close).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(1);
});
it.each(['win32','linux'])('keeps %s font discovery unchanged',async platform=>{
  const openDirectory=vi.fn();expect(await prepareOfficeFontAccess({platform,openDirectory})).toEqual({status:'not-required'});
  expect(openDirectory).toHaveBeenCalledTimes(0);
});
it.each([['ENOENT','absent'],['ENOTDIR','absent'],['EACCES','restricted'],['EPERM','restricted']])('preserves optional-font handling for %s',async(code,status)=>{
  const openDirectory=vi.fn().mockRejectedValue(Object.assign(new Error(code),{code}));
  expect(await prepareOfficeFontAccess({platform:'darwin',home:'/isolated-user',openDirectory})).toEqual({status});
});
it('reports unexpected filesystem errors',async()=>{
  const error=Object.assign(new Error('disk failure'),{code:'EIO'});
  await expect(prepareOfficeFontAccess({platform:'darwin',home:'/isolated-user',openDirectory:vi.fn().mockRejectedValue(error)})).rejects.toBe(error);
});
it('reports descriptor cleanup errors separately from an optional access denial',async()=>{
  const error=Object.assign(new Error('close failure'),{code:'EPERM'});
  const openDirectory=vi.fn().mockResolvedValue({read:vi.fn().mockResolvedValue(null),close:vi.fn().mockRejectedValue(error)});
  await expect(prepareOfficeFontAccess({platform:'darwin',home:'/isolated-user',openDirectory})).rejects.toBe(error);
});
it('closes the directory when enumerating its first entry is denied',async()=>{
  const close=vi.fn().mockResolvedValue(),error=Object.assign(new Error('denied'),{code:'EPERM'});
  const openDirectory=vi.fn().mockResolvedValue({read:vi.fn().mockRejectedValue(error),close});
  expect(await prepareOfficeFontAccess({platform:'darwin',home:'/isolated-user',openDirectory})).toEqual({status:'restricted'});
  expect(close).toHaveBeenCalledTimes(1);
});
it('checks access in upload-start before chunks, shares the result, and preserves auditing',async()=>{
  let release;mocks.access.mockReturnValue(new Promise(resolve=>{release=resolve;}));
  let returned=false;
  const starting=library.uploadStart('owner',{fileName:'template.pptx',size:4}).then(value=>{returned=true;return value;});
  await vi.waitFor(()=>expect(release).toBeTypeOf('function'));
  await vi.waitFor(()=>expect(mocks.access).toHaveBeenCalledTimes(1));
  expect(returned).toBe(false);expect(mocks.import).toHaveBeenCalledTimes(0);
  release({status:'ready'});const upload=await starting;
  await library.uploadChunk('owner',{uploadId:upload.uploadId,offset:0,base64:'UEsDBA=='});
  await library.prepare('owner',{uploadId:upload.uploadId,requestId:randomUUID()});
  expect(mocks.access).toHaveBeenCalledTimes(1);expect(mocks.import).toHaveBeenCalledTimes(1);
  expect(audits.map(event=>[event.operation,event.status])).toContainEqual(['upload-personal-template','completed']);
  expect(await readdir(path.join(root,'personal-templates/uploads'))).toEqual([]);
});
it('checks legacy Base64 imports before starting document conversion',async()=>{
  let release;mocks.access.mockReturnValue(new Promise(resolve=>{release=resolve;}));
  const preparing=library.prepare('owner',{fileName:'legacy.pptx',base64:'UEsDBA=='});
  await vi.waitFor(()=>expect(mocks.access).toHaveBeenCalledTimes(1));expect(mocks.import).toHaveBeenCalledTimes(0);
  release({status:'ready'});await preparing;expect(mocks.import).toHaveBeenCalledTimes(1);
});
it('validates an upload before requesting font access',async()=>{
  await expect(library.uploadStart('owner',{fileName:'bad.txt',size:4})).rejects.toThrow('PPTX');
  await expect(library.uploadStart('owner',{fileName:'bad.pptx',size:0})).rejects.toThrow('大小');
  expect(mocks.access).toHaveBeenCalledTimes(0);
});
it('continues with the SDK fallback policy after denied access',async()=>{
  mocks.access.mockResolvedValue({status:'restricted'});
  await library.prepare('owner',{fileName:'fallback.pptx',base64:'UEsDBA=='});
  expect(mocks.import).toHaveBeenCalledTimes(1);
});
it('releases a failed start and retries the access check on the next upload',async()=>{
  mocks.access.mockRejectedValueOnce(new Error('disk failure'));
  await expect(library.uploadStart('owner',{fileName:'fail.pptx',size:4})).rejects.toThrow('disk failure');
  expect(await readdir(path.join(root,'personal-templates/uploads'))).toEqual([]);
  await library.uploadStart('owner',{fileName:'retry.pptx',size:4});expect(mocks.access).toHaveBeenCalledTimes(2);
});
it('honors cancellation during an access check before starting the import process',async()=>{
  // A legacy request also uses the same check after it has an owned upload ID.
  const upload=await library.uploads.start('owner',{fileName:'cancel.pptx',size:4});
  await library.uploads.append('owner',{uploadId:upload.uploadId,offset:0,base64:'UEsDBA=='});
  let release;mocks.access.mockReturnValue(new Promise(resolve=>{release=resolve;}));
  const preparing=library.prepare('owner',{uploadId:upload.uploadId,requestId:randomUUID()});
  const outcome=preparing.catch(error=>error);
  await vi.waitFor(()=>expect(mocks.access).toHaveBeenCalledTimes(1));
  const cancelled=library.cancelUpload('owner',upload.uploadId);
  release({status:'ready'});await cancelled;expect((await outcome).name).toBe('AbortError');
  expect(mocks.import).toHaveBeenCalledTimes(0);expect(await readdir(path.join(root,'personal-templates/uploads'))).toEqual([]);
});
