import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	buildMultipartBody,
	foPostApiRequest,
	foPostApiRequestAllItems,
	foPostApiRequestList,
	stripEmpty,
	toIdArray,
	toOptions,
	unwrap,
} from './GenericFunctions';
import { accountFields, accountOperations } from './descriptions/AccountDescription';
import { analyticsFields, analyticsOperations } from './descriptions/AnalyticsDescription';
import { automationFields, automationOperations } from './descriptions/AutomationDescription';
import { labelFields, labelOperations } from './descriptions/LabelDescription';
import { mediaFields, mediaOperations } from './descriptions/MediaDescription';
import { postFields, postOperations } from './descriptions/PostDescription';
import { workspaceFields, workspaceOperations } from './descriptions/WorkspaceDescription';

interface ContentBlockInput {
	text?: string;
	media?: IDataObject[];
}

/** Turns the node's flat parameters into the API's `content` block array. */
export function buildContentBlocks(
	useThread: boolean,
	text: string,
	blocks: IDataObject[],
	media: IDataObject[],
): ContentBlockInput[] {
	const attachments = media
		.map((item) => stripEmpty(item))
		.filter((item) => Boolean(item.url) && Boolean(item.name));

	const content: ContentBlockInput[] = useThread
		? blocks.map((block) => ({ text: (block.text as string) ?? '' }))
		: [{ text }];

	if (content.length === 0) content.push({ text });
	if (attachments.length > 0) content[0].media = attachments;

	return content;
}

