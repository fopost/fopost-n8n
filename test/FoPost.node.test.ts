import nock from 'nock';

import { FoPost } from '../nodes/FoPost/FoPost.node';
import { TEST_API_KEY, TEST_BASE_URL, createExecuteFunctions } from './harness';

beforeAll(() => {
	nock.disableNetConnect();
});

afterAll(() => {
	nock.enableNetConnect();
});

afterEach(() => {
	nock.cleanAll();
});

describe('FoPost credential', () => {
	it('sends the API key as the X-API-Key header', async () => {
		let seenKey: string | undefined;

		nock(TEST_BASE_URL)
			.get('/v1/workspaces')
			.reply(function () {
				seenKey = this.req.headers['x-api-key'] as string;
				return [200, { data: [] }];
			});

		const context = createExecuteFunctions({
			params: { resource: 'workspace', operation: 'getAll', returnAll: true },
		});
		await new FoPost().execute.call(context);

		expect(seenKey).toBe(TEST_API_KEY);
	});
});

describe('post:create', () => {
	it('builds the documented request body', async () => {
		let body: Record<string, unknown> = {};

		nock(TEST_BASE_URL)
			.post('/v1/posts', (received) => {
				body = received as Record<string, unknown>;
				return true;
			})
			.reply(201, { data: { id: 'post-1', status: 'scheduled' } });

		const context = createExecuteFunctions({
			params: {
				resource: 'post',
				operation: 'create',
				workspaceId: 'ws-1',
				accounts: ['acc-1', 'acc-2'],
				useThread: false,
				text: 'Shipping today',
				media: {
					item: [{ type: 'image', name: 'shot.png', url: 'https://cdn.test/shot.png', alt: '' }],
				},
				additionalFields: {
					status: 'scheduled',
					schedule_at: '2026-09-01T10:00:00.000Z',
					labels: ['label-1'],
				},
			},
		});

		const result = await new FoPost().execute.call(context);

		expect(body).toEqual({
			workspace_id: 'ws-1',
			accounts: ['acc-1', 'acc-2'],
			content: [
				{
					text: 'Shipping today',
					media: [{ type: 'image', name: 'shot.png', url: 'https://cdn.test/shot.png' }],
				},
			],
			status: 'scheduled',
			schedule_at: '2026-09-01T10:00:00.000Z',
			labels: ['label-1'],
		});
		expect(result[0][0].json).toEqual({ id: 'post-1', status: 'scheduled' });
	});

	it('turns blocks into a thread', async () => {
		let body: Record<string, unknown> = {};

		nock(TEST_BASE_URL)
			.post('/v1/posts', (received) => {
				body = received as Record<string, unknown>;
				return true;
			})
			.reply(201, { data: { id: 'post-2' } });

		const context = createExecuteFunctions({
			params: {
				resource: 'post',
				operation: 'create',
				workspaceId: 'ws-1',
				accounts: ['acc-1'],
				useThread: true,
				blocks: { block: [{ text: 'one' }, { text: 'two' }] },
				additionalFields: {},
			},
		});

		await new FoPost().execute.call(context);

		expect(body.content).toEqual([{ text: 'one' }, { text: 'two' }]);
	});
});

describe('post:getAll', () => {
	it('walks every page when Return All is on', async () => {
		nock(TEST_BASE_URL)
			.get('/v1/posts')
			.query({ page: '1', per_page: '100' })
			.reply(200, {
				data: [{ id: 'p1' }, { id: 'p2' }],
				meta: { current_page: 1, per_page: 100, total: 3, last_page: 2, from: 1, to: 2 },
			})
			.get('/v1/posts')
			.query({ page: '2', per_page: '100' })
			.reply(200, {
				data: [{ id: 'p3' }],
				meta: { current_page: 2, per_page: 100, total: 3, last_page: 2, from: 3, to: 3 },
			});

		const context = createExecuteFunctions({
			params: { resource: 'post', operation: 'getAll', returnAll: true, filters: {} },
		});

		const result = await new FoPost().execute.call(context);

		expect(result[0].map((entry) => entry.json.id)).toEqual(['p1', 'p2', 'p3']);
		expect(nock.isDone()).toBe(true);
	});

	it('asks for a single page and slices when a limit is set', async () => {
		nock(TEST_BASE_URL)
			.get('/v1/posts')
			.query({ page: '1', per_page: '2' })
			.reply(200, {
				data: [{ id: 'p1' }, { id: 'p2' }],
				meta: { current_page: 1, per_page: 2, total: 9, last_page: 5, from: 1, to: 2 },
			});

		const context = createExecuteFunctions({
			params: { resource: 'post', operation: 'getAll', returnAll: false, limit: 2, filters: {} },
		});

		const result = await new FoPost().execute.call(context);

		expect(result[0]).toHaveLength(2);
		expect(nock.isDone()).toBe(true);
	});
});

describe('continueOnFail', () => {
	it('reports the failure as data instead of throwing', async () => {
		nock(TEST_BASE_URL).get('/v1/posts/missing').reply(404, { error: 'not_found' });

		const context = createExecuteFunctions({
			params: { resource: 'post', operation: 'get', postId: 'missing' },
		});
		context.continueOnFail = () => true;

		const result = await new FoPost().execute.call(context);

		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json.error).toBeDefined();
	});
});

describe('loadOptions', () => {
	it('lists workspaces as sorted dropdown entries', async () => {
		nock(TEST_BASE_URL)
			.get('/v1/workspaces')
			.reply(200, {
				data: [
					{ id: 'ws-2', name: 'Zeta' },
					{ id: 'ws-1', name: 'Alpha' },
				],
			});

		const context = createExecuteFunctions();
		const options = await new FoPost().methods.loadOptions.getWorkspaces.call(context);

		expect(options).toEqual([
			{ name: 'Alpha', value: 'ws-1' },
			{ name: 'Zeta', value: 'ws-2' },
		]);
	});

	it('scopes accounts to the selected workspace', async () => {
		nock(TEST_BASE_URL)
			.get('/v1/accounts')
			.query({ workspaceId: 'ws-1' })
			.reply(200, { data: [{ id: 'acc-1', displayName: 'Brand on X' }] });

		const context = createExecuteFunctions({ params: { workspaceId: 'ws-1' } });
		const options = await new FoPost().methods.loadOptions.getAccounts.call(context);

		expect(options).toEqual([{ name: 'Brand on X', value: 'acc-1' }]);
	});
});
