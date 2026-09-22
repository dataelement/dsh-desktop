import { verify } from 'node:crypto'

export function verifyMarketLease(receipt, account, device, publicKey, now = Date.now()) {
  if (!publicKey) throw new Error('Enterprise marketplace verification key is not configured.')
  if (!receipt || typeof receipt.payload !== 'string' || typeof receipt.signature !== 'string') throw new Error('Invalid market policy.')
  const bytes = Buffer.from(receipt.payload, 'base64url')
  if (!verify(null, bytes, publicKey.replace(/\\n/gu, '\n'), Buffer.from(receipt.signature, 'base64url'))) throw new Error('Market policy signature mismatch.')
  const policy = JSON.parse(bytes.toString('utf8'))
  if (policy.tenant_id !== account.tenant.id || policy.user_id !== account.user.id || policy.device_id !== device ||
      !Number.isSafeInteger(policy.expires_at) || !Number.isSafeInteger(policy.issued_at) ||
      policy.expires_at * 1000 <= now || policy.issued_at * 1000 > now + 60_000 ||
      policy.expires_at - policy.issued_at > 3600 || !Array.isArray(policy.policies)) throw new Error('Enterprise usage authorization expired or belongs to another account.')
  return policy
}

