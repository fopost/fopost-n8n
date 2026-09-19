# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What This Is

`n8n-nodes-fopost` — the official [n8n](https://n8n.io) community node package for FoPost,
published to npm. It ships one credential (`FoPost API`), one action node (`FoPost`) and one
webhook trigger node (`FoPost Trigger`) that talk to the FoPost REST API at
`https://api.fopost.com/v1`.

The `n8n-nodes-` package-name prefix is **required** for n8n to discover the package. Never
rename it.

## Brand Rules

- The product is **FoPost** (`fopost.com`). Never write "OwlStack" — retired Aug 2026.
- Never write an email address. Support is https://fopost.com/contact and GitHub issues.
- Never name AI providers/models, infrastructure vendors, or any person.

## No SDK Dependency — On Purpose

This package does **not** depend on `@fopost/sdk`, and must not start.

Every request goes through `this.helpers.httpRequestWithAuthentication` so it flows through
n8n's own proxy, credential decryption and request-logging layers. A bundled HTTP client would
bypass all three: proxies configured on the n8n instance would be ignored, the API key would
have to be read out of the credential store by hand, and requests would not appear in n8n's
logs. n8n's verified-community-node review also expects a node to carry no runtime
dependencies it does not need.

The same rule is why Media → Upload uses the API's direct-upload flow (`POST /media/presign`,
`PUT` the bytes to the signed URL through `this.helpers.httpRequest`, then
`POST /media/presign/{uploadId}/complete`) instead of pulling in `form-data` for a multipart
body. The `PUT` carries only the headers the presign answer returned and no API key.

If a future task says "reuse the SDK", the answer is no — port the endpoint shape instead.

## Architecture

```
credentials/FoPostApi.credentials.ts   API key field, generic X-API-Key auth, credential test
nodes/FoPost/
  FoPost.node.ts                       programmatic node: resource/operation router, loadOptions
  GenericFunctions.ts                  request helpers, pagination, option mapping
  descriptions/*.ts                    one file per resource, INodeProperties only
  fopost.svg / fopost.dark.svg         node icon (the real FoPost brand mark)
nodes/FoPostTrigger/
  FoPostTrigger.node.ts                webhook trigger: checkExists/create/delete + signature check
test/
  harness.ts                           fake IExecuteFunctions / IHookFunctions / IWebhookFunctions
  *.test.ts                            jest + nock, offline
```

A request flows: node parameter → `executeX()` helper in `FoPost.node.ts` → `foPostApiRequest`
→ `helpers.httpRequestWithAuthentication` → `unwrap()` strips the `{ data: ... }` envelope.

Descriptions carry no logic. Adding an operation is a new entry in the resource's
`descriptions/*.ts` plus a branch in the matching `executeX()` function.

## API Contract

- Base URL `https://api.fopost.com`, all paths under `/v1`. Overridable per credential.
- Auth is the header `X-API-Key: <key>` — **not** Bearer.
- Success envelope: `{ "data": ... }`. Paginated lists add
  `meta: { current_page, per_page, total, last_page, from, to }` (snake_case).
- Error envelope: `{ "error": "<machine_code>", "message": "<human text>" }`; `402` may carry
  `upgrade_url`. Errors are wrapped in `NodeApiError` so n8n renders them.
- Only `GET /v1/posts` is truly paginated. Every other list answers a plain array, so
  `returnAll` there is a client-side slice (`foPostApiRequestList`).
- Retries and backoff are n8n's job, not the node's. Do not add a retry loop.

### Webhooks

- `POST /v1/webhooks` with `{ workspaceId, url, events }` returns the signing `secret`
  **once**, at creation. It is stored in the workflow's static data.
- FoPost delivers with `X-FoPost-Signature: sha256=<hex>`, an HMAC-SHA256 of the **raw** body
  keyed on that secret, plus `X-FoPost-Event` and `X-FoPost-Delivery`.
- Events (from `WEBHOOK_EVENTS` in the API's `handlers/webhooks.ts`): `post.published`,
  `post.failed`, `post.partially_failed`, `delivery.published`, `delivery.failed`,
  `delivery.delayed`, `account.health_changed`. There is no `account.disconnected` event —
  a disconnect arrives as `account.health_changed`.
- `checkExists` deletes an orphaned webhook whose secret we no longer hold, so `create` mints a
  fresh pair. Without the secret nothing can be verified, so keeping the orphan would be worse.

## Node Version

**Node 22+ only.** `n8n-workflow` pulls `@n8n/expression-runtime` -> `isolated-vm`, a native
addon whose `engines` demand `>=22.0.0`. On Node 20 it does not merely warn — `node-gyp`
fails to compile it against the V8 headers (`SourceLocation` in namespace `v8` does not name
a type) and `npm install` exits non-zero. Do not lower the CI matrix or `engines` back to 20.

## Commands

```bash
npm install
npm run build        # rimraf dist && tsc && gulp build:icons
npm run lint         # eslint-plugin-n8n-nodes-base over credentials/, nodes/, package.json
npm run lintfix
npm test             # jest + nock, no network
npm run format
```

Lint, build and test all have to pass before a commit. `npm run lint` enforces n8n's naming
and description conventions, which their verification process checks — treat a lint error as a
release blocker, not a style nit.

## Conventions

- Prettier: tabs, single quotes, semicolons, trailing commas, 100 char width (the n8n starter
  house style, not the FoPost monorepo's two-space style).
- TypeScript strict, CommonJS output, `dist/` is what ships (`files: ["dist"]`).
- n8n lint rules that shape the code, worth knowing before fighting them:
  - `Get Many`, never `Get All`, for a list operation
  - option lists sorted alphabetically by `name`
  - boolean descriptions start with "Whether"
  - a `loadOptions`-backed field is named `... Name or ID` and its description is the literal
    "Choose from the list, or specify an ID using an `<a href=...>expression</a>` " string —
    the rule matches on the literal, so it cannot be hoisted into a shared constant
  - `limit` defaults to 50; `returnAll` is a boolean beside it
- Two lint rules are switched off in `.eslintrc.js`: the credential documentation-URL rules,
  because a community node documents itself at a real URL rather than an n8n-internal slug.
- `tsconfig.lint.json` exists only so ESLint can type-check `package.json`; the build tsconfig
  deliberately excludes it so `dist/package.json` is not emitted.

## Testing

`test/harness.ts` fakes the n8n execution contexts and performs real socket traffic through
`node:http`, so `nock` can intercept and assert on headers, query strings and bodies. It also
replays the credential's `authenticate` block, which is how the `X-API-Key` test is real rather
than a restatement of the source.

Covered: the credential injects `X-API-Key`, `post:create` builds the documented body, thread
blocks, `returnAll` paginates, limit slicing, `continueOnFail`, `loadOptions` dropdowns, the
trigger registering and deleting a webhook, orphan cleanup, and a rejected bad signature.

Never add a test that reaches the network.

## Releasing

Tag `v<version>` matching `package.json`; `.github/workflows/release.yml` verifies the tag,
lints, builds, tests, checks that every path in the `n8n` manifest block exists in `dist/`,
then runs `npm publish --access public --provenance`.

Requires repo secret **`NPM_TOKEN`** — the same mechanism `fopost-js` uses. Provenance needs
`id-token: write`, which the workflow already declares.

Listing the package on n8n's **verified community nodes** is a separate, manual submission to
n8n after the package is on npm. Publishing does not do it.

## Git

Conventional Commits, atomic. Branch `feature/<description>`, merge to `main` via PR.
Never `gh pr create` — push the branch and hand over the compare link.
