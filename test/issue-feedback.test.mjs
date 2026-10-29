import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { describe, expect, it, vi } from 'vitest'

const { handleFeedbackReply } = createRequire(import.meta.url)('../.github/scripts/issue-feedback.cjs')

function fixture({ labels = ['needs-feedback', 'feedback-reminded'], state = 'open', type = 'User', pullRequest = false } = {}) {
  const context = {
    repo: { owner: 'fixture', repo: 'desktop' },
    payload: { issue: { number: 42, ...(pullRequest ? { pull_request: {} } : {}) }, comment: { user: { type } } }
  }
  const issues = {
    get: vi.fn().mockResolvedValue({ data: { state, labels: labels.map(name => ({ name })) } }),
    update: vi.fn().mockResolvedValue({}),
    removeLabel: vi.fn().mockResolvedValue({}),
    addLabels: vi.fn().mockResolvedValue({})
  }
  return { context, github: { rest: { issues } }, issues }
}

describe('issue feedback lifecycle', () => {
  it('exits the waiting workflow when a human replies', async () => {
    const value = fixture()
    await handleFeedbackReply(value)
    expect(value.issues.removeLabel.mock.calls.map(([args]) => args.name)).toEqual(['needs-feedback', 'feedback-reminded'])
    expect(value.issues.addLabels).toHaveBeenCalledWith({ owner: 'fixture', repo: 'desktop', issue_number: 42, labels: ['feedback-received'] })
    expect(value.issues.update).not.toHaveBeenCalled()
  })

  it('uses fresh state and reopens an automatic closure before clearing markers', async () => {
    const value = fixture({ state: 'closed', labels: ['needs-feedback', 'feedback-reminded', 'closed-no-feedback'] })
    await handleFeedbackReply(value)
    expect(value.issues.update).toHaveBeenCalledWith({ owner: 'fixture', repo: 'desktop', issue_number: 42, state: 'open' })
    expect(value.issues.update.mock.invocationCallOrder[0]).toBeLessThan(value.issues.removeLabel.mock.invocationCallOrder[0])
    expect(value.issues.removeLabel).toHaveBeenCalledTimes(3)
  })

  it.each([
    { type: 'Bot' },
    { pullRequest: true },
    { labels: ['bug'] },
    { state: 'closed', labels: ['needs-feedback'] }
  ])('does not change unrelated, bot, PR or manually closed cases: %j', async options => {
    const value = fixture(options)
    await handleFeedbackReply(value)
    expect(value.issues.removeLabel).not.toHaveBeenCalled()
    expect(value.issues.addLabels).not.toHaveBeenCalled()
    expect(value.issues.update).not.toHaveBeenCalled()
  })

  it('surfaces API failures rather than reporting successful feedback handling', async () => {
    const value = fixture()
    value.issues.removeLabel.mockRejectedValue(new Error('permission denied'))
    await expect(handleFeedbackReply(value)).rejects.toThrow('permission denied')
    expect(value.issues.addLabels).not.toHaveBeenCalled()
  })

  it('limits the scheduled action to opted-in issues with a 14 + 7 day policy', () => {
    const workflow = parse(readFileSync('.github/workflows/issue-feedback.yml', 'utf8'))
    const options = workflow.jobs['follow-up'].steps[0].with
    expect(workflow.on.schedule).toHaveLength(1)
    expect(options['only-issue-labels']).toBe('needs-feedback')
    expect(options['exempt-issue-labels']).toBe('keep-open')
    expect(options['days-before-issue-stale']).toBe(14)
    expect(options['days-before-issue-close']).toBe(7)
    expect(options['days-before-pr-stale']).toBe(-1)
    expect(options['days-before-pr-close']).toBe(-1)
    expect(options['close-issue-reason']).toBe('not_planned')
    expect(options['close-issue-label']).toBe('closed-no-feedback')
    expect(workflow.concurrency['cancel-in-progress']).toBe(false)
  })
})
