# Design System "Saraiva.AI"

**Data:** 2026-01-26
**Identidade:** WhatsApp Evoluído - DNA verde + magia IA roxa/cyan

---

## 1. Fundação Visual

### Paleta de Cores

```typescript
export const colors = {
  // Core (WhatsApp DNA)
  primary: '#075E54',
  primaryDark: '#054D44',
  secondary: '#25D366',

  // AI Magic
  aiPrimary: '#8B5CF6',
  aiSecondary: '#A78BFA',
  aiGlow: '#C4B5FD',
  aiCyan: '#06B6D4',

  // Surfaces
  surface: '#FFFFFF',
  surfaceElevated: '#F8F9FA',
  surfaceMagic: 'rgba(139, 92, 246, 0.08)',

  // Messages
  bubbleSent: '#DCF8C6',
  bubbleReceived: '#FFFFFF',
  bubbleIA: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.1))',

  // Text
  textPrimary: '#000000',
  textSecondary: '#667781',
  textLight: '#FFFFFF',

  // Status
  online: '#25D366',
  checkBlue: '#34B7F1',

  // Borders
  border: '#E0E0E0',
  borderMagic: 'rgba(139, 92, 246, 0.3)',
};
```

### Tipografia

```typescript
export const typography = {
  headingXL: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headingLG: { fontSize: 22, fontWeight: '600' },
  headingMD: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '500' },
  captionSmall: { fontSize: 11, fontWeight: '500' },
};
```

### Spacing

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
```

### Border Radius

```typescript
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};
```

### Shadows

```typescript
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  magic: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
};
```

---

## 2. Componentes

### Botões

**PrimaryButton**
- Gradiente: aiPrimary → aiSecondary
- Border-radius: 12px
- Padding: 16px 24px
- Shadow: magic
- Press: scale(0.97) + haptic light

**SecondaryButton**
- Background: transparent
- Border: 1.5px aiPrimary
- Texto: aiPrimary

**GhostButton**
- Background: transparent
- Texto: textSecondary

### Cards

**SuggestionCard**
- Background: surface
- Border: 1.5px transparent → aiPrimary (selected)
- Border-radius: lg (12px)
- Padding: lg (16px)
- Selected: shadow magic + glow pulsante

**MessageBubble**
- Sent: bubbleSent, radius: 16px (top-right: 4px)
- Received: bubbleReceived, radius: 16px (top-left: 4px)
- IA: bubbleIA gradient + border aiGlow 1px

---

## 3. Modal de Sugestões (Fullscreen)

### Layout

```
┌─────────────────────────────────┐
│  ← Voltar          ✨ Sugestões │  Header (blur)
├─────────────────────────────────┤
│  💭 Análise da IA               │  Opcional
│                                 │
│  [SuggestionCard 1 - selected]  │  Staggered entry
│  [SuggestionCard 2]             │
│  [SuggestionCard 3]             │
│                                 │
├─────────────────────────────────┤
│  [Editar]      [✨ Enviar]      │  Footer fixo
└─────────────────────────────────┘
```

### Animações

1. **Entrada**: slide up 300ms + backdrop blur
2. **Cards**: staggered (50ms delay cada)
3. **Seleção**: spring scale + haptic + glow
4. **Enviar**: squish + checkmark + partículas sutis
5. **Saída**: slide down ao chat

---

## 4. Elementos Mágicos de IA

### ThinkingIndicator

- 3 dots com wave animation (100ms delay)
- Gradiente aiPrimary → aiSecondary
- Glow pulsante (opacity 0.3 → 0.6)
- Texto opcional com typing effect

### AuroraGlow

- Borda com gradiente rotativo (360° em 3s)
- Cores: aiPrimary → aiCyan → aiSecondary
- Uso: mensagens IA, cards selecionados, badges

### ConfidenceBar

- Alta (80-100%): Verde + badge "Recomendado"
- Média (50-79%): Amarelo
- Baixa (<50%): Vermelho claro
- Animação: fill 500ms ease-out

### SendSuccess

- Botão: squish (0.9 → 1.1 → 1)
- Checkmark fade in
- 5-8 partículas saindo
- Haptic: notificationSuccess

---

## 5. Navegação

### Tab Bar

- Ativo: primary + scale(1.1) + label
- Inativo: textSecondary
- Tab IA: glow aiGlow permanente
- Transição: crossfade 200ms

### Transições

- Lista → Chat: push horizontal
- Chat → Sugestões: fullscreen slide up + blur
- Qualquer → Perfil: modal 60%

---

## 6. Arquivos a Criar

```
src/
├── design-system/
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.styles.ts
│   │   │   └── index.ts
│   │   ├── Card/
│   │   │   ├── SuggestionCard.tsx
│   │   │   └── index.ts
│   │   ├── Indicators/
│   │   │   ├── ThinkingIndicator.tsx
│   │   │   ├── ConfidenceBar.tsx
│   │   │   ├── AuroraGlow.tsx
│   │   │   └── index.ts
│   │   └── Modal/
│   │       ├── SuggestionsModal.tsx
│   │       └── index.ts
│   └── index.ts
```
