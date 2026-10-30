const WAITING_LABELS = ['needs-feedback', 'feedback-reminded', 'closed-no-feedback']

async function handleFeedbackReply({ github, context }) {
  const { issue, comment } = context.payload
  if (!issue || issue.pull_request || comment?.user?.type !== 'User') return

  const params = { ...context.repo, issue_number: issue.number }
  // Re-read state: the comment event may have queued behind a scheduled close.
  const { data: current } = await github.rest.issues.get(params)
  const labels = new Set(current.labels.map(label => typeof label === 'string' ? label : label.name))
  if (!WAITING_LABELS.some(label => labels.has(label))) return
  // A human's manual closure must not be undone by this automation.
  if (current.state === 'closed' && !labels.has('closed-no-feedback')) return

  if (current.state === 'closed') {
    await github.rest.issues.update({ ...params, state: 'open' })
  }
  for (const name of WAITING_LABELS) {
    if (labels.has(name)) await github.rest.issues.removeLabel({ ...params, name })
  }
  await github.rest.issues.addLabels({ ...params, labels: ['feedback-received'] })
}

module.exports = { handleFeedbackReply }
