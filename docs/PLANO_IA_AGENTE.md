# Plano de Aprimoramento - IA Agente

## Problema Atual

A IA do app é um chatbot passivo que:
- ❌ Só responde perguntas
- ❌ Não entende comandos/intenções
- ❌ Não executa ações
- ❌ Não busca contatos
- ❌ Não sabe enviar mensagens

**Exemplo do problema:**
> Usuário: "Manda uma mensagem pro Orcioli"
> IA: "Não sei fazer isso..." ❌

---

## Solução: IA Agente com Ferramentas

Transformar a IA em um **Agente** que:
- ✅ Entende intenções do usuário
- ✅ Executa ações usando ferramentas
- ✅ Busca contatos pelo nome
- ✅ Envia mensagens
- ✅ Lê conversas
- ✅ Agenda lembretes

---

## Arquitetura Proposta

```
Usuário → IA Agente → [Decide ação] → Ferramentas → Executa
                ↓
        [Responde com resultado]
```

### Ferramentas (Tools) do Agente

| Ferramenta | Descrição | Exemplo de uso |
|------------|-----------|----------------|
| `buscar_contato` | Busca contato pelo nome | "Orcioli" → encontra JID |
| `enviar_mensagem` | Envia mensagem para contato | "Olá!" para 5511...@s.whatsapp.net |
| `ler_conversa` | Lê últimas mensagens de uma conversa | Ver chat com João |
| `listar_conversas` | Lista todas as conversas | Ver quem mandou msg |
| `buscar_mensagens` | Busca texto em todas as conversas | "quem falou sobre reunião?" |
| `criar_lembrete` | Cria lembrete para depois | "Lembrar de ligar pro cliente" |
| `marcar_tarefa` | Marca tarefa como feita/pendente | Gerenciar tarefas |
| `resumir_conversa` | Gera resumo de uma conversa | "Resume minha conversa com Maria" |
| `sugerir_resposta` | Sugere resposta para conversa | "O que responder pro João?" |

---

## Implementação

### Fase 1: Backend - Criar Sistema de Ferramentas

#### 1.1 Criar `app/services/agente.py`

