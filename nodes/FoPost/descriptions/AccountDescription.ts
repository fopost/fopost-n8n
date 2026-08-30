import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields, workspaceIdField } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['account'], operation: operations },
});

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a connected account',
				action: 'Get an account',
			},
			{
				name: 'Get Health',
				value: 'getHealth',
				description: 'Get the connection health of an account',
				action: 'Get the health of an account',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many connected accounts',
				action: 'Get many accounts',
			},
			{
				name: 'Refresh Token',
				value: 'refreshToken',
				description: 'Force a refresh of the stored platform token',
				action: 'Refresh the token of an account',
			},
			{
				name: 'Validate',
				value: 'validate',
				description: 'Check the stored credentials against the platform',
				action: 'Validate an account',
			},
		],
		default: 'getAll',
	},
];

export const accountFields: INodeProperties[] = [
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['get', 'getHealth', 'refreshToken', 'validate']),
		description: 'The UUID of the connected account',
	},
	{
		displayName: 'Refresh',
		name: 'refresh',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['getHealth']),
		description: 'Whether to re-check the platform instead of reading the cached health record',
	},
	workspaceIdField(showFor(['getAll']), false),
	...returnAllFields(showFor(['getAll'])),
];
