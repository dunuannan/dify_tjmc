const fs = require('fs');

const source = fs.readFileSync('purchase_approval_workflow.yml', 'utf8');

const checks = [
  {
    name: 'declares md_exporter dependency',
    ok: source.includes('plugin_unique_identifier: bowenliang123/md_exporter:3.6.9@3f027d63e80b44d5d5a9f706871afaef37905b8f8a89a2d152dc530211a8acb1'),
  },
  {
    name: 'builds markdown export filename',
    ok: source.includes('id: export_filename_builder') && source.includes('title: 生成导出文件名'),
  },
  {
    name: 'exports final review text with markdown exporter',
    ok: source.includes('id: markdown_exporter')
      && source.includes('provider_id: bowenliang123/md_exporter/md_exporter')
      && source.includes('- final_review_llm\n            - text')
      && source.includes('tool_name: md_to_md'),
  },
  {
    name: 'routes final review through filename builder and exporter',
    ok: source.includes('final_review_llm-source-export_filename_builder-target')
      && source.includes('export_filename_builder-source-markdown_exporter-target')
      && source.includes('markdown_exporter-source-review_output-target'),
  },
  {
    name: 'returns markdown file output',
    ok: source.includes('- markdown_exporter\n          - files\n          variable: audit_report_md_file'),
  },
];

const failures = checks.filter((check) => !check.ok);

if (failures.length > 0) {
  console.error('purchase markdown export checks failed:');
  for (const failure of failures)
    console.error(`- ${failure.name}`);
  process.exit(1);
}

console.log('purchase markdown export checks passed');
