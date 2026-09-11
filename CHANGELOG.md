# Changelog

## v1.0.0 — Batch 1 + Batch 2 (Next.js + Firebase)

Primeira versão real do sistema (banco de dados de verdade, autenticação real),
substituindo o protótipo estático (MVP em HTML/CSS/JS puro) que serviu de base
visual e de validação de navegação.

### Adicionado
- Autenticação real via Firebase Auth (cookie de sessão httpOnly, verificado no servidor)
- Dashboard administrativo com dados reais do Firestore
- CRUD completo de expositores (renomeado de "fornecedor" em toda a interface)
- Catálogo de itens com importação real de planilha XLSX/CSV (upload → validação → preview → confirmação)
- Pedidos/extras com snapshot de preço e aprovação individual por item
- Pagamentos com controle de status
- Log de auditoria central
- **Portal do expositor (Batch 2)**: o próprio expositor edita seu cadastro,
  envia para análise, solicita extras, cadastra equipe, envia documentos,
  consulta prazos, resumo financeiro, manual do expositor e histórico
- Testes automatizados das regras financeiras críticas (Vitest)
- Regras de segurança do Firestore + índices compostos
- Script de seed idempotente
- Documentação completa (arquitetura, banco de dados, importação, setup não-técnico)

### Simplificações conscientes desta versão
Ver `docs/BATCH-01-DELIVERY.md`.

## v0.2.0 — MVP estático (HTML/CSS/JS)

Protótipo funcional sem backend, usado para validar navegação, login e
identidade visual antes da implementação real.

## v0.1.0 — Especificação inicial
Documento de requisitos da Batch 1 (Supabase/Postgres) recebido do time DASH.
