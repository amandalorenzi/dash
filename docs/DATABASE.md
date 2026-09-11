# Banco de dados (Firestore)

Todas as coleções são top-level (não usam subcoleções), e a maioria carrega um
`eventId` para isolar dados entre eventos. Tipos completos em `src/types/domain.ts`.

## `events`
Um documento por evento. Campos: `name`, `local`, `dataInicio`, `dataFim`.

## `categories`
Categorias de item de catálogo, administráveis (não hardcoded na UI).
Campos: `eventId`, `name`.

## `profiles`
Um documento por usuário do Firebase Authentication, com **o mesmo ID do `uid`**.
Define a `role` (`SUPER_ADMIN` | `PRODUCAO` | `FINANCEIRO` | `OPERACIONAL` | `EXPOSITOR`
— só `SUPER_ADMIN` e `EXPOSITOR` estão realmente implementados nesta versão) e,
para expositores, o `supplierId` vinculado.

## `suppliers` (Expositores)
Entidade central. Campos principais: `eventId`, `codigo`, `razaoSocial`,
`nomeFantasia`, `cnpj`, `endereco`, `responsavel`, `standNumero`, `categoria`,
os quatro grupos de status (`statusGeral`, `statusCadastral`, `statusDash`,
`statusFinanceiro`), e os campos de verificação/validação (`verifiedAt`,
`verifiedBy`, `validatedAt`, `validatedBy`). `authUid` vincula o registro ao
usuário do portal quando existe.

## `catalogItems`
Itens extras contratáveis. Campos: `eventId`, `code` (único por evento), `name`,
`category`, `price`, `billingUnit`, `minQty`/`maxQty`, `requiresApproval`, `active`.
**O preço aqui é sempre o valor atual** — nunca o valor de um pedido já feito.

## `orders` + itens embutidos
Um pedido por expositor (reaproveitado enquanto estiver `DRAFT`/`SUBMITTED`/
`UNDER_REVIEW`). Os itens (`OrderItem[]`) ficam **embutidos no próprio documento**
(não é subcoleção) e cada item guarda um **snapshot** de código, nome, unidade e
preço no momento da contratação — nunca lê o preço "ao vivo" do catálogo depois.

## `payments`
Um documento por pagamento. Campos: `eventId`, `supplierId`, `orderId` (opcional),
`amount`, `status`, `paymentMethod`, `reference`, `paidAt`, `verifiedAt/By`.

## `teamMembers` (Batch 2)
Integrantes de equipe credenciados por um expositor. Campos: `eventId`,
`supplierId`, `nome`, `cargo`, `tipoCredencial`.

## `documents` (Batch 2)
Metadados de documentos enviados pelo expositor. Campos: `eventId`, `supplierId`,
`nome`, `tipo`, `status` (`PENDING_REVIEW`/`APPROVED`/`REJECTED`). **Nesta versão
apenas o nome do arquivo é registrado** — o upload do binário para o Firebase
Storage é um próximo passo (ver `docs/BATCH-01-DELIVERY.md`); o modelo de dados
já está pronto para receber um campo `storagePath` sem quebrar nada.

## `deadlines` (Batch 2)
Prazos do evento, visíveis para todos os expositores. Campos: `eventId`,
`titulo`, `descricao`, `dataLimite`.

## `auditLogs`
Log central de auditoria. Campos: `eventId`, `userName`, `entityType`,
`entityId`, `entityLabel`, `action`, `details`, `createdAt`. Toda Server Action
relevante grava aqui — ver `src/modules/audit/log.ts`.

## `catalogImports`
Um registro por importação de planilha aplicada, com os totais
(`recordsCreated`, `recordsUpdated`, `recordsUnchanged`, `recordsFailed`).

## Índices compostos

Ver `firestore.indexes.json`. As queries que filtram por `eventId` e ordenam por
outro campo (ex.: `suppliers` por `eventId` + `createdAt`) exigem um índice
composto — já declarados no arquivo e publicáveis via `firebase deploy --only firestore`.

## Regras de segurança

Ver `firestore.rules`. Resumo: leitura/escrita de dados de negócio passa pelo
Admin SDK no servidor (que ignora as rules por definição); as rules são a
segunda camada de defesa, garantindo que mesmo um acesso direto ao Firestore
feito fora do fluxo do app só deixe um expositor ler os próprios dados, nunca
escrever diretamente nem ler dados de outro expositor.
