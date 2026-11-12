// The app's own Oxlint rules (lint/plugin.mjs), run on hand-made nodes.
import plugin from '../../lint/plugin.mjs';

const run = (node: Record<string, unknown>) => {
  const reports: unknown[] = [];
  const visitors = plugin.rules['no-han-outside-translations'].create({
    report: (report: unknown) => reports.push(report),
  });
  visitors[node.type as keyof typeof visitors](node as never);
  return reports;
};

describe('no-han-outside-translations', () => {
  it.each([
    { type: 'Literal', value: '公告' },
    { type: 'TemplateElement', value: { raw: '作业 ${', cooked: '作业 ' } },
    { type: 'JSXText', value: '文件' },
  ])('reports Chinese in a $type', node => {
    expect(run(node)).toEqual([{ node, messageId: 'han' }]);
  });

  it.each([
    { type: 'Literal', value: 'Notices' },
    { type: 'Literal', value: 42 },
    { type: 'TemplateElement', value: { raw: 'a\\u516c', cooked: null } },
    { type: 'JSXText', value: '，' },
  ])('leaves other text alone: $value', node => {
    expect(run(node)).toEqual([]);
  });
});
