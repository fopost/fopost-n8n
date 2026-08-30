import { createHmac } from 'node:crypto';

import nock from 'nock';

import { FoPostTrigger, verifyFoPostSignature } from '../nodes/FoPostTrigger/FoPostTrigger.node';
import type { IDataObject } from 'n8n-workflow';

import { TEST_BASE_URL, createHookFunctions, createWebhookFunctions } from './harness';

const WEBHOOK_URL = 'https://n8n.test/webhook/fopost';

beforeAll(() => {
	nock.disableNetConnect();
});

afterAll(() => {
	nock.enableNetConnect();
});

afterEach(() => {
	nock.cleanAll();
});

describe('webhookMethods', () => {
	it('reports no webhook when the API knows none for this URL', async () => {
		nock(TEST_BASE_URL).get('/v1/webhooks').reply(200, { data: [] });

		const context = createHookFunctions({ webhookUrl: WEBHOOK_URL });
		const exists = await new FoPostTrigger().webhookMethods.default.checkExists.call(context);

		expect(exists).toBe(false);
	});

	it('registers a webhook and stores the signing secret', async () => {
		let body: Record<string, unknown> = {};

		nock(TEST_BASE_URL)
			.post('/v1/webhooks', (received) => {
				body = received as Record<string, unknown>;
				return true;
			})
			.reply(201, {
				data: { id: 'wh-1', url: WEBHOOK_URL, secret: 'super-secret', events: ['post.published'] },
			});

		const staticData: IDataObject = {};
		const context = createHookFunctions({
			webhookUrl: WEBHOOK_URL,
			staticData,
			params: { workspaceId: 'ws-1', events: ['post.published'] },
		});

		const created = await new FoPostTrigger().webhookMethods.default.create.call(context);

		expect(created).toBe(true);
		expect(body).toEqual({
			workspaceId: 'ws-1',
			url: WEBHOOK_URL,
			events: ['post.published'],
		});
		expect(staticData.webhookId).toBe('wh-1');
		expect(staticData.webhookSecret).toBe('super-secret');
	});

	it('deletes the webhook and clears the stored secret', async () => {
		nock(TEST_BASE_URL).delete('/v1/webhooks/wh-1').reply(200, { message: 'deleted' });

		const staticData: IDataObject = {
			webhookId: 'wh-1',
			webhookSecret: 'super-secret',
			events: ['post.published'],
		};
		const context = createHookFunctions({ staticData });

		const deleted = await new FoPostTrigger().webhookMethods.default.delete.call(context);

		expect(deleted).toBe(true);
		expect(staticData.webhookId).toBeUndefined();
		expect(staticData.webhookSecret).toBeUndefined();
		expect(nock.isDone()).toBe(true);
	});

	it('drops an orphaned webhook whose secret was lost, so create can mint a new one', async () => {
		nock(TEST_BASE_URL)
			.get('/v1/webhooks')
			.reply(200, { data: [{ id: 'wh-9', url: WEBHOOK_URL }] })
			.delete('/v1/webhooks/wh-9')
			.reply(200, { message: 'deleted' });

		const context = createHookFunctions({ webhookUrl: WEBHOOK_URL, staticData: {} });
		const exists = await new FoPostTrigger().webhookMethods.default.checkExists.call(context);

		expect(exists).toBe(false);
		expect(nock.isDone()).toBe(true);
	});
});

describe('signature verification', () => {
	const secret = 'super-secret';
	const payload = { event: 'post.published', data: { id: 'post-1' } };
	const rawBody = Buffer.from(JSON.stringify(payload));
	const signature = createHmac('sha256', secret).update(rawBody).digest('hex');

	it('accepts a correctly signed payload', async () => {
		const harness = createWebhookFunctions({
			staticData: { webhookSecret: secret },
			headers: {
				'x-fopost-signature': `sha256=${signature}`,
				'x-fopost-event': 'post.published',
			},
			body: payload,
			rawBody,
			params: { events: ['post.published'] },
		});

		const result = await new FoPostTrigger().webhook.call(harness.context);

		expect(result.workflowData?.[0][0].json).toEqual(payload);
		expect(harness.status).not.toHaveBeenCalled();
	});

	it('rejects a tampered payload with 401 and emits nothing', async () => {
		const harness = createWebhookFunctions({
			staticData: { webhookSecret: secret },
			headers: { 'x-fopost-signature': `sha256=${'0'.repeat(64)}` },
			body: payload,
			rawBody,
			params: { events: ['post.published'] },
		});

		const result = await new FoPostTrigger().webhook.call(harness.context);

		expect(harness.status).toHaveBeenCalledWith(401);
		expect(result).toEqual({ noWebhookResponse: true });
	});

	it('rejects when no secret is stored', () => {
		expect(verifyFoPostSignature(rawBody, '', `sha256=${signature}`)).toBe(false);
	});

	it('skips an event the node is not subscribed to', async () => {
		const harness = createWebhookFunctions({
			staticData: { webhookSecret: secret },
			headers: {
				'x-fopost-signature': `sha256=${signature}`,
				'x-fopost-event': 'delivery.failed',
			},
			body: payload,
			rawBody,
			params: { events: ['post.published'] },
		});

		const result = await new FoPostTrigger().webhook.call(harness.context);

		expect(result.workflowData).toEqual([]);
	});
});
