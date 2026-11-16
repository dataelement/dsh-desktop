# dsh-linkedin-contacts

Finite LinkedIn contact-add pass for DSH Desktop. It reads a saved queue of people collected from
Apple Contacts and Facebook, reviews a batch of them against LinkedIn, and sends a connection
request only when identity is corroborated.

This is a standalone CLI, not a host plugin: it registers no slot and is never loaded by the
Desktop renderer. `package.json` deliberately has no `dsh.client` entry.

## Personal data stays outside the repository

The queue, the action ledger and the vCard baseline are private. They live under the DSH home and
are never committed:

```
~/.dsh/automations/linkedin-contact-add/state.json   # queue + action ledger (mode 0600)
~/.dsh/automations/linkedin-contact-add/*.vcf        # Apple Contacts baseline export
```

Override the ledger path with `--ledger FILE` or `DSH_LINKEDIN_LEDGER`. Nothing in this package
hard-codes a person, a profile URL or a machine path.

## Setup

1. In Chrome, open `chrome://inspect/#remote-debugging` and enable remote debugging. This exposes
   CDP on the running browser, so the signed-in LinkedIn session is used as-is and no cookies are
   copied. Chrome writes the port and browser id to `DevToolsActivePort`.
2. Node 22 or newer. The CDP client uses the built-in `WebSocket`, so the package has no runtime
   dependencies.

If Chrome refuses to expose the endpoint, `discoverEndpoint()` fails with
`DevToolsActivePort is incomplete`; re-check the toggle rather than falling back to a fresh profile,
which would have no LinkedIn session.

## Commands

```sh
node cli.mjs status [--limit N]      # queue counts and the next names
node cli.mjs scan  --limit 20        # review a batch, send nothing
node cli.mjs run   --limit 20        # review a batch and send confirmed requests
```

`run` and `scan` checkpoint the ledger after every person, so an interrupted batch resumes where it
stopped. Rows marked `request_sent_pending` are never selected again.

## What counts as confirmation

`assessCandidate()` in `ledger.mjs` is the whole policy:

| Evidence | Outcome |
| --- | --- |
| Already 1st degree, or an invitation is pending | `existing_connection`, no request |
| Headline names the contact's organization, or ≥ 2 mutual connections, or a previously verified profile | `confirmed`, request sent |
| Same name and nothing else | `held_ambiguous`, no request |
| Name differs | ignored |

A name alone never confirms a person. Unresolved name-only pairs in `current_request.possible_duplicates`
are held until `mergeDuplicate()` records corroborating evidence.

## Invitations

Requests are sent without a note. The runner clicks `Connect`, then `Send without a note`, then waits
for the profile to show `Pending` before recording success. A send that cannot be verified is recorded
as an error, never as sent, so it cannot be replayed blindly.

## Relationship to the previous Codex automation

The queue was built by the Codex heartbeat `finish-linkedin-contact-list` (still present under
`~/.codex/automations/`, now `PAUSED` so two runners cannot invite the same person). This package
owns the task from here: the Codex heartbeat should stay paused, and the daily
`propagate-new-contacts` automation remains paused as well.
