import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['workspace'], operation: operations },
});

export const workspaceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['workspace'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a workspace',
				action: 'Create a workspace',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a workspace',
				action: 'Get a workspace',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many workspaces',
				action: 'Get many workspaces',
			},
		],
		default: 'getAll',
	},
];

export const workspaceFields: INodeProperties[] = [
	{
		displayName: 'Workspace ID',
		name: 'workspaceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['get']),
		description: 'The UUID of the workspace',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['create']),
		description: 'Display name of the workspace',
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['create']),
		description: 'URL-safe identifier, lowercase letters, digits and hyphens only',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['create']),
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				description: 'Country the workspace operates from',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'What the workspace is for',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'en',
				description: 'Default content language of the workspace',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: 'UTC',
				description: 'IANA timezone used when scheduling posts',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Agency', value: 'AGENCY' },
					{ name: 'Brand', value: 'BRAND' },
					{ name: 'Client', value: 'CLIENT' },
					{ name: 'Community', value: 'COMMUNITY' },
					{ name: 'Department', value: 'DEPARTMENT' },
					{ name: 'Event', value: 'EVENT' },
					{ name: 'Organization', value: 'ORGANIZATION' },
					{ name: 'Personal', value: 'PERSONAL' },
					{ name: 'Project', value: 'PROJECT' },
					{ name: 'Team', value: 'TEAM' },
					{ name: 'Temporary', value: 'TEMPORARY' },
				],
				default: 'PERSONAL',
				description: 'How the workspace is classified',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Website associated with the workspace',
			},
		],
	},
	...returnAllFields(showFor(['getAll'])),
];