export class FoPost implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FoPost',
		name: 'foPost',
		icon: { light: 'file:fopost.svg', dark: 'file:fopost.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule and publish social media posts with FoPost',
		defaults: { name: 'FoPost' },
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [{ name: 'foPostApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Automation', value: 'automation' },
					{ name: 'Label', value: 'label' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
					{ name: 'Workspace', value: 'workspace' },
				],
				default: 'post',
			},
			...postOperations,
			...postFields,
			...accountOperations,
			...accountFields,
			...workspaceOperations,
			...workspaceFields,
			...mediaOperations,
			...mediaFields,
			...labelOperations,
			...labelFields,
			...analyticsOperations,
			...analyticsFields,
			...automationOperations,
			...automationFields,
		],
	};

	methods = {
		loadOptions: {
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaces = (unwrap(await foPostApiRequest.call(this, 'GET', '/workspaces')) ??
					[]) as IDataObject[];
				return toOptions(workspaces);
			},

			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaceId = this.getCurrentNodeParameter('workspaceId') as string;
				const accounts = (unwrap(
					await foPostApiRequest.call(
						this,
						'GET',
						'/accounts',
						{},
						workspaceId ? { workspaceId } : {},
					),
				) ?? []) as IDataObject[];
				return toOptions(accounts, ['displayName', 'username', 'name']);
			},

			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaceId = this.getCurrentNodeParameter('workspaceId') as string;
				const labels = (unwrap(
					await foPostApiRequest.call(
						this,
						'GET',
						'/labels',
						{},
						workspaceId ? { workspace_id: workspaceId } : {},
					),
				) ?? []) as IDataObject[];
				return toOptions(labels);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				if (resource === 'post') {
					responseData = await executePost.call(this, operation, i);
				} else if (resource === 'account') {
					responseData = await executeAccount.call(this, operation, i);
				} else if (resource === 'workspace') {
					responseData = await executeWorkspace.call(this, operation, i);
				} else if (resource === 'media') {
					responseData = await executeMedia.call(this, operation, i);
				} else if (resource === 'label') {
					responseData = await executeLabel.call(this, operation, i);
				} else if (resource === 'analytics') {
					responseData = await executeAnalytics.call(this, operation, i);
				} else if (resource === 'automation') {
					responseData = await executeAutomation.call(this, operation, i);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The resource "${resource}" is not supported`,
						{ itemIndex: i },
					);
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// ─── Posts ──────────────────────────────────────────────────────────

async function executePost(this: IExecuteFunctions, operation: string, i: number): Promise<any> {
	if (operation === 'create') {
		const useThread = this.getNodeParameter('useThread', i, false) as boolean;
		const text = this.getNodeParameter('text', i, '') as string;
		const blocks = ((this.getNodeParameter('blocks.block', i, []) as IDataObject[]) ??
			[]) as IDataObject[];
		const media = ((this.getNodeParameter('media.item', i, []) as IDataObject[]) ??
			[]) as IDataObject[];
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const body: IDataObject = {
			workspace_id: this.getNodeParameter('workspaceId', i) as string,
			accounts: toIdArray(this.getNodeParameter('accounts', i)),
			content: buildContentBlocks(useThread, text, blocks, media),
			...stripEmpty(additionalFields),
		};

		if (Array.isArray(additionalFields.labels)) body.labels = toIdArray(additionalFields.labels);

		return unwrap(await foPostApiRequest.call(this, 'POST', '/posts', body));
	}

	if (operation === 'get') {
		const postId = this.getNodeParameter('postId', i) as string;
		return unwrap(await foPostApiRequest.call(this, 'GET', `/posts/${postId}`));
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = stripEmpty(this.getNodeParameter('filters', i, {}) as IDataObject);

		if (returnAll) {
			return await foPostApiRequestAllItems.call(this, 'GET', '/posts', {}, filters);
		}

		const limit = this.getNodeParameter('limit', i) as number;
		const response = await foPostApiRequest.call(
			this,
			'GET',
			'/posts',
			{},
			{ ...filters, page: 1, per_page: Math.min(limit, 100) },
		);
		return ((response?.data ?? []) as IDataObject[]).slice(0, limit);
	}

	if (operation === 'update') {
		const postId = this.getNodeParameter('postId', i) as string;
		const text = this.getNodeParameter('text', i, '') as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body: IDataObject = { ...stripEmpty(additionalFields) };
		if (text !== '') body.content = [{ text }];
		if (Array.isArray(additionalFields.labels)) body.labels = toIdArray(additionalFields.labels);

		return unwrap(await foPostApiRequest.call(this, 'PUT', `/posts/${postId}`, body));
	}

	if (operation === 'delete') {
		const postId = this.getNodeParameter('postId', i) as string;
		return await foPostApiRequest.call(this, 'DELETE', `/posts/${postId}`);
	}

	if (operation === 'publish') {
		const postId = this.getNodeParameter('postId', i) as string;
		const accountIds = toIdArray(this.getNodeParameter('accountIds', i, ''));
		const dryRun = this.getNodeParameter('dryRun', i, false) as boolean;
		const body: IDataObject = {};
		if (accountIds.length > 0) body.accountIds = accountIds;
		if (dryRun) body.options = { dryRun: true };

		return unwrap(await foPostApiRequest.call(this, 'POST', `/posts/${postId}/publish`, body));
	}

	if (operation === 'cancel') {
		const postId = this.getNodeParameter('postId', i) as string;
		const accountIds = toIdArray(this.getNodeParameter('accountIds', i, ''));
		const body: IDataObject = {};
		if (accountIds.length > 0) body.accountIds = accountIds;

		return unwrap(await foPostApiRequest.call(this, 'POST', `/posts/${postId}/cancel`, body));
	}

	if (operation === 'duplicate') {
		const postId = this.getNodeParameter('postId', i) as string;
		return unwrap(await foPostApiRequest.call(this, 'POST', `/posts/${postId}/duplicate`));
	}

	if (operation === 'preflight') {
		const postId = this.getNodeParameter('postId', i) as string;
		return unwrap(await foPostApiRequest.call(this, 'POST', `/posts/${postId}/preflight`));
	}

	if (operation === 'getDeliveries') {
		const postId = this.getNodeParameter('postId', i) as string;
		return unwrap(await foPostApiRequest.call(this, 'GET', `/posts/${postId}/deliveries`));
	}

	throw new NodeOperationError(this.getNode(), `Unknown post operation "${operation}"`, {
		itemIndex: i,
	});
}

// ─── Accounts ───────────────────────────────────────────────────────

async function executeAccount(this: IExecuteFunctions, operation: string, i: number): Promise<any> {
	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
		const workspaceId = this.getNodeParameter('workspaceId', i, '') as string;
		return await foPostApiRequestList.call(this, '/accounts', { workspaceId }, returnAll, limit);
	}

	const accountId = this.getNodeParameter('accountId', i) as string;

	if (operation === 'get') {
		return unwrap(await foPostApiRequest.call(this, 'GET', `/accounts/${accountId}`));
	}

	if (operation === 'getHealth') {
		const refresh = this.getNodeParameter('refresh', i, false) as boolean;
		return unwrap(
			await foPostApiRequest.call(
				this,
				'GET',
				`/accounts/${accountId}/health`,
				{},
				refresh ? { refresh: 'true' } : {},
			),
		);
	}

	if (operation === 'validate') {
		return unwrap(await foPostApiRequest.call(this, 'POST', `/accounts/${accountId}/validate`));
	}

	if (operation === 'refreshToken') {
		return unwrap(
			await foPostApiRequest.call(this, 'POST', `/accounts/${accountId}/refresh-token`),
		);
	}

	throw new NodeOperationError(this.getNode(), `Unknown account operation "${operation}"`, {
		itemIndex: i,
	});
}

// ─── Workspaces ─────────────────────────────────────────────────────

async function executeWorkspace(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
		return await foPostApiRequestList.call(this, '/workspaces', {}, returnAll, limit);
	}

	if (operation === 'get') {
		const workspaceId = this.getNodeParameter('workspaceId', i) as string;
		return unwrap(await foPostApiRequest.call(this, 'GET', `/workspaces/${workspaceId}`));
	}

	if (operation === 'create') {
		const body: IDataObject = {
			name: this.getNodeParameter('name', i) as string,
			slug: this.getNodeParameter('slug', i) as string,
			...stripEmpty(this.getNodeParameter('additionalFields', i, {}) as IDataObject),
		};
		return unwrap(await foPostApiRequest.call(this, 'POST', '/workspaces', body));
	}

	throw new NodeOperationError(this.getNode(), `Unknown workspace operation "${operation}"`, {
		itemIndex: i,
	});
}

// ─── Media ──────────────────────────────────────────────────────────

async function executeMedia(this: IExecuteFunctions, operation: string, i: number): Promise<any> {
	if (operation === 'upload') {
		const workspaceId = this.getNodeParameter('workspaceId', i) as string;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

		const { body, contentType } = buildMultipartBody(
			[{ name: 'workspaceId', value: workspaceId }],
			[
				{
					name: 'files',
					filename: binaryData.fileName ?? 'upload',
					contentType: binaryData.mimeType ?? 'application/octet-stream',
					data: buffer,
				},
			],
		);

		return unwrap(
			await foPostApiRequest.call(
				this,
				'POST',
				'/media/upload',
				body,
				{},
				{
					headers: { Accept: 'application/json', 'Content-Type': contentType },
					json: false,
				},
			),
		);
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
		const workspaceId = this.getNodeParameter('workspaceId', i) as string;
		return await foPostApiRequestList.call(this, '/media', { workspaceId }, returnAll, limit);
	}

	if (operation === 'delete') {
		const mediaId = this.getNodeParameter('mediaId', i) as string;
		return await foPostApiRequest.call(this, 'DELETE', `/media/${mediaId}`);
	}

	throw new NodeOperationError(this.getNode(), `Unknown media operation "${operation}"`, {
		itemIndex: i,
	});
}

// ─── Labels ─────────────────────────────────────────────────────────

async function executeLabel(this: IExecuteFunctions, operation: string, i: number): Promise<any> {
	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
		const workspaceId = this.getNodeParameter('workspaceId', i, '') as string;
		return await foPostApiRequestList.call(
			this,
			'/labels',
			{ workspace_id: workspaceId },
			returnAll,
			limit,
		);
	}

	if (operation === 'create') {
		const body: IDataObject = {
			workspace_id: this.getNodeParameter('workspaceId', i) as string,
			name: this.getNodeParameter('name', i) as string,
			color: this.getNodeParameter('color', i) as string,
		};
		return unwrap(await foPostApiRequest.call(this, 'POST', '/labels', body));
	}

	if (operation === 'delete') {
		const labelId = this.getNodeParameter('labelId', i) as string;
		return await foPostApiRequest.call(this, 'DELETE', `/labels/${labelId}`);
	}

	throw new NodeOperationError(this.getNode(), `Unknown label operation "${operation}"`, {
		itemIndex: i,
	});
}

// ─── Analytics ──────────────────────────────────────────────────────

async function executeAnalytics(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	const options = stripEmpty(this.getNodeParameter('options', i, {}) as IDataObject);
	const qs: IDataObject = {
		days: this.getNodeParameter('days', i, 30) as number,
		workspace_id: this.getNodeParameter('workspaceId', i, '') as string,
		...options,
	};

	if (operation === 'getOverview') {
		return unwrap(await foPostApiRequest.call(this, 'GET', '/analytics/overview', {}, qs));
	}

	if (operation === 'getTimeSeries') {
		return unwrap(await foPostApiRequest.call(this, 'GET', '/analytics/time-series', {}, qs));
	}

	if (operation === 'getTopPosts') {
		qs.limit = this.getNodeParameter('limit', i, 10) as number;
		return unwrap(await foPostApiRequest.call(this, 'GET', '/analytics/top-posts', {}, qs));
	}

	throw new NodeOperationError(this.getNode(), `Unknown analytics operation "${operation}"`, {
		itemIndex: i,
	});
}

// ─── Automations ────────────────────────────────────────────────────

async function executeAutomation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', i) as number);
		return await foPostApiRequestList.call(this, '/automations', {}, returnAll, limit);
	}

	const automationId = this.getNodeParameter('automationId', i) as string;

	if (operation === 'get') {
		return unwrap(await foPostApiRequest.call(this, 'GET', `/automations/${automationId}`));
	}

	if (operation === 'toggle') {
		return unwrap(await foPostApiRequest.call(this, 'POST', `/automations/${automationId}/toggle`));
	}

	if (operation === 'trigger') {
		const raw = this.getNodeParameter('payload', i, '{}');
		let payload: IDataObject = {};
		if (typeof raw === 'string' && raw.trim() !== '') {
			try {
				payload = JSON.parse(raw) as IDataObject;
			} catch {
				throw new NodeOperationError(this.getNode(), 'The payload is not valid JSON', {
					itemIndex: i,
				});
			}
		} else if (typeof raw === 'object' && raw !== null) {
			payload = raw as IDataObject;
		}

		return unwrap(
			await foPostApiRequest.call(this, 'POST', `/automations/${automationId}/trigger`, payload),
		);
	}

	throw new NodeOperationError(this.getNode(), `Unknown automation operation "${operation}"`, {
		itemIndex: i,
	});
}
