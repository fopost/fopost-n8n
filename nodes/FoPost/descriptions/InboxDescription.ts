import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['inbox'], operation: operations },
});

export const inboxOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['inbox'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many comments, mentions, reviews and direct messages',
				action: 'Get many inbox items',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Reply to an inbox item as the connected account',
				action: 'Reply to an inbox item',
			},
		],
		default: 'getAll',
	},
];

export const inboxFields: INodeProperties[] = [
	{
		displayName: 'Inbox Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor(['reply']),
		description: 'The UUID of the comment, mention, review or message to answer',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: showFor(['reply']),
		description: 'The reply, sent on the platform as the connected account',
	},
	...returnAllFields(showFor(['getAll'])),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor(['getAll']),
		options: [
			{
				displayName: 'Account ID',
				name: 'account_id',
				type: 'string',
				default: '',
				description: 'Only items received by this connected account',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'string',
				default: '',
				description: 'Only items from this platform, for example twitter or instagram',
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Match against the item text and author',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{ name: 'Newest', value: 'newest' },
					{ name: 'Oldest', value: 'oldest' },
					{ name: 'Unanswered', value: 'unanswered' },
				],
				default: 'newest',
				description: 'Order of the returned items',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{ name: 'Read', value: 'read' },
					{ name: 'Resolved', value: 'resolved' },
					{ name: 'Snoozed', value: 'snoozed' },
					{ name: 'Unread', value: 'unread' },
				],
				default: 'unread',
				description: 'Only items in this state',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Comment', value: 'comment' },
					{ name: 'Direct Message', value: 'dm' },
					{ name: 'Mention', value: 'mention' },
					{ name: 'Review', value: 'review' },
				],
				default: 'mention',
				description: 'Only items of this kind',
			},
			{
				displayName: 'Workspace ID',
				name: 'workspace_id',
				type: 'string',
				default: '',
				description: 'Restrict the listing to one workspace',
			},
		],
	},
];
