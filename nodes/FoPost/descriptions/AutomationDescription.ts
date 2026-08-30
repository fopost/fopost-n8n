import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['automation'], operation: operations },
});

export const automationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['automation'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get an automation',
				action: 'Get an automation',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many automations',
				action: 'Get many automations',
			},
			{
				name: 'Toggle',
				value: 'toggle',
				description: 'Turn an automation on or off',
				action: 'Toggle an automation',
			},
			{
				name: 'Trigger',
				value: 'trigger',
				description: 'Run an automation now',
				action: 'Trigger an automation',
			},
		],
		default: 'getAll',
	},
];

export const automationFields: INodeProperties[] = [
	{
		displayName: 'Automation ID',
		name: 'automationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['get', 'toggle', 'trigger']),
		description: 'The UUID of the automation',
	},
	{
		displayName: 'Payload',
		name: 'payload',
		type: 'json',
		default: '{}',
		displayOptions: showFor(['trigger']),
		description: 'JSON body handed to the automation run',
	},
	...returnAllFields(showFor(['getAll'])),
];
