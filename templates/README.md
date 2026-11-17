# FoPost workflow templates for n8n

Six ready-to-import workflows built on the FoPost node. Each one carries its own setup
instructions as sticky notes on the canvas, uses fictional sample values (`yourbrand.com`,
`REPLACE_WITH_...` placeholders) and no credentials.

| File | What it does | Credentials |
| :--- | :--- | :--- |
| [`github-release-to-social-drafts.json`](github-release-to-social-drafts.json) | GitHub release → drafts for X, Bluesky and LinkedIn → Slack approval → publish | FoPost, GitHub, Slack |
| [`blog-rss-to-every-network.json`](blog-rss-to-every-network.json) | New blog article → one post on every active account, placed in the posting queue | FoPost |
| [`shopify-product-to-instagram-facebook.json`](shopify-product-to-instagram-facebook.json) | New Shopify product → photo post on Instagram and Facebook | FoPost, Shopify |
| [`google-sheet-to-scheduled-posts.json`](google-sheet-to-scheduled-posts.json) | New sheet row → scheduled post with photo at the row's time | FoPost, Google Sheets |
| [`weekly-analytics-digest-to-slack.json`](weekly-analytics-digest-to-slack.json) | Every Monday → last week's numbers and top posts in Slack | FoPost, Slack |
| [`inbox-mention-to-slack-alert.json`](inbox-mention-to-slack-alert.json) | New mention of a connected account → alert in Slack | FoPost, Slack |

## Import one

1. Install the community node: **Settings → Community Nodes → Install → `@fopost/n8n-nodes-fopost`**.
2. In n8n, open a new workflow, then **⋯ → Import from File** (or paste the JSON onto the
   canvas).
3. Follow the yellow note in the top-left corner of the canvas.

Requires `@fopost/n8n-nodes-fopost` 0.2.0 or later: the templates use the Inbox resource, the
**Add to Queue** option and the inbox trigger events added in 0.2.0. Each one was imported
and run end to end on n8n 2.47.7 against a stand-in for the FoPost API.

## Checks

```bash
npm run validate:templates
```

Checks every file for a well-formed graph, FoPost node types this package ships, no
credentials, pinned data, email addresses or secrets, and the sticky notes n8n's template
review asks for (an overview of 100–300 words with **How it works** and **Setup**, and section
notes under 50 words for workflows with four or more nodes).

## Listing copy for n8n.io/workflows

The creator portal at <https://creators.n8n.io> drafts the title and description from the
workflow itself; the copy below is what to compare it against or paste where the form allows
edits. Submit the JSON file exactly as committed.

### Turn GitHub releases into approved X, LinkedIn and Bluesky posts with FoPost

**Who it's for:** developer tools, SaaS and open-source teams that announce every release.

**What it does:** When a release is published on GitHub, the workflow turns its release notes
into one post per network, each trimmed to that network's length limit, and saves them as drafts
in FoPost. A Slack message shows the team every draft with **Publish** and **Keep as Drafts**
buttons. Publish sends all drafts live through FoPost; Keep as Drafts leaves them in FoPost for
editing. Pre-releases and draft releases are skipped.

**Setup:** install the FoPost community node, add FoPost, GitHub and Slack credentials, pick your
repository in the trigger and fill in the workspace ID, account IDs and Slack channel in
**Configure**. Leave an account ID empty to skip that network.

**Categories:** Social Media, Marketing, Engineering.

### Share every new blog post on all your social accounts with FoPost

**Who it's for:** content teams, newsletters and agencies that publish often.

**What it does:** Checks your RSS feed every hour. Each new article becomes one short post (title,
a one-line summary, link and hashtags, kept under 280 characters so it fits every network) on
every active account in your FoPost workspace. FoPost places each post in the next free slot of
your posting schedule, so several new articles go out spaced apart instead of all at once.

**Setup:** install the FoPost community node, add a FoPost credential, add posting slots in
FoPost under Settings → Posting Schedule, paste your feed URL and set the workspace ID and
hashtags in **Configure**.

**Categories:** Social Media, Marketing, Content Creation.

### Post new Shopify products to Instagram and Facebook with FoPost

**Who it's for:** online shops that add products often, including dealers and listing sites
running on Shopify.

**What it does:** When a product is created in Shopify and is active with a photo, the workflow
writes a launch post with its name, price and link and queues it in FoPost with the main product
photo for your Instagram and Facebook accounts. Draft products and products without an image are
skipped.

**Setup:** install the FoPost community node, add FoPost and Shopify credentials, add posting
slots in FoPost and set the workspace ID, account IDs, store URL and currency in **Configure**.

**Categories:** Social Media, Marketing, E-commerce.

### Schedule social posts from a Google Sheet with FoPost

**Who it's for:** teams that plan content in a shared spreadsheet: real estate offices adding
listings, car dealers adding new arrivals, salons sharing recent work.

**What it does:** Each new row with text and a future **Publish At** time becomes a scheduled
post in FoPost on the accounts you choose, with the photo from **Image URL** when there is one.
Times are read in your time zone. Rows without text or with a past time are skipped.

**Setup:** install the FoPost community node, add FoPost and Google Sheets credentials, create a
sheet with `Text`, `Image URL` and `Publish At` columns, pick it in the trigger and set the
workspace ID, account IDs and time zone in **Configure**.

**Categories:** Social Media, Marketing.

### Send a weekly social media report from FoPost to Slack

**Who it's for:** marketing teams and agencies that want a weekly pulse without a dashboard.

**What it does:** Every Monday at 9:00 it reads the last seven days from FoPost analytics (posts,
impressions, engagement and followers, each with the change against the week before) plus your
three best posts, and sends one formatted message to a Slack channel.

**Setup:** install the FoPost community node, add FoPost (with the analytics scope) and Slack
credentials, and set the workspace ID and channel in **Configure**.

**Categories:** Social Media, Marketing, Reporting.

### Get a Slack alert when someone mentions your brand, with FoPost

**Who it's for:** support and community teams that work in Slack.

**What it does:** FoPost calls the workflow when someone mentions one of your connected accounts.
The workflow loads the mention from the FoPost inbox and posts the author, network, text and a
link to the original post in Slack. The FoPost trigger registers its webhook when the workflow is
activated and removes it on deactivation, and every delivery is signature-checked.

**Setup:** install the FoPost community node, add FoPost (with the inbox and webhooks scopes) and
Slack credentials, pick your workspace in the trigger and set the channel in **Configure**.

**Categories:** Social Media, Customer Support.
