import type { INodeProperties } from 'n8n-workflow';

import { workspaceIdField } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['analytics'], operation: operations },
});

export const analyticsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['analytics'] } },
		options: [
			{
				name: 'Get Overview',
				value: 'getOverview',
				description: 'Get headline metrics for a period',
				action: 'Get an analytics overview',
			},
			{
				name: 'Get Time Series',
				value: 'getTimeSeries',
				description: 'Get metrics bucketed by day',
				action: 'Get an analytics time series',
			},
			{
				name: 'Get Top Posts',
				value: 'getTopPosts',
				description: 'Get the best performing posts of a period',
				action: 'Get the top posts',
			},
		],
		default: 'getOverview',
	},
];

export const analyticsFields: INodeProperties[] = [
	workspaceIdField(showFor(['getOverview', 'getTimeSeries', 'getTopPosts']), false),
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 30,
		displayOptions: showFor(['getOverview', 'getTimeSeries', 'getTopPosts']),
		description: 'Size of the lookback window in days',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: showFor(['getTopPosts']),
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor(['getOverview', 'getTimeSeries', 'getTopPosts']),
		options: [
			{
				displayName: 'Account ID',
				name: 'accountId',
				type: 'string',
				default: '',
				description: 'Restrict the report to one connected account',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Range start, inclusive. Overrides the day window.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Range end, exclusive. Overrides the day window.',
			},
		],
	},
];
