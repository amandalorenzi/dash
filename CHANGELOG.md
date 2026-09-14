# Changelog

## v1.1.0 — Configuração pela interface, eventos, usuários e updates

Rodada focada no feedback de produção: nada mais depende de rodar script local.

### Correções a partir do uso real
- `firebase-admin` **fixado em 13.10.0** — a 14.x quebrava a criação do cookie de sessão.
- **Nenhuma consulta usa mais `where` + `orderBy` combinados**: a ordenação passou a
  ser feita em memória no servidor, eliminando a necessidade de criar índices
  compostos manualmente no console do Firebase (causa dos erros em eventos,
  expositores e categorias). `firestore.indexes.json` agora está vazio de propósito.
- **Script de seed removido.** Todo o setup inicial é feito pela interface:
  - `/setup` cria o primeiro administrador (a tela se desativa após o primeiro uso);
  - criar um evento já cria as categorias iniciais automaticamente.

### Adicionado
- **Eventos**: tela de criação/edição, seletor no topo, e configuração completa
  (nome, datas, endereço, prazo final para pedidos, manual do expositor e
  documentos compartilhados por link).
- **Usuários e permissões**: criação de usuários da equipe DASH com papel
  (SUPER_ADMIN, PRODUCAO, FINANCEIRO, OPERACIONAL), troca de papel, geração de
  nova senha e remoção. Só SUPER_ADMIN acessa.
- **Categorias**: tela para gerenciar categorias de expositor e de item separadamente.
- **Updates do evento**: mural estilo feed — a equipe publica avisos no dashboard e
  os expositores leem na aba "Updates do evento" do portal.
- **Senha temporária**: ao criar expositor ou usuário, o sistema gera uma senha forte,
  mostra **uma única vez**, marca `mustChangePassword: true` e força a troca no
  primeiro acesso (`/change-password`). Botão "Gerar nova senha temporária" no admin.
  Nada é enviado por e-mail/servidor.
- **Prazo de pedidos**: quando o evento tem prazo definido, o portal bloqueia novas
  solicitações — validado no servidor, não só escondendo o botão.
- Manual do expositor e documentos compartilhados agora vêm da configuração do
  evento (antes era conteúdo estático).

### Alterado
- Cadastro de expositor: **CNPJ e categoria deixaram de ser obrigatórios**.
- Tela de login: removidas as instruções de primeiro acesso; "Supplier Management"
  virou "Gestão de Expositores".
- Testes: 16 no total (cálculo financeiro, snapshot de preço, regra de prazo e
  geração de senha temporária).

## v1.0.0 — Batch 1 + Batch 2 (Next.js + Firebase)

Primeira versão real (banco e autenticação de verdade), substituindo o protótipo
estático. Dashboard, expositores, catálogo com importação XLSX/CSV, pedidos com
snapshot de preço, pagamentos, auditoria, portal do expositor, regras do Firestore
e testes das regras financeiras.

## v0.2.0 — MVP estático (HTML/CSS/JS)
Protótipo funcional sem backend, para validar navegação, login e identidade visual.

## v0.1.0 — Especificação inicial
Documento de requisitos da Batch 1 recebido do time DASH.
