import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields, workspaceIdField } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['label'], operation: operations },
});

export const labelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['label'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a label',
				action: 'Create a label',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a label',
				action: 'Delete a label',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many labels',
				action: 'Get many labels',
			},
		],
		default: 'getAll',
	},
];

export const labelFields: INodeProperties[] = [
	{
		displayName: 'Label ID',
		name: 'labelId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['delete']),
		description: 'The UUID of the label',
	},
	workspaceIdField(showFor(['create'])),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['create']),
		description: 'Display name of the label',
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		required: true,
		default: '#2563eb',
		displayOptions: showFor(['create']),
		description: 'Six-digit hex color used for the label chip',
	},
	workspaceIdField(showFor(['getAll']), false),
	...returnAllFields(showFor(['getAll'])),
];
