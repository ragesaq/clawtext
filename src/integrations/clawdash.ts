import { expandSlotTemplates, resolveSlotTemplate, type SlotApiContext, type SlotApiResult } from '../slots/index.js';

export interface ClawDashPanelOptions {
  selectors?: string[];
  template?: string;
  onMissing?: 'leave' | 'empty';
}

export interface ClawDashPanelResult {
  data: Record<string, SlotApiResult>;
  rendered?: string;
  replacements?: Array<{
    token: string;
    selector: string;
    resolved: boolean;
  }>;
}

const DEFAULT_SELECTORS = [
  'advisor.active',
  'session.owner:current',
  'session.related:current',
  'session.matrix:current-project',
  'council.perspectives',
];

export function renderClawDashPanel(
  ctx: SlotApiContext,
  options: ClawDashPanelOptions = {},
): ClawDashPanelResult {
  const selectors = options.selectors?.length ? options.selectors : DEFAULT_SELECTORS;
  const data = Object.fromEntries(
    selectors.map((selector) => [selector, resolveSlotTemplate(ctx, selector)]),
  );

  if (!options.template) {
    return { data };
  }

  const expanded = expandSlotTemplates(options.template, ctx, { onMissing: options.onMissing ?? 'leave' });
  return {
    data,
    rendered: expanded.output,
    replacements: expanded.replacements,
  };
}
