/**
 * Design System Saraiva.AI - Typography Tokens
 */

import { TextStyle } from 'react-native';

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const typography = {
  // === Headings ===
  headingXL: {
    fontSize: 28,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
    lineHeight: 34,
  } as TextStyle,

  headingLG: {
    fontSize: 22,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.3,
    lineHeight: 28,
  } as TextStyle,

  headingMD: {
    fontSize: 18,
    fontWeight: fontWeights.semibold,
    lineHeight: 24,
  } as TextStyle,

  headingSM: {
    fontSize: 16,
    fontWeight: fontWeights.semibold,
    lineHeight: 22,
  } as TextStyle,

  // === Body ===
  body: {
    fontSize: 16,
    fontWeight: fontWeights.regular,
    lineHeight: 24,
  } as TextStyle,

  bodySmall: {
    fontSize: 14,
    fontWeight: fontWeights.regular,
    lineHeight: 20,
  } as TextStyle,

  // === Captions ===
  caption: {
    fontSize: 13,
    fontWeight: fontWeights.medium,
    lineHeight: 18,
  } as TextStyle,

  captionSmall: {
    fontSize: 11,
    fontWeight: fontWeights.medium,
    lineHeight: 14,
  } as TextStyle,

  // === Special ===
  button: {
    fontSize: 16,
    fontWeight: fontWeights.semibold,
    lineHeight: 20,
  } as TextStyle,

  buttonSmall: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
    lineHeight: 18,
  } as TextStyle,

  label: {
    fontSize: 12,
    fontWeight: fontWeights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
