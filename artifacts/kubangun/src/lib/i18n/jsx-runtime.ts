/**
 * Localize presentation at the React rendering boundary, not in stored records.
 * Text, accessible labels and hints share the same catalog. Input values, IDs,
 * URLs and event handlers are never translated. data-i18n="off" protects content
 * authored by a user, including descendants.
 */
import { createContext, useContext, useSyncExternalStore } from 'react';
import { jsx as reactJsx, jsxs as reactJsxs, Fragment } from 'react/jsx-runtime';
import { getLanguage, subscribeLanguage } from './language';
import { translate } from './translate';
export { Fragment };
export type { JSX } from 'react/jsx-runtime';

type Element = Parameters<typeof reactJsx>[0];
type Props = Record<string, unknown>;
const textProps = ['aria-label', 'aria-description', 'title', 'placeholder', 'alt', 'label', 'hint', 'body', 'kicker'];
const TranslationEnabled = createContext(true);

function textOf(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(textOf);
    if (parts.every((part) => part !== undefined)) return parts.join('');
  }
  return undefined;
}

function LocalizedElement({ element, original, staticChildren }: { element: Element; original: Props; staticChildren: boolean }) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
  const inherited = useContext(TranslationEnabled);
  const enabled = inherited && original['data-i18n'] !== 'off';
  const localize = (node: unknown): unknown => typeof node === 'string'
    ? translate(node, language)
    : Array.isArray(node) ? node.map(localize) : node;
  const props = { ...original };
  // Translating an implicit option value would change persisted enum values.
  if (element === 'option' && props.value === undefined) {
    const value = textOf(original.children);
    if (value !== undefined) props.value = value;
  }
  if (enabled) {
    for (const key of textProps) if (typeof props[key] === 'string') props[key] = translate(props[key] as string, language);
    if (element !== 'input' && element !== 'textarea') props.children = localize(props.children);
  }
  const result = staticChildren ? reactJsxs(element, props) : reactJsx(element, props);
  return !enabled && inherited
    ? reactJsx(TranslationEnabled.Provider, { value: false, children: result })
    : result;
}

export function jsx(element: Element, props: Props | null, key?: string, staticChildren = false) {
  if (!props) return reactJsx(element, props, key);
  const needsTranslation = typeof element === 'string'
    || props['data-i18n'] === 'off'
    || textProps.some((name) => typeof props[name] === 'string')
    || typeof props.children === 'string'
    || Array.isArray(props.children) && props.children.some((child) => typeof child === 'string');
  return needsTranslation
    ? reactJsx(LocalizedElement, { element, original: props, staticChildren }, key)
    : (staticChildren ? reactJsxs : reactJsx)(element, props, key);
}
export function jsxs(element: Element, props: Props | null, key?: string) {
  return jsx(element, props, key, true);
}