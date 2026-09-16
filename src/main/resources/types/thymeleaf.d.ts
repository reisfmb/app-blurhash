// lib-thymeleaf ships no @enonic-types package; declare what we use. A plain module (not an
// ambient `declare module`) so tsconfig `paths` can map '/lib/thymeleaf' straight here.
export function render(view: unknown, model?: Record<string, unknown>): string;
