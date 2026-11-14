#!/usr/bin/env node
// Checks every workflow in templates/ against what n8n's import and its template review need:
// a well-formed graph, FoPost nodes this package really ships, no credentials or private data,
// and the sticky notes the creator-portal guidelines ask for.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const shipped = new Set(
	pkg.n8n.nodes.map((entry) => {
		const file = entry.split('/').pop().replace('.node.js', '');
		return `${pkg.name}.${file.charAt(0).toLowerCase()}${file.slice(1)}`;
	}),
);

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const SECRET = /(api[_-]?key|token|password|secret)["']?\s*[:=]\s*["'][^"'{}$]{8,}/i;
const STICKY = 'n8n-nodes-base.stickyNote';
const words = (text) => text.split(/\s+/).filter(Boolean).length;

let failures = 0;
const dir = join(root, 'templates');

for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
	const problems = [];
	const raw = readFileSync(join(dir, file), 'utf8');
	let workflow;
	try {
		workflow = JSON.parse(raw);
	} catch (error) {
		problems.push(`invalid JSON: ${error.message}`);
	}

	if (workflow) {
		const { name, nodes, connections } = workflow;
		if (typeof name !== 'string' || name.length === 0) problems.push('missing workflow name');
		if (!Array.isArray(nodes) || nodes.length === 0) problems.push('no nodes');
		if (typeof connections !== 'object') problems.push('no connections object');
		if (workflow.pinData && Object.keys(workflow.pinData).length > 0) problems.push('pinned data');

		const names = new Set();
		const ids = new Set();
		for (const node of nodes ?? []) {
			if (names.has(node.name)) problems.push(`duplicate node name "${node.name}"`);
			if (ids.has(node.id)) problems.push(`duplicate node id "${node.id}"`);
			names.add(node.name);
			ids.add(node.id);
			for (const key of ['id', 'name', 'type', 'typeVersion', 'position', 'parameters']) {
				if (!(key in node)) problems.push(`"${node.name}" has no ${key}`);
			}
			if (node.credentials) problems.push(`"${node.name}" carries credentials; remove them`);
			if (node.type.startsWith(`${pkg.name}.`) && !shipped.has(node.type)) {
				problems.push(`"${node.name}" uses ${node.type}, which this package does not ship`);
			}
		}

		const targets = new Set();
		for (const [source, outputs] of Object.entries(connections ?? {})) {
			if (!names.has(source)) problems.push(`connection from unknown node "${source}"`);
			for (const branch of outputs.main ?? []) {
				for (const link of branch ?? []) {
					if (!names.has(link.node)) problems.push(`connection to unknown node "${link.node}"`);
					targets.add(link.node);
				}
			}
		}
		for (const node of nodes ?? []) {
			if (node.type === STICKY) continue;
			const isTrigger = !targets.has(node.name);
			if (isTrigger && !/trigger/i.test(node.type)) {
				problems.push(`"${node.name}" has no input and is not a trigger`);
			}
		}

		const stickies = (nodes ?? []).filter((node) => node.type === STICKY);
		const overview = stickies.find((node) => /### How it works/.test(node.parameters.content));
		if (!overview) {
			problems.push('no overview sticky note with "### How it works"');
		} else {
			const count = words(overview.parameters.content);
			if (!/### Setup/.test(overview.parameters.content)) problems.push('overview has no "### Setup"');
			if (count < 100 || count > 300) problems.push(`overview is ${count} words, not 100-300`);
		}
		const nodeCount = (nodes ?? []).filter((node) => node.type !== STICKY).length;
		const sections = stickies.filter((node) => node !== overview);
		if (nodeCount >= 4 && sections.length === 0) problems.push('4+ nodes but no section notes');
		for (const note of sections) {
			const count = words(note.parameters.content);
			if (count > 50) problems.push(`section note "${note.name}" is ${count} words, over 50`);
		}

		if (EMAIL.test(raw)) problems.push(`contains an email address (${raw.match(EMAIL)[0]})`);
		if (SECRET.test(raw)) problems.push('looks like it contains a secret');
	}

	console.log(`${problems.length === 0 ? 'ok  ' : 'FAIL'} ${file}`);
	for (const problem of problems) console.log(`     ${problem}`);
	failures += problems.length;
}

process.exitCode = failures === 0 ? 0 : 1;
