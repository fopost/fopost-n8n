import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const FOPOST_CREDENTIALS = 'foPostApi';
export const DEFAULT_BASE_URL = 'https://api.fopost.com';

/** Hard stop so a malformed `meta` block can never spin forever. */
const MAX_PAGES = 500;

/** What a FoPost endpoint answers: an envelope, a bare object, or a bare list. */
export type FoPostResponse = IDataObject | IDataObject[];

export type FoPostContext =
	IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions;

export async function foPostApiRequest(
	this: FoPostContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | Buffer = {},
	qs: IDataObject = {},
	overrides: Partial<IHttpRequestOptions> = {},
): Promise<FoPostResponse> {
	const credentials = await this.getCredentials(FOPOST_CREDENTIALS);
	const baseUrl = ((credentials.baseUrl as string) || DEFAULT_BASE_URL).replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}/v1${endpoint}`,
		headers: { Accept: 'application/json' },
		json: true,
		...overrides,
	};

	const cleanedQs = stripEmpty(qs);
	if (Object.keys(cleanedQs).length > 0) options.qs = cleanedQs;

	if (Buffer.isBuffer(body)) {
		options.body = body;
	} else if (Object.keys(body).length > 0 || method === 'POST' || method === 'PUT') {
		options.body = body;
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			FOPOST_CREDENTIALS,
			options,
		)) as FoPostResponse;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/** Most FoPost reads and writes answer `{ "data": ... }`. */
export function unwrap(response: FoPostResponse): FoPostResponse {
	if (response && typeof response === 'object' && !Array.isArray(response) && 'data' in response) {
		return response.data as FoPostResponse;
	}
	return response;
}

/** Walks `page`/`per_page` until `meta.last_page` is reached. */
export async function foPostApiRequestAllItems(
	this: FoPostContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const collected: IDataObject[] = [];
	let page = 1;
	let lastPage = 1;

	do {
		const response = await foPostApiRequest.call(this, method, endpoint, body, {
			...qs,
			page,
			per_page: 100,
		});
		const envelope = (Array.isArray(response) ? {} : (response ?? {})) as IDataObject;
		const items = Array.isArray(envelope.data) ? (envelope.data as IDataObject[]) : [];
		collected.push(...items);

		const reported = Number((envelope.meta as IDataObject | undefined)?.last_page);
		lastPage = Number.isFinite(reported) && reported > 0 ? reported : page;
		if (items.length === 0) break;
		page += 1;
	} while (page <= lastPage && page <= MAX_PAGES);

	return collected;
}

/** Endpoints that answer a plain array; `returnAll` is a client-side slice. */
export async function foPostApiRequestList(
	this: FoPostContext,
	endpoint: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	const items = (unwrap(await foPostApiRequest.call(this, 'GET', endpoint, {}, qs)) ??
		[]) as IDataObject[];
	if (!Array.isArray(items)) return [items];
	return returnAll ? items : items.slice(0, limit);
}

export function stripEmpty(input: IDataObject): IDataObject {
	const output: IDataObject = {};
	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null || value === '') continue;
		output[key] = value;
	}
	return output;
}

/** Comma-joined list, tolerating either a real array or a pasted string. */
export function toIdArray(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String).filter((entry) => entry !== '');
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry !== '');
	}
	return [];
}

export function toOptions(
	items: IDataObject[],
	labelKeys: string[] = ['name'],
): INodePropertyOptions[] {
	return items
		.map((item) => {
			const label = labelKeys.map((key) => item[key]).find((value) => Boolean(value));
			return {
				name: String(label ?? item.id ?? ''),
				value: String(item.id ?? ''),
			};
		})
		.filter((option) => option.value !== '')
		.sort((a, b) => a.name.localeCompare(b.name));
}
