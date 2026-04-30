const fs = require('fs');

const source = fs.readFileSync('purchase_approval_workflow.yml', 'utf8');

const checks = [
  {
    name: 'start input label uses 万元',
    ok: source.includes('label: 预算金额（万元）'),
  },
  {
    name: 'summary prompt uses 万元',
    ok: source.includes('项目预算金额：{{budget_amount}} 万元'),
  },
  {
    name: 'review package uses 万元',
    ok: source.includes('预算金额：{{ budget_amount }} 万元'),
  },
  {
    name: 'threshold logic uses 50 万元',
    ok: source.includes('{% if budget_amount|float >= 50 %}')
      && source.includes('本项目预算金额 ≥ 50 万元，需要特别关注中小企业扶持政策响应。'),
  },
  {
    name: 'final report labels threshold as 50万元',
    ok: source.includes('中小企业政策响应（≥50万元）'),
  },
  {
    name: 'old yuan unit and yuan threshold removed from budget flow',
    ok: !source.includes('预算金额（元）')
      && !source.includes('{{budget_amount}} 元')
      && !source.includes('{{ budget_amount }} 元')
      && !source.includes('500000')
      && !source.includes('500,000 元'),
  },
];

const failures = checks.filter((check) => !check.ok);

if (failures.length > 0) {
  console.error('purchase budget unit checks failed:');
  for (const failure of failures)
    console.error(`- ${failure.name}`);
  process.exit(1);
}

console.log('purchase budget unit checks passed');
