// lib-thymeleaf ships no @enonic-types package; declare what we use.
declare module '/lib/thymeleaf' {
  export function render(view: unknown, model?: Record<string, unknown>): string;
}
