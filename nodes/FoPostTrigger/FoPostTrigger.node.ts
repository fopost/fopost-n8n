import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { foPostApiRequest, toOptions, unwrap } from '../FoPost/GenericFunctions';

export const FOPOST_WEBHOOK_EVENTS = [
	'account.health_changed',
	'delivery.delayed',
	'delivery.failed',
	'delivery.published',
	'post.failed',
	'post.partially_failed',
	'post.published',
] as const;

const SIGNATURE_HEADER = 'x-fopost-signature';
const EVENT_HEADER = 'x-fopost-event';

/**
 * FoPost signs the raw request body with HMAC-SHA256 using the secret handed back once,
 * at webhook creation, and sends it as `X-FoPost-Signature: sha256=<hex>`.
 */
export function verifyFoPostSignature(rawBody: Buffer | string, secret: string, header: string) {
	if (!secret || !header) return false;

	const received = header.startsWith('sha256=') ? header.slice('sha256='.length) : header;
	const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

	const receivedBuffer = Buffer.from(received, 'utf8');
	const expectedBuffer = Buffer.from(expected, 'utf8');
	if (receivedBuffer.length !== expectedBuffer.length) return false;

	return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export class FoPostTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FoPost Trigger',
		name: 'foPostTrigger',
		icon: { light: 'file:fopost.svg', dark: 'file:fopost.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when FoPost reports a publishing event',
		defaults: { name: 'FoPost Trigger' },
		inputs: [],
		outputs: ['main'],
		credentials: [{ name: 'foPostApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Workspace Name or ID',
				name: 'workspaceId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getWorkspaces' },
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['post.published'],
				options: [
					{
						name: 'Account Health Changed',
						value: 'account.health_changed',
						description: 'A connected account changed connection health, including disconnects',
					},
					{
						name: 'Delivery Delayed',
						value: 'delivery.delayed',
						description: 'A single account delivery was pushed back',
					},
					{
						name: 'Delivery Failed',
						value: 'delivery.failed',
						description: 'A single account delivery failed',
					},
					{
						name: 'Delivery Published',
						value: 'delivery.published',
						description: 'A single account delivery went live',
					},
					{
						name: 'Post Failed',
						value: 'post.failed',
						description: 'Every delivery of a post failed',
					},
					{
						name: 'Post Partially Failed',
						value: 'post.partially_failed',
						description: 'Some deliveries of a post failed',
					},
					{
						name: 'Post Published',
						value: 'post.published',
						description: 'A post went live on every target account',
					},
				],
				description: 'The FoPost events that start this workflow',
			},
		],
	};

	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaces = (unwrap(await foPostApiRequest.call(this, 'GET', '/workspaces')) ??
					[]) as IDataObject[];
				return toOptions(workspaces);
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');

				const existing = (unwrap(await foPostApiRequest.call(this, 'GET', '/webhooks')) ??
					[]) as IDataObject[];
				const match = existing.find((entry) => entry.url === webhookUrl);

				if (match === undefined) {
					delete webhookData.webhookId;
					delete webhookData.webhookSecret;
					return false;
				}

				// The signing secret is only ever returned at creation. Without it nothing can be
				// verified, so drop the orphan and let create() mint a fresh pair.
				if (webhookData.webhookId !== match.id || !webhookData.webhookSecret) {
					await foPostApiRequest.call(this, 'DELETE', `/webhooks/${match.id as string}`);
					delete webhookData.webhookId;
					delete webhookData.webhookSecret;
					return false;
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const workspaceId = this.getNodeParameter('workspaceId') as string;

				const created = unwrap(
					await foPostApiRequest.call(this, 'POST', '/webhooks', {
						workspaceId,
						url: webhookUrl,
						events,
					}),
				) as IDataObject;

				if (!created?.id) return false;

				webhookData.webhookId = created.id;
				webhookData.webhookSecret = created.secret;
				webhookData.events = events;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) return true;

				try {
					await foPostApiRequest.call(
						this,
						'DELETE',
						`/webhooks/${webhookData.webhookId as string}`,
					);
				} catch {
					return false;
				}

				delete webhookData.webhookId;
				delete webhookData.webhookSecret;
				delete webhookData.events;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookData = this.getWorkflowStaticData('node');
		const headers = this.getHeaderData() as IDataObject;
		const bodyData = this.getBodyData();
		const request = this.getRequestObject();
		const response = this.getResponseObject();

		const rawBody = Buffer.isBuffer(request.rawBody)
			? request.rawBody
			: Buffer.from(JSON.stringify(bodyData));

		const signature = (headers[SIGNATURE_HEADER] as string) ?? '';
		const secret = (webhookData.webhookSecret as string) ?? '';

		if (!verifyFoPostSignature(rawBody, secret, signature)) {
			response.status(401).json({ message: 'Invalid FoPost webhook signature' });
			return { noWebhookResponse: true };
		}

		const events = this.getNodeParameter('events', []) as string[];
		const event = ((headers[EVENT_HEADER] as string) ?? (bodyData.event as string)) || '';
		if (events.length > 0 && event !== '' && !events.includes(event)) {
			return { noWebhookResponse: false, workflowData: [] };
		}

		return { workflowData: [this.helpers.returnJsonArray(bodyData)] };
	}
}