```python
from typing import List, Dict, Any
import google.generativeai as genai
from app.services.whatsapp import whatsapp_service
from app.database.connection import get_db

class IAAgente:
    """IA Agente que pode executar ações"""

    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.tools = {
            "buscar_contato": self.buscar_contato,
            "enviar_mensagem": self.enviar_mensagem,
            "ler_conversa": self.ler_conversa,
            "listar_conversas": self.listar_conversas,
            "buscar_mensagens": self.buscar_mensagens,
        }

    async def processar(self, pergunta: str, db) -> dict:
        """Processa pergunta e decide se precisa executar ações"""

        # 1. Analisa a intenção
        intencao = await self.analisar_intencao(pergunta)

        # 2. Se for ação, executa a ferramenta
        if intencao["tipo"] == "acao":
            resultado = await self.executar_ferramenta(
                intencao["ferramenta"],
                intencao["parametros"],
                db
            )
            return {
                "tipo": "acao_executada",
                "ferramenta": intencao["ferramenta"],
                "resultado": resultado,
                "resposta": await self.formatar_resposta(resultado, intencao)
            }

        # 3. Se for pergunta, responde normalmente
        return {
            "tipo": "resposta",
            "resposta": await self.responder_pergunta(pergunta, db)
        }

    async def analisar_intencao(self, pergunta: str) -> dict:
        """Usa IA para entender a intenção"""

        prompt = f"""Analise esta mensagem do usuário e identifique a intenção.

MENSAGEM: "{pergunta}"

FERRAMENTAS DISPONÍVEIS:
- buscar_contato(nome): Busca um contato pelo nome
- enviar_mensagem(contato, texto): Envia mensagem para alguém
- ler_conversa(contato): Lê mensagens de uma conversa
- listar_conversas(): Lista todas as conversas
- buscar_mensagens(termo): Busca texto em mensagens

RESPONDA EM JSON:
{{
    "tipo": "acao" | "pergunta",
    "ferramenta": "nome_da_ferramenta" ou null,
    "parametros": {{"param": "valor"}} ou null,
    "explicacao": "por que escolheu isso"
}}

EXEMPLOS:
- "Manda oi pro João" → acao, enviar_mensagem, {{"contato": "João", "texto": "oi"}}
- "O que o Pedro disse?" → acao, ler_conversa, {{"contato": "Pedro"}}
- "Quem falou de reunião?" → acao, buscar_mensagens, {{"termo": "reunião"}}
- "Como você funciona?" → pergunta, null, null

Responda APENAS o JSON:"""

        response = self.model.generate_content(prompt)
        # Parse JSON...
        return {"tipo": "pergunta", "ferramenta": None, "parametros": None}

    async def buscar_contato(self, nome: str, db) -> dict:
        """Busca contato pelo nome (fuzzy search)"""
        from app.database.models import Contato
        from sqlalchemy import func

        # Busca case-insensitive
        contatos = db.query(Contato).filter(
            func.lower(Contato.nome).contains(nome.lower())
        ).all()

        if not contatos:
            return {"encontrado": False, "sugestoes": []}

        return {
            "encontrado": True,
            "contatos": [{"jid": c.jid, "nome": c.nome} for c in contatos]
        }

    async def enviar_mensagem(self, contato: str, texto: str, db) -> dict:
        """Busca contato e envia mensagem"""

        # 1. Busca o contato
        resultado = await self.buscar_contato(contato, db)

        if not resultado["encontrado"]:
            return {"sucesso": False, "erro": f"Contato '{contato}' não encontrado"}

        if len(resultado["contatos"]) > 1:
            return {
                "sucesso": False,
                "erro": "Múltiplos contatos encontrados",
                "opcoes": resultado["contatos"]
            }

        # 2. Envia a mensagem
        jid = resultado["contatos"][0]["jid"]
        await whatsapp_service.enviar_mensagem(jid, texto)

        return {
            "sucesso": True,
            "contato": resultado["contatos"][0]["nome"],
            "mensagem": texto
        }
```

#### 1.2 Atualizar endpoint `/ia/chat`

```python
@router.post("/ia/chat")
async def ia_chat(request: IAChatRequest, db: Session = Depends(get_db)):
    """Chat com IA Agente que pode executar ações"""

    from app.services.agente import ia_agente

    resultado = await ia_agente.processar(request.pergunta, db)

    return {
        "tipo": resultado["tipo"],
        "resposta": resultado["resposta"],
        "acao_executada": resultado.get("ferramenta"),
        "detalhes": resultado.get("resultado")
    }
```

---

### Fase 2: Melhorar Busca de Contatos

#### 2.1 Busca Fuzzy (aproximada)

```python
from difflib import SequenceMatcher

def buscar_contato_fuzzy(nome_busca: str, contatos: list) -> list:
    """Busca contatos com nome parecido"""

    resultados = []
    for contato in contatos:
        # Similaridade do nome
        ratio = SequenceMatcher(
            None,
            nome_busca.lower(),
            contato.nome.lower()
        ).ratio()

        if ratio > 0.5:  # 50% de similaridade
            resultados.append((contato, ratio))

    # Ordena por similaridade
    resultados.sort(key=lambda x: x[1], reverse=True)
    return [r[0] for r in resultados[:5]]
```

#### 2.2 Busca por apelido/variação

```python
APELIDOS = {
    "ze": ["josé", "zé"],
    "bia": ["beatriz"],
    "dudu": ["eduardo"],
    "rafa": ["rafael", "rafaela"],
    # ... etc
}

def expandir_nome(nome: str) -> list:
    """Expande apelidos para nomes completos"""
    nome_lower = nome.lower()
    expandidos = [nome]

    for apelido, nomes in APELIDOS.items():
        if apelido in nome_lower:
            expandidos.extend(nomes)

    return expandidos
```

