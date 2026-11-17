# @fopost/n8n-nodes-fopost

[![npm version](https://img.shields.io/npm/v/@fopost/n8n-nodes-fopost.svg)](https://www.npmjs.com/package/@fopost/n8n-nodes-fopost)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Official [n8n](https://n8n.io) community node for [FoPost](https://fopost.com) — schedule and
publish social media posts, manage connected accounts and media, work the social inbox, read
analytics, and start workflows from FoPost publishing, inbox and account events.

[n8n](https://n8n.io) is a [fair-code licensed](https://docs.n8n.io/reference/license/)
workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) ·
[Trigger](#trigger) · [Templates](#workflow-templates) · [Compatibility](#compatibility) ·
[Resources](#resources)

## Installation

Install through n8n's Community Nodes UI:

1. Go to **Settings → Community Nodes**.
2. Select **Install**.
3. Enter `@fopost/n8n-nodes-fopost` as the npm package name.
4. Agree to the risks of using community nodes and select **Install**.

For a self-hosted instance you can install it manually instead:

```bash
npm install @fopost/n8n-nodes-fopost
```

Follow n8n's [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
if you run n8n in Docker.

## Credentials

The node authenticates with a FoPost API key.

1. Sign in at [fopost.com](https://fopost.com) and open **Settings → API Keys**.
2. Create a key with the scopes your workflow needs (`posts`, `publish`, `accounts`, `media`,
   `analytics`, `inbox`, `webhooks`, and so on). A key can be bound to a single workspace, which confines every
   request to it.
3. In n8n, create a new **FoPost API** credential and paste the key.

The key travels as the `X-API-Key` header on every request. The credential's **Test** button
calls `GET /v1/workspaces`, so a green check means the key is live and has at least read
access.

**Base URL** defaults to `https://api.fopost.com` and only needs changing for a non-production
FoPost deployment.

## Operations

| Resource       | Operations                                                                                            |
| :------------- | :---------------------------------------------------------------------------------------------------- |
| **Post**       | Create · Get · Get Many · Update · Delete · Publish · Cancel · Duplicate · Preflight · Get Deliveries |
| **Account**    | Get · Get Many · Get Health · Validate · Refresh Token                                                |
| **Workspace**  | Get · Get Many · Create                                                                               |
| **Media**      | Upload · Get Many · Delete                                                                            |
| **Inbox**      | Get Many · Reply                                                                                      |
| **Label**      | Get Many · Create · Delete                                                                            |
| **Analytics**  | Get Overview · Get Time Series · Get Top Posts                                                        |
| **Automation** | Get · Get Many · Toggle · Trigger                                                                     |

Notes worth knowing:

- **Workspace, account and label pickers are live dropdowns.** The account and label lists
  reload when you change the selected workspace.
- **Publishing is two steps.** `Create` makes a draft or scheduled post; `Publish` queues it
  for delivery. Publish answers when delivery is queued, not when the post is live — use the
  trigger or `Get Deliveries` to learn the outcome.
- **Add to Queue** (Create and Update → Additional Fields) places the post in the next free slot
  of its accounts' posting schedule instead of a fixed time.
- **Inbox → Get Many** lists comments, mentions, reviews and direct messages, filtered by type,
  state, platform or account; **Reply** answers one as the connected account.
- **Preflight** checks a post against every target platform's rules without sending anything,
  and **Publish → Dry Run** validates delivery the same way.
- **Media Upload** reads an incoming binary field and stores the file in the workspace media
  library (up to 50 MB), returning a URL you can attach to a post. The bytes go straight to
  storage over a short-lived signed URL, never through the API.
- **Return All** pages through the API for you; leave it off and set a **Limit** instead.
- **Continue On Fail** is honoured: a failing item is emitted as `{ "error": "..." }` rather
  than stopping the run.

## Trigger

The **FoPost Trigger** node registers a webhook with FoPost when the workflow is activated and
removes it when the workflow is deactivated. Pick a workspace and the events you care about:

- **Posts:** `post.scheduled`, `post.published`, `post.partially_failed`, `post.failed`,
  `post.deleted`
- **Deliveries** (one account of a post): `delivery.published`, `delivery.failed`,
  `delivery.delayed`
- **Accounts:** `account.connected`, `account.disconnected`, `account.health_changed`
- **Blog:** `article.published`
- **Inbox:** `inbox.comment_received`, `inbox.mention_received`, `inbox.message_received`,
  `inbox.review_received`, `inbox.reply_sent`. These carry IDs only; load the text with
  **Inbox → Get Many**.
- **Automations:** `automation.triggered`, `automation.completed`, `automation.failed`

Every incoming request is verified before the workflow runs: FoPost signs the raw request body
with HMAC-SHA256 using the secret it issues at webhook creation and sends it as
`X-FoPost-Signature: sha256=<hex>`. A request whose signature does not match is answered with
`401` and starts nothing.

## Compatibility

- n8n 1.x and 2.x (`n8nNodesApiVersion` 1); tested on n8n 2.47
- No runtime dependencies

## Workflow templates

Ready-to-use workflows live in [`templates/`](templates), each with setup notes on the canvas:

- GitHub release → drafts for X, Bluesky and LinkedIn → Slack approval → publish
- New blog post (RSS) → one queued post on every account
- New Shopify product → Instagram and Facebook photo post
- Google Sheet row → scheduled post
- Weekly analytics report → Slack
- New brand mention → Slack alert

Two minimal examples live in [`examples/`](examples): create and publish a post, and react to a
published post.

## Resources

- [FoPost documentation](https://fopost.com/docs)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Report an issue](https://github.com/fopost/fopost-n8n/issues)
- Support: [fopost.com/contact](https://fopost.com/contact)

## Development

```bash
npm install
npm run build               # n8n-node build: tsc + icons → dist/
npm run lint                # n8n-node lint: the rules n8n's verification scan applies
npm test                    # jest + nock, fully offline
npm run validate:templates  # structure and sticky-note checks for templates/
```

To try the node in a local n8n instance, run `npm run dev`, which builds, watches and starts
n8n with this package loaded.

Releases are published by the `Release` GitHub Actions workflow on a `v<version>` tag, with npm
provenance. A publish from a laptop is refused: n8n only verifies packages published from CI
with provenance.

## License

[MIT](LICENSE) © Porter Bridge, LLC
