import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';

import type {
	IAuthenticateGeneric,
	IDataObject,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';

import { FoPostApi } from '../credentials/FoPostApi.credentials';

export const TEST_BASE_URL = 'https://api.fopost.test';
export const TEST_API_KEY = 'fp_test_key';

export interface HarnessOptions {
	params?: IDataObject;
	credentials?: IDataObject;
	items?: INodeExecutionData[];
	staticData?: IDataObject;
	webhookUrl?: string;
	headers?: Record<string, string>;
	body?: IDataObject;
	rawBody?: Buffer;
}

export const testNode: INode = {
	id: 'a1b2c3',
	name: 'FoPost',
	type: 'n8n-nodes-fopost.foPost',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/** Mirrors what n8n does with a credential's `authenticate` block before a request. */
function applyCredentials(options: IHttpRequestOptions, credentials: IDataObject) {
	const authenticate = new FoPostApi().authenticate as IAuthenticateGeneric;
	const headers = (authenticate.properties.headers ?? {}) as Record<string, string>;
	options.headers = { ...(options.headers ?? {}) };

	for (const [key, template] of Object.entries(headers)) {
		options.headers[key] = template
			.replace(/^=/, '')
			.replace(/\{\{\s*\$credentials\.(\w+)\s*\}\}/g, (_m, name: string) =>
				String(credentials[name] ?? ''),
			);
	}
}

/** Real socket traffic, so nock can intercept and assert on it. */
async function rawRequest(options: IHttpRequestOptions): Promise<unknown> {
	const url = new URL(options.url);
	for (const [key, value] of Object.entries(options.qs ?? {})) {
		url.searchParams.set(key, String(value));
	}

	let payload: Buffer | undefined;
	if (options.body !== undefined) {
		payload = Buffer.isBuffer(options.body)
			? options.body
			: Buffer.from(JSON.stringify(options.body));
	}

	const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
	if (payload !== undefined) {
		if (headers['Content-Type'] === undefined) headers['Content-Type'] = 'application/json';
		headers['Content-Length'] = String(payload.length);
	}

	const lib = url.protocol === 'https:' ? https : http;

	return await new Promise((resolve, reject) => {
		const request = lib.request(
			{
				protocol: url.protocol,
				hostname: url.hostname,
				port: url.port === '' ? undefined : url.port,
				path: `${url.pathname}${url.search}`,
				method: options.method ?? 'GET',
				headers,
			},
			(response) => {
				const chunks: Buffer[] = [];
				response.on('data', (chunk: Buffer) => chunks.push(chunk));
				response.on('end', () => {
					const text = Buffer.concat(chunks).toString('utf8');
					const status = response.statusCode ?? 0;
					if (status >= 400) {
						const error = new Error(`HTTP ${status}`) as Error & Record<string, unknown>;
						error.statusCode = status;
						error.response = { body: text };
						reject(error);
						return;
					}
					try {
						resolve(text === '' ? {} : JSON.parse(text));
					} catch {
						resolve(text);
					}
				});
			},
		);
		request.on('error', reject);
		if (payload !== undefined) request.write(payload);
		request.end();
	});
}

function buildHelpers() {
	return {
		async httpRequestWithAuthentication(
			this: unknown,
			_type: string,
			options: IHttpRequestOptions,
		) {
			applyCredentials(options, { apiKey: TEST_API_KEY, baseUrl: TEST_BASE_URL });
			return await rawRequest(options);
		},
		async httpRequest(this: unknown, options: IHttpRequestOptions) {
			return await rawRequest(options);
		},
		returnJsonArray(data: IDataObject | IDataObject[]): INodeExecutionData[] {
			const list = Array.isArray(data) ? data : [data];
			return list.map((json) => ({ json }));
		},
		constructExecutionMetaData(
			data: INodeExecutionData[],
			meta: { itemData: { item: number } },
		): INodeExecutionData[] {
			return data.map((entry) => ({ ...entry, pairedItem: meta.itemData }));
		},
		assertBinaryData(_index: number, _property: string) {
			return { fileName: 'photo.png', mimeType: 'image/png', data: '' };
		},
		async getBinaryDataBuffer(_index: number, _property: string) {
			return Buffer.from('binary-bytes');
		},
	};
}

function readParameter(params: IDataObject, name: string, fallback?: unknown) {
	if (name in params) return params[name];

	// Supports the `collection.field` addressing the node uses for fixed collections.
	const [head, tail] = name.split('.');
	if (tail !== undefined && head in params) {
		const parent = params[head] as IDataObject | undefined;
		if (parent !== undefined && tail in parent) return parent[tail];
	}

	return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createExecuteFunctions(options: HarnessOptions = {}): any {
	const params = options.params ?? {};
	return {
		getInputData: () => options.items ?? [{ json: {} }],
		getNode: () => testNode,
		continueOnFail: () => false,
		getNodeParameter: (name: string, _index?: number, fallback?: unknown) =>
			readParameter(params, name, fallback),
		getCurrentNodeParameter: (name: string) => params[name],
		getCredentials: async () =>
			options.credentials ?? { apiKey: TEST_API_KEY, baseUrl: TEST_BASE_URL },
		helpers: buildHelpers(),
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createHookFunctions(options: HarnessOptions = {}): any {
	const params = options.params ?? {};
	const staticData = options.staticData ?? {};
	return {
		getNode: () => testNode,
		getWorkflowStaticData: () => staticData,
		getNodeWebhookUrl: () => options.webhookUrl ?? 'https://n8n.test/webhook/fopost',
		getNodeParameter: (name: string, fallback?: unknown) => readParameter(params, name, fallback),
		getCredentials: async () =>
			options.credentials ?? { apiKey: TEST_API_KEY, baseUrl: TEST_BASE_URL },
		helpers: buildHelpers(),
		staticData,
	};
}

export interface WebhookHarness {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	context: any;
	status: jest.Mock;
	json: jest.Mock;
}

export function createWebhookFunctions(options: HarnessOptions = {}): WebhookHarness {
	const params = options.params ?? {};
	const staticData = options.staticData ?? {};
	const json = jest.fn();
	const status = jest.fn(() => ({ json }));

	return {
		status,
		json,
		context: {
			getNode: () => testNode,
			getWorkflowStaticData: () => staticData,
			getHeaderData: () => options.headers ?? {},
			getBodyData: () => options.body ?? {},
			getRequestObject: () => ({ rawBody: options.rawBody }),
			getResponseObject: () => ({ status }),
			getNodeParameter: (name: string, fallback?: unknown) => readParameter(params, name, fallback),
			getCredentials: async () => options.credentials ?? { apiKey: TEST_API_KEY },
			helpers: buildHelpers(),
		},
	};
}
