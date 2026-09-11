# Guia passo a passo — do zero até o site no ar

Este guia assume que você **não é programador**. Vai dizer exatamente onde clicar,
o que copiar e onde colar. Reserve umas 2 horas na primeira vez.

Você vai usar dois serviços gratuitos (nos limites do plano free):
- **Firebase** (do Google) → guarda os dados (expositores, catálogo, pagamentos...)
- **Vercel** → coloca o site no ar, com endereço próprio

---

## PASSO 1 — Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e entre com sua conta Google.
2. Clique em **"Criar projeto"** (ou "Add project").
3. Dê um nome, por exemplo `dash-supplier-management`.
4. Pode desativar o Google Analytics (não é necessário). Clique em **Criar projeto**.

## PASSO 2 — Ativar o Authentication (login)

1. No menu à esquerda, clique em **Build → Authentication**.
2. Clique em **Começar / Get started**.
3. Na aba **Sign-in method**, clique em **E-mail/senha** e ative a primeira opção.
4. Clique em **Salvar**.

## PASSO 3 — Criar o banco de dados (Firestore)

1. No menu à esquerda, clique em **Build → Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha **modo de produção** (as regras de segurança do projeto já cuidam disso).
4. Escolha uma localização (ex.: `southamerica-east1` para servidores no Brasil).
5. Clique em **Ativar**.

## PASSO 4 — Pegar as chaves públicas do app

1. No menu, clique na engrenagem (⚙) ao lado de "Visão geral do projeto" → **Configurações do projeto**.
2. Role até **"Seus apps"** e clique no ícone **`</>`** (Web).
3. Dê um apelido, ex.: `dash-web`, e clique em **Registrar app**.
4. Você verá um bloco de código com `apiKey`, `authDomain`, `projectId`, etc.
   **Copie esses valores** — vamos colar no arquivo `.env` mais adiante.

## PASSO 5 — Pegar a chave de administrador (service account)

1. Ainda em **Configurações do projeto**, clique na aba **Contas de serviço**.
2. Clique em **"Gerar nova chave privada"** e confirme. Um arquivo `.json` será baixado.
3. Abra esse arquivo em um editor de texto. Você vai precisar de três campos dele:
   `project_id`, `client_email` e `private_key`.
4. **Guarde esse arquivo em local seguro e nunca o compartilhe ou suba ao GitHub.**

## PASSO 6 — Configurar o arquivo `.env`

1. Na pasta do projeto, copie o arquivo `.env.example` e renomeie a cópia para `.env`.
2. Preencha os campos `NEXT_PUBLIC_FIREBASE_*` com os valores do Passo 4.
3. Preencha `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`
   com os valores do arquivo baixado no Passo 5. **Atenção**: cole a `private_key`
   inteira, entre aspas, numa linha só (ela já vem com `\n` no meio — deixe assim).

## PASSO 7 — Instalar e rodar localmente

Você vai precisar do [Node.js](https://nodejs.org) instalado (versão 20 ou mais nova).

1. Abra o terminal na pasta do projeto.
2. Rode: `npm install` (baixa tudo que o projeto precisa — demora alguns minutos).
3. Rode: `npm run seed` — isso cria o evento de demonstração, expositores de exemplo,
   catálogo de itens e os dois usuários iniciais (admin e expositor).
4. Rode: `npm run dev`.
5. Abra `http://localhost:3000` no navegador. Você deve ver a tela de login.
6. Entre com `admin@dasheventos.com.br` / `TrocarSenha123!`.

Se a tela de login abrir e o login funcionar, está tudo certo até aqui.

## PASSO 8 — Publicar as regras de segurança do banco

1. Instale a ferramenta de linha de comando do Firebase (uma vez só):
   `npm install -g firebase-tools`
2. No terminal, rode `firebase login` e entre com a mesma conta Google.
3. Rode `firebase use --add` e escolha o projeto que você criou no Passo 1.
4. Rode `firebase deploy --only firestore`.

Isso publica o arquivo `firestore.rules` (quem pode ler/gravar o quê) e os
índices necessários (`firestore.indexes.json`).

## PASSO 9 — Subir o projeto para o GitHub

1. Crie uma conta em https://github.com se ainda não tiver.
2. Crie um repositório novo (pode ser privado).
3. Siga as instruções do próprio GitHub para "subir um projeto existente"
   (geralmente: `git init`, `git add .`, `git commit`, `git remote add origin ...`, `git push`).
   **O arquivo `.env` e a chave do Passo 5 NUNCA devem ser enviados ao GitHub**
   — o projeto já vem configurado para ignorá-los automaticamente.

## PASSO 10 — Criar o projeto na Vercel

1. Acesse https://vercel.com e entre com sua conta (pode usar login do GitHub).
2. Clique em **Add New → Project**.
3. Selecione o repositório que você acabou de subir.
4. A Vercel detecta automaticamente que é um projeto Next.js.

## PASSO 11 — Configurar as variáveis de ambiente na Vercel

1. Antes de clicar em "Deploy", abra a seção **Environment Variables**.
2. Adicione, uma por uma, todas as variáveis que estão no seu arquivo `.env` local
   (os mesmos nomes: `NEXT_PUBLIC_FIREBASE_API_KEY`, `FIREBASE_PRIVATE_KEY`, etc.).
   Para `FIREBASE_PRIVATE_KEY`, cole o valor exatamente como está no `.env`.
3. Clique em **Deploy**.

## PASSO 12 — Primeiro acesso em produção

1. Quando o deploy terminar, a Vercel mostra um link (algo como `dash-app.vercel.app`).
2. Abra o link e entre com o login de administrador.
3. Pronto — o sistema está no ar.

## Próximos deploys

Depois desse primeiro deploy, qualquer atualização é automática: sempre que você
enviar uma mudança para o GitHub (`git push`), a Vercel gera um novo deploy sozinha.

## Problemas comuns

- **Tela de login não entra / erro 401**: confira se rodou `npm run seed` e se as
  variáveis `FIREBASE_*` (sem `NEXT_PUBLIC_`) estão corretas — são elas que
  autenticam o servidor.
- **"Credenciais do Firebase Admin ausentes"**: falta preencher `FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL` ou `FIREBASE_PRIVATE_KEY` no `.env` (local) ou nas
  Environment Variables (Vercel).
- **Erro de índice do Firestore ao abrir uma tela**: o Firestore mostra um link
  direto no próprio erro para criar o índice que falta com um clique; ou rode
  novamente `firebase deploy --only firestore` depois de conferir `firestore.indexes.json`.
