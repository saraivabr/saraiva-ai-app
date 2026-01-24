# Plano de Aprimoramento - Saraiva.AI

## Objetivo
Implementar todas as funcionalidades do WhatsApp usando a Evolution API para que o app tenha paridade completa com o WhatsApp oficial.

---

## Fase 1: Tipos de Mensagens (Backend + App)

### 1.1 Enviar Mídia
**Endpoint Evolution:** `POST /message/sendMedia/{instance}`

| Tipo | Status Atual | Prioridade |
|------|-------------|------------|
| Texto | ✅ Implementado | - |
| Imagem | ❌ Falta | Alta |
| Vídeo | ❌ Falta | Alta |
| Documento/PDF | ❌ Falta | Alta |
| Áudio/Voz | ❌ Falta (só recebe) | Alta |

**Tarefas:**
- [ ] Backend: Adicionar `enviar_imagem()` no WhatsAppService
- [ ] Backend: Adicionar `enviar_video()` no WhatsAppService
- [ ] Backend: Adicionar `enviar_documento()` no WhatsAppService
- [ ] Backend: Adicionar `enviar_audio()` no WhatsAppService
- [ ] Backend: Criar endpoints `/conversas/{jid}/enviar-midia`
- [ ] App: Botão de anexar (📎) com menu de opções
- [ ] App: Picker de imagem da galeria
- [ ] App: Picker de câmera
- [ ] App: Picker de documento
- [ ] App: Gravador de áudio com visualização de onda

### 1.2 Stickers
**Endpoint Evolution:** `POST /message/sendSticker/{instance}`

**Tarefas:**
- [ ] Backend: Adicionar `enviar_sticker()` no WhatsAppService
- [ ] App: Botão de sticker no teclado
- [ ] App: Grade de stickers salvos
- [ ] App: Busca de stickers

### 1.3 Localização
**Endpoint Evolution:** `POST /message/sendLocation/{instance}`

**Tarefas:**
- [ ] Backend: Adicionar `enviar_localizacao()` no WhatsAppService
- [ ] App: Botão de localização no menu de anexos
- [ ] App: Mapa para selecionar local
- [ ] App: Opção "Minha localização atual"

### 1.4 Contatos
**Endpoint Evolution:** `POST /message/sendContact/{instance}`

**Tarefas:**
- [ ] Backend: Adicionar `enviar_contato()` no WhatsAppService
- [ ] App: Picker de contatos do telefone
- [ ] App: Preview do contato antes de enviar

### 1.5 Enquetes/Polls
**Endpoint Evolution:** `POST /message/sendPoll/{instance}`

**Tarefas:**
- [ ] Backend: Adicionar `enviar_enquete()` no WhatsAppService
- [ ] App: Tela de criação de enquete
- [ ] App: Visualização de resultados

---

## Fase 2: Interações com Mensagens

### 2.1 Reações
**Endpoint Evolution:** `POST /message/sendReaction/{instance}`

**Tarefas:**
- [ ] Backend: Adicionar `reagir_mensagem()` no WhatsAppService
- [ ] App: Long press na mensagem → menu de reações
- [ ] App: Picker de emoji para reação
- [ ] App: Mostrar reações nas mensagens

### 2.2 Responder Mensagem (Reply)
**Parâmetro:** `quoted` no payload de envio

**Tarefas:**
- [ ] Backend: Adicionar parâmetro `quoted_message_id` nos métodos de envio
- [ ] App: Swipe para direita = responder
- [ ] App: Preview da mensagem sendo respondida
- [ ] App: Mostrar citação nas mensagens de resposta

### 2.3 Encaminhar Mensagem
**Tarefas:**
- [ ] Backend: Endpoint para encaminhar mensagem
- [ ] App: Long press → Encaminhar
- [ ] App: Picker de contato/conversa destino
- [ ] App: Indicador "Encaminhada" na mensagem

### 2.4 Deletar Mensagem
**Endpoint Evolution:** Verificar disponibilidade

**Tarefas:**
- [ ] Backend: Adicionar `deletar_mensagem()` se disponível
- [ ] App: Long press → Apagar para mim / Apagar para todos

### 2.5 Editar Mensagem
**Endpoint Evolution:** Verificar disponibilidade (recurso novo do WhatsApp)

