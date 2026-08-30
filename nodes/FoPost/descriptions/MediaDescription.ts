import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields, workspaceIdField } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['media'], operation: operations },
});

export const mediaOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['media'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a media library item',
				action: 'Delete a media item',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many media library items',
				action: 'Get many media items',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload binary data to the media library',
				action: 'Upload a media item',
			},
		],
		default: 'upload',
	},
];

export const mediaFields: INodeProperties[] = [
	{
		displayName: 'Media ID',
		name: 'mediaId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['delete']),
		description: 'The UUID of the media library item',
	},
	workspaceIdField(showFor(['getAll', 'upload'])),
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: showFor(['upload']),
		hint: 'The name of the input binary field containing the file to upload',
	},
	...returnAllFields(showFor(['getAll'])),
];
