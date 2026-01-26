# Plano de Implementação - Design System Saraiva.AI

## Fase 1: Tokens do Design System
**Objetivo:** Criar base de tokens reutilizáveis

### 1.1 Criar estrutura de pastas
```bash
mkdir -p src/design-system/tokens
mkdir -p src/design-system/components
mkdir -p src/design-system/hooks
```

### 1.2 Tokens de cores (`tokens/colors.ts`)
- Cores core (WhatsApp)
- Cores AI Magic
- Cores de superfície
- Cores de texto
- Cores de status

### 1.3 Tokens de tipografia (`tokens/typography.ts`)
- Heading XL, LG, MD
- Body, BodySmall
- Caption, CaptionSmall

### 1.4 Tokens de spacing e radius (`tokens/spacing.ts`)
- Scale de espaçamento
- Border radius
- Shadows (incluindo magic)

### 1.5 Índice de exportação (`tokens/index.ts`)

---

## Fase 2: Componentes Base
**Objetivo:** Criar componentes atômicos reutilizáveis

### 2.1 Button Component
- PrimaryButton com gradiente
- SecondaryButton com borda
- GhostButton transparente
- Animação de press (scale + haptic)

### 2.2 SuggestionCard Component
- Layout: ícone + título + descrição + preview
- Estado: normal, selected, disabled
- ConfidenceBar integrada
- Animação: glow pulsante quando selecionado

### 2.3 ThinkingIndicator Component
- 3 dots com wave animation
- Gradiente AI
- Glow pulsante
- Texto opcional com typing

### 2.4 ConfidenceBar Component
- Barra de progresso animada
- Cores por nível (verde/amarelo/vermelho)
- Badge "Recomendado" para alta confiança

### 2.5 AuroraGlow Component
- Wrapper que adiciona borda gradiente rotativa
- Animação contínua 3s
- Customizável (cores, velocidade)

---

## Fase 3: Modal de Sugestões (Fullscreen)
**Objetivo:** Resolver o problema atual do modal bugado

### 3.1 Criar SuggestionsScreen
- Nova tela fullscreen (não modal)
- Navegação: Chat → SuggestionsScreen
- Header com blur e botão voltar

### 3.2 Layout da tela
- Header fixo com título
- ScrollView com cards de sugestão
- Footer fixo com botões Editar/Enviar

### 3.3 Animações de entrada
- Slide up da tela (300ms)
- Staggered animation dos cards (50ms cada)
- Backdrop blur no header

### 3.4 Interações
- Tap para selecionar card
- Spring animation + haptic
- Preview da mensagem expandido

### 3.5 Ação de envio
- Botão com squish animation
- Checkmark + partículas
- Haptic success
- Voltar ao chat automaticamente

### 3.6 Botão Editar
- Abre TextInput com a mensagem
- Permite customização antes de enviar

---

## Fase 4: Integração nas Telas
**Objetivo:** Aplicar Design System em todo o app

### 4.1 Atualizar ChatScreen
- Usar novos tokens de cor
- Substituir modal por navegação para SuggestionsScreen
- Atualizar MessageBubble para usar AuroraGlow em msgs IA

### 4.2 Atualizar ConversasScreen
- Aplicar novos tokens
- Melhorar visual de items com agente ativo

### 4.3 Atualizar Tab Navigator
- Implementar glow no tab IA
- Transições crossfade

### 4.4 Atualizar IAScreen
- Usar ThinkingIndicator
- Aplicar tokens

---

## Fase 5: Polish e Testes
**Objetivo:** Garantir qualidade

### 5.1 Revisar todas as animações
- Verificar 60fps
- Ajustar durações se necessário

### 5.2 Testar em device físico
- Build APK
- Testar fluxo completo
- Verificar haptics

### 5.3 Ajustes finais
- Cores, espaçamentos
- Edge cases

---

## Ordem de Execução

1. **Fase 1** - Tokens (~30 min código)
2. **Fase 2** - Componentes (~1h código)
3. **Fase 3** - Modal/Screen (~1h código)
4. **Fase 4** - Integração (~45 min código)
5. **Fase 5** - Polish (~30 min)

---

## Dependências

- `expo-haptics` (já instalado)
- `expo-blur` (já instalado)
- `expo-linear-gradient` (verificar/instalar)
- `react-native-reanimated` (para animações performáticas - opcional)