**Tarefas:**
- [ ] Backend: Adicionar `editar_mensagem()` se disponível
- [ ] App: Long press → Editar
- [ ] App: Indicador "Editada" na mensagem

---

## Fase 3: Status/Stories

### 3.1 Ver Status
**Endpoint Evolution:** Verificar endpoints de status

**Tarefas:**
- [ ] Backend: Endpoint para listar status dos contatos
- [ ] App: Tab de Status funcional
- [ ] App: Visualizador de status em tela cheia
- [ ] App: Barra de progresso

### 3.2 Postar Status
**Endpoint Evolution:** `POST /message/sendStatus/{instance}`

**Tarefas:**
- [ ] Backend: Adicionar `postar_status()` no WhatsAppService
- [ ] App: Botão de criar status
- [ ] App: Opção texto, foto, vídeo

---

## Fase 4: Grupos

### 4.1 Gestão de Grupos
**Endpoints Evolution:** `/group/*`

**Tarefas:**
- [ ] Backend: Listar grupos
- [ ] Backend: Criar grupo
- [ ] Backend: Adicionar/remover participantes
- [ ] Backend: Promover/rebaixar admins
- [ ] Backend: Alterar foto/nome/descrição do grupo
- [ ] App: Lista de grupos separada ou filtro
- [ ] App: Tela de info do grupo
- [ ] App: Gestão de participantes

### 4.2 Configurações de Grupo
**Tarefas:**
- [ ] Backend: Alterar configurações (quem pode enviar, etc)
- [ ] App: Tela de configurações do grupo
- [ ] App: Silenciar grupo

---

## Fase 5: Funcionalidades Avançadas

### 5.1 Chamadas (se disponível na API)
**Tarefas:**
- [ ] Verificar se Evolution API suporta chamadas
- [ ] Se sim: implementar chamada de voz
- [ ] Se sim: implementar chamada de vídeo

### 5.2 Lista de Transmissão
**Tarefas:**
- [ ] Backend: Criar lista de transmissão
- [ ] Backend: Enviar para lista
- [ ] App: Gerenciar listas

### 5.3 Mensagens Temporárias
**Tarefas:**
- [ ] Backend: Ativar mensagens temporárias
- [ ] App: Indicador visual
- [ ] App: Configuração por conversa

### 5.4 Listas Interativas
**Endpoint Evolution:** `POST /message/sendList/{instance}`

**Tarefas:**
- [ ] Backend: Adicionar `enviar_lista()` no WhatsAppService
- [ ] App: Criador de lista interativa
- [ ] App: Visualização de lista recebida

---

## Fase 6: UX/UI Avançado

### 6.1 Melhorias na Conversa
- [ ] Indicador "digitando..."
- [ ] Indicador "gravando áudio..."
- [ ] Preview de link com imagem
- [ ] Bolhas de áudio com waveform real
- [ ] Player de vídeo inline
- [ ] Visualizador de imagem em tela cheia
- [ ] Galeria de mídia da conversa

### 6.2 Busca
- [ ] Busca global de conversas
- [ ] Busca dentro de uma conversa
- [ ] Filtro por tipo de mídia

### 6.3 Notificações
- [ ] Push notifications
- [ ] Badge de mensagens não lidas
- [ ] Som de notificação

### 6.4 Configurações
- [ ] Tela de configurações do app
- [ ] Perfil do usuário
- [ ] Privacidade
- [ ] Backup de conversas

---

## Cronograma Sugerido

| Fase | Descrição | Complexidade |
|------|-----------|--------------|
| 1 | Tipos de Mensagens | Alta |
| 2 | Interações | Média |
| 3 | Status | Média |
| 4 | Grupos | Alta |
| 5 | Avançado | Alta |
| 6 | UX/UI | Média |

---

## Próximos Passos Imediatos

1. **Implementar envio de mídia** (imagem, vídeo, áudio, documento)
2. **Implementar reações** (muito usado)
3. **Implementar resposta/reply** (essencial para contexto)
4. **Melhorar visualização** de mensagens recebidas (áudio player, imagens)

---

## Referências

- [Evolution API Docs](https://doc.evolution-api.com)
- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
