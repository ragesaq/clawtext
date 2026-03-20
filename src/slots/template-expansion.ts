import { resolveSlotTemplate, type SlotApiContext, type SlotApiResult } from './slot-api.js';

export interface SlotTemplateExpansion {
  output: string;
  replacements: Array<{
    token: string;
    selector: string;
    resolved: boolean;
  }>;
}

function stringifyResult(result: SlotApiResult): string {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  return JSON.stringify(result, null, 2);
}

export function expandSlotTemplates(
  input: string,
  ctx: SlotApiContext,
  options?: {
    onMissing?: 'leave' | 'empty';
  },
): SlotTemplateExpansion {
  const source = String(input ?? '');
  const replacements: SlotTemplateExpansion['replacements'] = [];
  const onMissing = options?.onMissing ?? 'leave';

  const output = source.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (token, selectorRaw: string) => {
    const selector = String(selectorRaw ?? '').trim();
    const result = resolveSlotTemplate(ctx, selector);
    const resolved = result != null;

    replacements.push({ token, selector, resolved });

    if (!resolved) {
      return onMissing === 'empty' ? '' : token;
    }

    return stringifyResult(result);
  });

  return { output, replacements };
}