---

### Fase 3: Fluxo de Confirmação

Quando a IA não tem certeza, ela pede confirmação:

```
Usuário: "Manda oi pro João"

IA: "Encontrei 3 contatos com 'João':
    1. João Silva (trabalho)
    2. João Pedro (família)
    3. João Vitor (pessoal)

    Para qual devo enviar?"

Usuário: "O primeiro"

IA: "Mensagem enviada para João Silva! ✓"
```

---

### Fase 4: Memória de Contexto

A IA lembra do contexto da conversa:

```python
class IAAgente:
    def __init__(self):
        self.contexto_conversa = []  # Últimas mensagens

    async def processar(self, pergunta: str, db):
        # Adiciona ao contexto
        self.contexto_conversa.append({"role": "user", "content": pergunta})

        # Processa com contexto completo
        resultado = await self._processar_com_contexto(pergunta, db)

        # Salva resposta no contexto
        self.contexto_conversa.append({"role": "assistant", "content": resultado})

        # Mantém apenas últimas 10 mensagens
        self.contexto_conversa = self.contexto_conversa[-10:]

        return resultado
```

---

### Fase 5: Ações Disponíveis (Completo)

| Categoria | Ação | Exemplo de comando |
|-----------|------|-------------------|
| **Mensagens** | Enviar texto | "Manda oi pro João" |
| | Enviar áudio | "Manda um áudio pro Pedro" |
| | Enviar imagem | "Manda essa foto pra Maria" |
| | Responder | "Responde o João com ok" |
| **Leitura** | Ver conversa | "O que o Pedro me mandou?" |
| | Buscar texto | "Quem falou de reunião?" |
| | Resumir | "Resume minha conversa com João" |
| | Ver não lidas | "Quem eu não respondi?" |
| **Análise** | Sentimento | "Como tá o clima com o cliente?" |
| | Prioridades | "Quais mensagens são urgentes?" |
| | Tarefas | "Quais tarefas pendentes?" |
| **Gestão** | Categorizar | "Marca João como trabalho" |
| | VIP | "João é VIP" |
| | Lembrete | "Me lembra de ligar pro João amanhã" |

---

## Cronograma

| Fase | Descrição | Prioridade |
|------|-----------|------------|
| 1 | Sistema base de ferramentas | Alta |
| 2 | Busca fuzzy de contatos | Alta |
| 3 | Enviar mensagem por nome | Alta |
| 4 | Fluxo de confirmação | Média |
| 5 | Memória de contexto | Média |
| 6 | Mais ações (áudio, imagem) | Baixa |

---

## Próximos Passos Imediatos

1. **Criar `app/services/agente.py`** com sistema de ferramentas
2. **Implementar `buscar_contato`** com fuzzy search
3. **Implementar `enviar_mensagem`** que busca e envia
4. **Atualizar endpoint** `/ia/chat` para usar o agente
5. **Testar** com comandos como "manda oi pro Orcioli"

---

## Exemplo de Uso Final

```
Usuário: "Manda pro Orcioli que vou chegar atrasado"

IA: [Analisa: ação de enviar mensagem]
    [Busca: "Orcioli" → encontra contato]
    [Envia: "vou chegar atrasado"]

    "Mensagem enviada para Orcioli! ✓

     📤 'vou chegar atrasado'"
```

```
Usuário: "O que o Pedro me mandou hoje?"

IA: [Analisa: ação de ler conversa]
    [Busca: "Pedro" → encontra contato]
    [Lê: últimas mensagens de hoje]

    "Pedro te mandou 3 mensagens hoje:

     10:30 - 'E aí, beleza?'
     11:15 - 'Vamos almoçar?'
     14:22 - 'Tô na porta'"
```
