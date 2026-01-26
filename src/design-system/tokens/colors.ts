/**
 * Design System Saraiva.AI - Color Tokens
 * WhatsApp DNA + AI Magic
 */

export const colors = {
  // === Core (WhatsApp DNA) ===
  primary: '#075E54',
  primaryDark: '#054D44',
  secondary: '#25D366',

  // === AI Magic ===
  aiPrimary: '#8B5CF6',
  aiSecondary: '#A78BFA',
  aiGlow: '#C4B5FD',
  aiCyan: '#06B6D4',

  // === Surfaces ===
  surface: '#FFFFFF',
  surfaceElevated: '#F8F9FA',
  surfaceMagic: 'rgba(139, 92, 246, 0.08)',
  background: '#FFFFFF',
  chatBackground: '#ECE5DD',

  // === Message Bubbles ===
  bubbleSent: '#DCF8C6',
  bubbleReceived: '#FFFFFF',
  bubbleIA: '#F3E8FF', // Fallback solid color for IA messages

  // === Text ===
  textPrimary: '#000000',
  textSecondary: '#667781',
  textLight: '#FFFFFF',
  textMuted: '#9CA3AF',

  // === Status ===
  online: '#25D366',
  checkBlue: '#34B7F1',
  checkGray: '#667781',

  // === Confidence Levels ===
  confidenceHigh: '#22C55E',
  confidenceMedium: '#EAB308',
  confidenceLow: '#F87171',

  // === Borders ===
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderMagic: 'rgba(139, 92, 246, 0.3)',

  // === Overlays ===
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // === Icons ===
  iconActive: '#075E54',
  iconInactive: '#667781',
} as const;

export type ColorToken = keyof typeof colors;
