import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields, workspaceIdField } from './SharedFields';

const showFor = (operations: string[]): INodeProperties['displayOptions'] => ({
	show: { resource: ['post'], operation: operations },
});

export const postOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel a scheduled or in-flight post',
				action: 'Cancel a post',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a draft or scheduled post',
				action: 'Create a post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a post',
				action: 'Delete a post',
			},
			{
				name: 'Duplicate',
				value: 'duplicate',
				description: 'Copy a post into a new draft',
				action: 'Duplicate a post',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a post',
				action: 'Get a post',
			},
			{
				name: 'Get Deliveries',
				value: 'getDeliveries',
				description: 'Get the per-account delivery records of a post',
				action: 'Get the deliveries of a post',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many posts',
				action: 'Get many posts',
			},
			{
				name: 'Preflight',
				value: 'preflight',
				description: 'Check a post against every target platform without publishing',
				action: 'Preflight a post',
			},
			{
				name: 'Publish',
				value: 'publish',
				description: 'Queue a post for delivery',
				action: 'Publish a post',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a draft or scheduled post',
				action: 'Update a post',
			},
		],
		default: 'create',
	},
];

export const postFields: INodeProperties[] = [
	// ─── Shared ID ────────────────────────────────────────────────
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: showFor([
			'cancel',
			'delete',
			'duplicate',
			'get',
			'getDeliveries',
			'preflight',
			'publish',
			'update',
		]),
		description: 'The UUID of the post',
	},

	// ─── Create ───────────────────────────────────────────────────
	workspaceIdField(showFor(['create'])),
	{
		displayName: 'Account Names or IDs',
		name: 'accounts',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getAccounts', loadOptionsDependsOn: ['workspaceId'] },
		default: [],
		required: true,
		displayOptions: showFor(['create']),
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: {
			show: { resource: ['post'], operation: ['create'], useThread: [false] },
		},
		description: 'The body of the post',
	},
	{
		displayName: 'Thread',
		name: 'useThread',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['create']),
		description: 'Whether to send several content blocks as a thread instead of one block',
	},
	{
		displayName: 'Blocks',
		name: 'blocks',
		placeholder: 'Add Block',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		default: {},
		displayOptions: {
			show: { resource: ['post'], operation: ['create'], useThread: [true] },
		},
		options: [
			{
				displayName: 'Block',
				name: 'block',
				values: [
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'The body of this block',
					},
				],
			},
		],
		description: 'Ordered content blocks; each one becomes a post in the thread',
	},
	{
		displayName: 'Media',
		name: 'media',
		placeholder: 'Add Media',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		displayOptions: showFor(['create']),
		options: [
			{
				displayName: 'Item',
				name: 'item',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'GIF', value: 'gif' },
							{ name: 'Image', value: 'image' },
							{ name: 'Video', value: 'video' },
						],
						default: 'image',
						description: 'The kind of attachment',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'File name of the attachment',
					},
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: 'Publicly reachable URL of the attachment',
					},
					{
						displayName: 'Alt Text',
						name: 'alt',
						type: 'string',
						default: '',
						description: 'Accessibility description of the attachment',
					},
				],
			},
		],
		description: 'Attachments added to the first content block',
	},

	// ─── Create / Update options ──────────────────────────────────
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor(['create', 'update']),
		options: [
			{
				displayName: 'Artifact Type',
				name: 'artifact_type',
				type: 'options',
				options: [
					{ name: 'Article', value: 'article' },
					{ name: 'Carousel', value: 'carousel' },
					{ name: 'Link Share', value: 'link_share' },
					{ name: 'Short Video', value: 'short_video' },
					{ name: 'Text Post', value: 'text_post' },
					{ name: 'Thread', value: 'thread' },
				],
				default: 'text_post',
				description: 'How the post is shaped on the target platforms',
			},
			{
				displayName: 'Auto Plug',
				name: 'auto_plug',
				type: 'boolean',
				default: false,
				description: 'Whether to add a follow-up comment after publishing',
			},
			{
				displayName: 'Auto Plug Content',
				name: 'auto_plug_content',
				type: 'string',
				default: '',
				description: 'Body of the follow-up comment',
			},
			{
				displayName: 'Content Type',
				name: 'content_type',
				type: 'options',
				options: [
					{ name: 'Post', value: 'post' },
					{ name: 'Reel', value: 'reel' },
					{ name: 'Thread', value: 'thread' },
				],
				default: 'post',
				description: 'The composition mode of the post',
			},
			{
				displayName: 'Internal Title',
				name: 'internal_title',
				type: 'string',
				default: '',
				description: 'Name shown inside FoPost only',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getLabels', loadOptionsDependsOn: ['workspaceId'] },
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Schedule At',
				name: 'schedule_at',
				type: 'dateTime',
				default: '',
				description: 'When to publish the post; required when the status is scheduled',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Scheduled', value: 'scheduled' },
				],
				default: 'draft',
				description: 'Whether the post waits as a draft or is queued for its schedule time',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				description: 'Short summary stored with the post',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title used by platforms that carry one',
			},
		],
	},

	// ─── Update ───────────────────────────────────────────────────
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: showFor(['update']),
		description: 'Replacement body for the post. Leave empty to keep the current content.',
	},

	// ─── Get Many ─────────────────────────────────────────────────
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
				displayName: 'Account IDs',
				name: 'account_id',
				type: 'string',
				default: '',
				description: 'Comma-separated account UUIDs',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Range start, inclusive',
			},
			{
				displayName: 'Label IDs',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Comma-separated label UUIDs',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'string',
				default: '',
				description: 'Comma-separated platform names, for example twitter,linkedin',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Full-text match against post content',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Partially Failed', value: 'partially_failed' },
					{ name: 'Published', value: 'published' },
					{ name: 'Publishing', value: 'publishing' },
					{ name: 'Scheduled', value: 'scheduled' },
				],
				default: 'scheduled',
				description: 'Only posts in this state',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Range end, exclusive',
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

	// ─── Publish / Cancel ─────────────────────────────────────────
	{
		displayName: 'Account IDs',
		name: 'accountIds',
		type: 'string',
		default: '',
		displayOptions: showFor(['cancel', 'publish']),
		description:
			'Comma-separated account UUIDs to act on. Leave empty to cover every account on the post.',
	},
	{
		displayName: 'Dry Run',
		name: 'dryRun',
		type: 'boolean',
		default: false,
		displayOptions: showFor(['publish']),
		description: 'Whether to validate delivery without sending anything to a platform',
	},
];
