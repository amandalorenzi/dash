# Arquitetura

## Fluxo de dados

```
UI (Server/Client Component)
        ↓
Server Action (src/modules/<domain>/actions.ts)   — valida com Zod, checa a sessão/role
        ↓
Firebase Admin SDK (src/lib/firebase/admin.ts)
        ↓
Firestore
```

Leituras de página (Server Components) usam as funções em `queries.ts` de cada
módulo, que também passam pelo Admin SDK. O navegador **nunca** lê ou grava no
Firestore diretamente para dados de negócio — só o SDK cliente do Firebase Auth
é usado no navegador (login).

## Autenticação e autorização

1. O usuário faz login no cliente com `signInWithEmailAndPassword` (Firebase Auth).
2. O idToken resultante é enviado para `/api/auth/session`, que o valida com o
   Admin SDK e cria um **cookie de sessão httpOnly** (o navegador não tem acesso
   a ele via JavaScript).
3. Cada página protegida (`/admin/*`, `/portal/*`) roda no servidor
   `getCurrentUser()` (em `src/lib/auth/session.ts`), que valida o cookie e busca
   o perfil (`role`) do usuário na coleção `profiles`.
4. O middleware de borda (`src/middleware.ts`) só faz uma checagem rápida de
   presença do cookie, por UX — a autorização de verdade acontece sempre no
   servidor, nunca só no cliente.
5. As Server Actions repetem essa checagem individualmente (`requireRole(...)`
   ou `getCurrentUser()`), então mesmo uma chamada direta e maliciosa a uma
   action é barrada.

## Multi-evento

Toda entidade relevante (`suppliers`, `catalogItems`, `orders`, `payments`,
`teamMembers`, `documents`, `deadlines`, `auditLogs`) carrega um `eventId`. O
"evento atual" do admin fica em um cookie (`dash_current_event`, ver
`src/lib/event-context.ts`) e pode ser trocado pelo seletor no topo do painel.

## Modularidade

Cada pasta em `src/modules/<dominio>` concentra:
- `schemas.ts` — validação Zod (única fonte de verdade sobre o formato dos dados)
- `queries.ts` — leituras (Server Components)
- `actions.ts` — escritas (Server Actions, sempre validadas e auditadas)

Uma mudança pedida em um domínio (ex.: "adicione um campo no catálogo") fica
contida no módulo correspondente. O cálculo financeiro vive isolado em
`src/modules/orders/calculations.ts`, testado separadamente — nenhuma tela
reimplementa essa lógica.

## Modelo financeiro (resumo)

- Cada item de pedido guarda um **snapshot** do preço no momento da contratação
  (`unitPriceSnapshot`). Uma alteração posterior no catálogo nunca altera pedidos
  já feitos.
- `calculateSupplierBalance()` é a única função que calcula solicitado/aprovado/
  pago/saldo pendente — ver `tests/calculations.test.ts` para as regras cobertas.

## Auditoria

Toda escrita relevante (criação/edição de expositor, mudança de status,
alteração de preço, importação, pagamento) passa por `addAuditLog()`
(`src/modules/audit/log.ts`), gravando quem fez o quê e quando na coleção
`auditLogs`.

## Por que Firestore em vez de um banco relacional com migrations em SQL

O prompt original pedia Postgres/Supabase com migrations SQL versionadas; esta
versão usa Firebase/Firestore por pedido explícito do time. Firestore não tem
"migrations" no sentido SQL — o equivalente adotado aqui é:
- `firestore.rules` e `firestore.indexes.json`, versionados e publicados via
  `firebase deploy`, cumprindo o mesmo papel de "schema declarado em arquivo"
  que as migrations cumpririam;
- os `types/domain.ts` + schemas Zod funcionam como o "schema" de fato, aplicado
  em tempo de escrita (nunca em tempo de leitura, como seria num banco relacional
  com constraints) — por isso a validação Zod em toda Server Action é obrigatória
  e não apenas uma boa prática.
