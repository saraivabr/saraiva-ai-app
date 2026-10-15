# Padrão de documentação Saraiva.AI

> Guia de manutenção do README deste projeto, inspirado na clareza visual de READMEs de produto e adaptado à identidade Saraiva.AI.

## Princípio

O README deve permitir que uma pessoa entenda **o valor**, **o funcionamento** e **como começar** sem interpretar o código. Uma pessoa técnica também deve conseguir identificar rapidamente arquitetura, dependências e limites.

A estrutura recomendada é:

1. **Identidade:** ícone, nome, promessa em uma frase e badges verificáveis.
2. **Vitrine visual:** uma capa SVG acessível e leve, sem recursos externos.
3. **Contexto honesto:** o que o repositório contém e o que depende de outros serviços.
4. **Demonstração:** fluxograma, captura real ou GIF real; imagens conceituais devem ser rotuladas.
5. **Recursos por problema:** o benefício ao usuário e o arquivo que sustenta a afirmação.
6. **Início rápido:** comandos conferidos no package.json e passos de configuração.
7. **Arquitetura:** diagrama com componentes existentes e dependências externas.
8. **Documentação:** links relativos funcionais e próximos passos.
9. **Estado do projeto:** o que está implementado, planejado ou ainda não validado.

## Linguagem e direção de arte

- PT-BR claro, curto e profissional. Não construir um catálogo de bibliotecas sem explicar a utilidade.
- Usar verde da Saraiva.AI, contrastes generosos, respiro, hierarquia visual e SVGs autocontidos.
- A documentação pode ter identidade editorial própria, sem alterar os tokens reais da interface.
- Usar um único hero e diagramas relevantes; evitar badges em excesso e animações pesadas.
- Em SVGs, manter title, desc e alt na referência Markdown/HTML. Evitar conteúdo sensível.
- Screenshots e GIFs devem representar uma execução real, com dados fictícios ou anonimizados. Nunca simular uma captura real sem aviso.
- Revisar legibilidade em GitHub claro e escuro; diagramas com fundo opaco são mais previsíveis.

## Regras factuais

- Consultar package.json, app.json e código antes de escrever requisitos ou comandos.
- Não prometer recursos que só aparecem em planos, TODOs ou interfaces TypeScript.
- Não dizer que IA, WhatsApp, backend ou WebSocket estão operacionais sem evidência de integração.
- Não exibir status de testes fictícios. Só inserir badges de CI se houver workflow real.
- Não declarar licença sem arquivo LICENSE.
- Nunca publicar tokens, endpoints privados, prints de clientes ou conversas reais.
- Separar: **implementado no frontend**, **requer backend** e **planejado**.

## Instrução curta para Claude Code e Codex

> Ao atualizar o README, primeiro inspecione a árvore do projeto, os scripts, as rotas e as dependências. Escreva a vitrine em PT-BR com foco no benefício real. Mantenha capa SVG, jornada visual, início rápido executável, diagrama fiel ao código, links úteis e limites explícitos. Não invente screenshots, licença, endpoints disponíveis, integrações ativas nem resultados de testes. Faça mudanças preferencialmente em branch/PR; não altere lógica de aplicação por motivos de documentação.

## Checklist de revisão

- [ ] O título, a promessa e a primeira imagem identificam imediatamente o produto?
- [ ] Os diagramas ajudam a entender sem substituir fatos técnicos?
- [ ] Os comandos conferem com scripts/dependências atuais?
- [ ] Os links e caminhos de assets existem?
- [ ] Recursos, limitações e funcionalidades em planejamento estão distinguidos?
- [ ] Qualquer captura ou GIF é real e não revela informações sensíveis?
- [ ] Não há métricas, garantias, licenças ou testes inventados?
