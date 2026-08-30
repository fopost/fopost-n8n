import type { INodeProperties } from 'n8n-workflow';

export function workspaceIdField(
	displayOptions: INodeProperties['displayOptions'],
	required = true,
): INodeProperties {
	return {
		displayName: 'Workspace Name or ID',
		name: 'workspaceId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getWorkspaces' },
		default: '',
		required,
		displayOptions,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	};
}

export function returnAllFields(
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			displayOptions: {
				show: {
					...(displayOptions?.show ?? {}),
					returnAll: [false],
				},
			},
			description: 'Max number of results to return',
		},
	];
}
