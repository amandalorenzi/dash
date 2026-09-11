# Importação de catálogo

Em **Catálogo → Importar planilha**, o fluxo tem 3 etapas e **nada é gravado
até a confirmação final**:

1. **Upload** — envie um arquivo `.xlsx` ou `.csv`. Baixe o template pelo botão
   "Baixar template" para garantir as colunas certas.
2. **Validação** — cada linha é validada (formato, tipos, código duplicado
   dentro da própria planilha). Linhas com erro impedem a confirmação.
3. **Preview e confirmação** — mostra quantos itens são novos, atualizados ou
   sem alteração, e o valor atual vs. o novo valor de cada item alterado. Só
   depois de clicar em "Aplicar alterações" os dados são gravados.

## Colunas da planilha

| Coluna                  | Obrigatória | Tipo    | Observação |
|---------------------------|:---:|---------|------------|
| `code`                       | sim | texto   | único por evento; vira maiúsculo automaticamente |
| `name`                         | sim | texto   | |
| `description`                    | não | texto   | |
| `category`                         | sim | texto   | deve bater com uma categoria existente |
| `price`                              | sim | número  | usa ponto decimal (ex.: `120.50`) |
| `billing_unit`                        | sim | texto   | um de: `UNIT`, `DAILY`, `HOURLY`, `METER`, `SQUARE_METER`, `POINT`, `PACKAGE`, `SERVICE` |
| `minimum_quantity`                      | não | número  | padrão 1 |
| `maximum_quantity`                        | não | número  | padrão 10 |
| `allows_quantity`                           | não | booleano | padrão verdadeiro |
| `requires_dash_approval`                      | não | booleano | padrão falso |
| `active`                                        | não | booleano | padrão verdadeiro |

## Como atualizar preços em massa

Baixe a planilha atual (ou gere uma nova a partir do template), altere a coluna
`price` das linhas desejadas mantendo o mesmo `code`, e importe novamente. O
sistema detecta que o `code` já existe e mostra "valor atual → novo valor" no
preview antes de aplicar.

## Como adicionar itens novos

Inclua uma linha com um `code` que ainda não existe no evento. Ela aparecerá
como "Novo" no preview.

## Como desativar itens

Duas formas: (a) inclua a linha na planilha com `active` = `false`/`FALSE`/`0`
e reimporte; ou (b) marque o item na tabela e use a ação em massa "Desativar".

## Como identificar erros

A etapa de validação lista, linha a linha, o motivo do erro (campo faltando,
tipo inválido, código duplicado na própria planilha). Corrija a planilha e
reenvie — nenhuma linha é aplicada parcialmente.

## Por que o preço de pedidos antigos não muda

Cada item de um pedido já feito guarda um **snapshot** do preço no momento da
contratação (`unitPriceSnapshot`). A importação só altera o **catálogo**
(preço "atual", usado em pedidos futuros) — nunca reescreve pedidos existentes.
Essa regra está coberta por teste automatizado em `tests/calculations.test.ts`.
