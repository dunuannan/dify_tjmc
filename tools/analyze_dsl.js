const fs = require('fs');
const path = require('path');

const root = process.cwd();

function scalar(value) {
  if (value == null)
    return '';
  const trimmed = value.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'"))
    || (trimmed.startsWith('"') && trimmed.endsWith('"')))
    return trimmed.slice(1, -1);
  return trimmed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function field(block, key, indent = '        ') {
  const match = block.match(new RegExp(`^${indent}${escapeRegExp(key)}:\\s*(.*)$`, 'm'));
  return match ? scalar(match[1]) : '';
}

function extractNodes(source) {
  const start = source.indexOf('\n    nodes:\n');
  if (start < 0)
    return [];
  const end = source.indexOf('\n    viewport:', start);
  const section = source.slice(start, end > 0 ? end : undefined);
  return section.split('\n    - data:\n').slice(1).map((block) => ({
    id: field(block, 'id', '      '),
    type: field(block, 'type'),
    title: field(block, 'title'),
    desc: field(block, 'desc'),
    modelProvider: field(block, 'provider'),
    modelName: field(block, 'name'),
    variableSelectors: [...block.matchAll(/^          variable_selector:\n((?:            - [^\n]+\n?)+)/mg)]
      .map((match) => [...match[1].matchAll(/^            -\s*(.*)$/mg)].map((item) => scalar(item[1])).join('.')),
    outputVariables: [...block.matchAll(/^        outputs:\n([\s\S]*?)(?=^        \w|^      \w|\Z)/mg)]
      .flatMap((match) => [...match[1].matchAll(/^          variable:\s*([^\n]+)/mg)].map((item) => scalar(item[1]))),
    hasPrompt: /prompt_template:|system_prompt_template:|text:\s*'|text:\s*\|/.test(block),
  }));
}

function extractEdges(source) {
  const start = source.indexOf('\n    edges:\n');
  const end = source.indexOf('\n    nodes:\n', start);
  if (start < 0 || end < 0)
    return [];
  const section = source.slice(start, end);
  return section.split('\n    - data:\n').slice(1).map((block) => ({
    source: field(block, 'source', '      '),
    target: field(block, 'target', '      '),
    sourceType: field(block, 'sourceType'),
    targetType: field(block, 'targetType'),
  }));
}

function appMeta(source) {
  return {
    name: source.match(/^  name: (.*)$/m)?.[1] || '',
    mode: source.match(/^  mode: (.*)$/m)?.[1] || '',
    description: source.match(/^  description: (.*)$/m)?.[1] || '',
    version: source.match(/^version: (.*)$/m)?.[1] || '',
  };
}

function yamlFiles(dir) {
  return fs.readdirSync(dir)
    .filter((file) => /\.ya?ml$/i.test(file))
    .sort();
}

const summaries = {};
for (const file of yamlFiles(root)) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const nodes = extractNodes(source);
  const edges = extractEdges(source);
  summaries[file] = {
    app: appMeta(source),
    dependencies: [...source.matchAll(/(?:marketplace_plugin_unique_identifier|plugin_unique_identifier):\s*([^\n]+)/g)].map((match) => match[1]),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodeTypes: nodes.map((node) => node.type),
    nodes,
    edges,
  };
}

console.log(JSON.stringify(summaries, null, 2));
