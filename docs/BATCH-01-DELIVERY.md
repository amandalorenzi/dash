# Relatório de entrega — v1.0.0

## Como ler este documento

Este projeto partiu de uma especificação de ~67 seções (Batch 1 completa +
visão de Batch 2). Esta entrega implementa **de verdade e testado** o núcleo
de ambas as batches. Onde alguma coisa foi simplificada em relação à spec
original, está listado explicitamente abaixo — a ideia é não fingir 100% de
cobertura quando não é o caso.

## Mudanças de escopo pedidas ao longo da conversa (e aplicadas)

- Banco de dados: **Firebase/Firestore** no lugar de Supabase/PostgreSQL (pedido explícito).
- Terminologia: **"Fornecedor" → "Expositor"** em toda a interface, rotas e nomes de tela.
- Autoatendimento: o **próprio expositor** edita seus dados cadastrais pelo portal
  (não só o admin), com envio formal para análise da DASH.
- Batch 2 (portal do expositor) implementada junto com a Batch 1, não depois.

## O que está implementado e funcional

- **Autenticação real**: Firebase Auth + cookie de sessão httpOnly verificado no
  servidor em toda página e toda Server Action (nunca confia só no frontend).
- **Dashboard**, **Expositores** (CRUD, busca, filtros, soft delete/reativação),
  **Catálogo** (CRUD, ações em massa, importação real de XLSX/CSV com preview
  de diff antes de aplicar), **Detalhe do expositor** com abas (Visão geral,
  Cadastro, Extras, Equipe, Documentos, Pagamentos, Histórico).
- **Portal do expositor**: Visão geral, Cadastro editável + botão "enviar para
  análise", Extras (solicitação), Equipe (adicionar/remover), Documentos
  (metadados), Financeiro (resumo), Prazos, Manual do expositor (estático),
  Histórico.
- **Snapshot de preço**: garantido no modelo de dados e coberto por teste automatizado.
- **Cálculo financeiro centralizado** (`calculateSupplierBalance`), testado
  (8 testes, incluindo arredondamento, saldo nunca negativo e a regra de snapshot).
- **Auditoria**: toda ação relevante grava em `auditLogs` com usuário, ação e detalhes.
- **Regras de segurança do Firestore** + índices compostos, versionados em arquivo.
- **`npm run build`, `npm run typecheck` e `npm run test` rodam limpos** — validado
  neste ambiente antes da entrega (não é uma promessa não verificada).

## Simplificações conscientes (não implementado com profundidade total)

- **Upload de documentos**: só o *nome* do arquivo é gravado no Firestore; o
  binário ainda não vai para o Firebase Storage. O modelo de dados já está
  pronto para receber isso (`SupplierDocument` aceita um `storagePath` futuro)
  sem precisar de migração.
- **Papéis (roles)**: só `SUPER_ADMIN` e `EXPOSITOR` estão realmente
  implementados e testados. `PRODUCAO`, `FINANCEIRO` e `OPERACIONAL` existem no
  tipo `Role` e nas regras do Firestore, mas nenhuma tela distingue
  permissões entre eles ainda — hoje se comportam como acesso negado (só
  SUPER_ADMIN entra no admin).
- **Troca de evento**: funciona (cookie por admin), mas o "evento atual" não é
  por-usuário persistido no perfil — é por navegador/sessão.
- **Manual do expositor**: conteúdo estático de exemplo, não editável pelo
  admin nem com upload de PDF.
- **Testes automatizados**: cobrem a regra financeira central (a mais crítica,
  por pedido explícito da spec). Não há testes de UI/integração ponta a ponta
  nem cobertura dos outros módulos (catálogo, importação, auditoria) — a spec
  pede priorizar regras que gerem prejuízo financeiro ou inconsistência, e foi
  isso que recebeu testes.
- **CI**: não há pipeline de CI configurado (ex.: GitHub Actions rodando
  `npm run validate` a cada push) — os comandos existem e passam localmente,
  mas a automação de rodar isso a cada commit não foi montada.

## O que fica para depois (fora do escopo desta entrega)

- Upload real de arquivos (Firebase Storage) para documentos e manual do expositor.
- Papéis PRODUCAO / FINANCEIRO / OPERACIONAL com telas e permissões próprias.
- Notificações (e-mail/WhatsApp) quando um status muda.
- Testes de integração ponta a ponta (Playwright/Cypress).
- Internacionalização (a interface é só PT-BR, como pedido).

## Como verificar você mesmo

```bash
npm install
npm run validate   # lint + typecheck + test + build — deve terminar sem erro
```
