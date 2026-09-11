# DASH | Supplier Management

Aplicação de gestão de **expositores** (fornecedores/expositores de eventos), catálogo
de itens extras, solicitações, validações e pagamentos — organizada por evento.

Stack: **Next.js 14 (App Router) + TypeScript + Firebase (Auth + Firestore) + Vercel**.

> Esta é a versão "completa" (Batch 1 + Batch 2), construída sobre a base validada
> no protótipo estático (MVP). Veja `docs/BATCH-01-DELIVERY.md` para o que está
> implementado, o que é uma simplificação consciente e o que fica para depois.

## Stack técnica

- Next.js 14, App Router, TypeScript, React 18
- Firebase Authentication (login) + Firestore (banco de dados)
- Server Actions + Zod para toda escrita de dados (nunca confia no cliente)
- Vitest para os testes das regras financeiras críticas
- Deploy: Vercel (app) + Firebase (banco, auth, regras de segurança)

## Estrutura de pastas

```
src/
  app/                  rotas (App Router): /login, /admin/*, /portal, /api/*
  components/
    layout/               AppShell, topbar, sidebar
    ui/                   Badge, Drawer, Toast — componentes genéricos
    admin/                telas do admin (client components)
    portal/                tela do portal do expositor
  modules/                um módulo por domínio de negócio
    suppliers/              expositores: schema, queries, actions
    catalog/                 catálogo de itens + importação
    orders/                    pedidos/extras + cálculo financeiro
    payments/                    pagamentos
    team/                          equipe do expositor
    documents/                      documentos do expositor
    deadlines/                        prazos do evento
    events/                              eventos
    categories/                            categorias administráveis
    audit/                                   log de auditoria central
  lib/
    firebase/               client.ts (SDK do navegador) e admin.ts (SDK do servidor)
    auth/                     verificação de sessão / role no servidor
    event-context.ts           evento "atual" (cookie)
  types/domain.ts          tipos centrais do domínio
  config/                   labels em PT-BR e nomes de coleções centralizados
scripts/seed.ts           popula o Firestore com dados de demonstração
firestore.rules           regras de segurança do Firestore
firestore.indexes.json    índices compostos necessários
tests/                    testes das regras financeiras críticas
docs/                     documentação (ver abaixo)
```

Cada módulo concentra schema (Zod), queries (leitura) e actions (escrita) do seu
domínio. Se amanhã você pedir "altere só o módulo de pagamentos", a mudança fica
contida em `src/modules/payments/` — não precisa tocar em expositores, catálogo
ou autenticação.

## Rodando localmente

Pré-requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env
# preencha o .env com as credenciais do seu projeto Firebase (ver docs/SETUP-PASSO-A-PASSO.md)
npm run seed     # popula o Firestore com evento/expositores/catálogo de demonstração
npm run dev      # http://localhost:3000
```

## Scripts

| Script            | O que faz |
|--------------------|-----------|
| `npm run dev`        | ambiente de desenvolvimento |
| `npm run build`        | build de produção |
| `npm run start`          | roda o build de produção localmente |
| `npm run lint`            | ESLint |
| `npm run typecheck`        | checagem de tipos TypeScript |
| `npm run test`               | roda os testes (Vitest) |
| `npm run seed`                 | popula o Firestore com dados de demonstração |
| `npm run validate`               | lint + typecheck + test + build, nessa ordem |

## Deploy

Veja o passo a passo completo, escrito para quem não é programador, em
`docs/SETUP-PASSO-A-PASSO.md`. Resumo técnico:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com), ative
   **Authentication (e-mail/senha)** e **Firestore**.
2. Publique as regras e índices: `firebase deploy --only firestore` (requer `firebase-tools`).
3. Rode `npm run seed` localmente para criar os dados de demonstração e os dois
   usuários iniciais (admin e expositor).
4. Suba o projeto para o GitHub.
5. Importe o repositório na [Vercel](https://vercel.com), configure as variáveis
   de ambiente do `.env.example` e faça o deploy.

## Login

Não há login de demonstração embutido no código — os usuários vêm do seu próprio
Firebase Authentication. Depois de rodar `npm run seed`, use:

| Perfil     | E-mail                          | Senha            |
|------------|-----------------------------------|-------------------|
| Admin DASH | admin@dasheventos.com.br           | TrocarSenha123!    |
| Expositor  | contato@acmetecnologia.com.br        | TrocarSenha123!      |

**Troque essas senhas no Firebase Authentication antes de qualquer uso real.**

## Documentação

- `docs/SETUP-PASSO-A-PASSO.md` — guia não-técnico, passo a passo, com Firebase e Vercel
- `docs/ARCHITECTURE.md` — arquitetura, fluxo de dados, decisões técnicas
- `docs/DATABASE.md` — coleções do Firestore, campos e relacionamentos
- `docs/IMPORTACAO.md` — formato da planilha de importação do catálogo
- `docs/BATCH-01-DELIVERY.md` — o que foi entregue, simplificações conscientes e próximos passos
- `CHANGELOG.md` — histórico de versões
