import { jsx, jsxs } from './jsx-runtime';
export { Fragment } from './jsx-runtime';
export type { JSX } from 'react/jsx-runtime';
export function jsxDEV(
  element: Parameters<typeof jsx>[0],
  props: Parameters<typeof jsx>[1],
  key: string | undefined,
  staticChildren: boolean,
) {
  return (staticChildren ? jsxs : jsx)(element, props, key);
}