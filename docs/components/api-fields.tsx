import type { ReactNode } from 'react';

interface ParamFieldProps {
  /** Parameter location — only one of these is set per field. */
  body?: string;
  query?: string;
  path?: string;
  header?: string;
  type?: string;
  required?: boolean;
  default?: string;
  children?: ReactNode;
}

/**
 * API parameter documentation field, replacing Mintlify's `<ParamField>`.
 */
export function ParamField({
  body,
  query,
  path,
  header,
  type,
  required,
  default: defaultValue,
  children,
}: ParamFieldProps) {
  const name = body ?? query ?? path ?? header;

  return (
    <div className="border-b border-fd-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span className="font-semibold text-fd-primary">{name}</span>
        {type && <span className="text-fd-muted-foreground">{type}</span>}
        {defaultValue !== undefined && (
          <span className="text-fd-muted-foreground">default: {defaultValue}</span>
        )}
        {required && (
          <span className="rounded bg-fd-primary/10 px-1.5 py-0.5 text-xs font-medium text-fd-primary">
            required
          </span>
        )}
      </div>
      <div className="mt-1.5 text-sm text-fd-muted-foreground [&>p]:my-1.5">{children}</div>
    </div>
  );
}

interface ExpandableProps {
  title?: string;
  children?: ReactNode;
}

/**
 * Collapsible section for nested object properties, replacing Mintlify's `<Expandable>`.
 */
export function Expandable({ title, children }: ExpandableProps) {
  return (
    <details className="my-2 rounded-lg border border-fd-border bg-fd-card px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-fd-foreground">
        {title ?? 'properties'}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
