/**
 * Script de seed — popula o Firestore com dados de demonstração e cria
 * os usuários iniciais no Firebase Authentication.
 *
 * Uso:
 *   npm run seed
 *
 * Requer as mesmas variáveis de ambiente do Admin SDK (ver .env.example).
 * É seguro rodar mais de uma vez: os documentos usam IDs fixos e a
 * escrita é feita com `set` (idempotente) — nada é duplicado.
 */
import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: requireEnv('FIREBASE_PROJECT_ID'),
        clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
        privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    });

const db = getFirestore(app);
const auth = getAuth(app);

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

async function ensureAuthUser(email: string, password: string, displayName: string): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email, password, displayName, emailVerified: true });
    return created.uid;
  }
}

async function main() {
  console.log('Seed iniciado...');

  const eventId = 'evt-demo-2026';
  await db.collection('events').doc(eventId).set({
    id: eventId, name: 'Festival Exemplo 2026', local: 'São Paulo Expo',
    dataInicio: '2026-11-12', dataFim: '2026-11-14', createdAt: now(),
  });

  const categories = ['Mobiliário', 'Elétrica', 'Audiovisual', 'Internet', 'Limpeza', 'Staff', 'Outros'];
  for (const name of categories) {
    await db.collection('categories').doc(`${eventId}-${name}`).set({ id: `${eventId}-${name}`, eventId, name });
  }

  // ---- Expositores ---------------------------------------------------
  const supplier1Id = 'sup-demo-acme';
  await db.collection('suppliers').doc(supplier1Id).set({
    id: supplier1Id, eventId, codigo: 'EXP-001',
    razaoSocial: 'Acme Tecnologia Ltda', nomeFantasia: 'Acme Tecnologia', cnpj: '12.345.678/0001-90',
    inscricaoEstadual: '123.456.789.112',
    endereco: { logradouro: 'Av. Paulista', numero: '1000', complemento: 'Sala 12', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', cep: '01310-100' },
    responsavel: { nome: 'Carla Menezes', cargo: 'Gerente Comercial', email: 'contato@acmetecnologia.com.br', telefone: '(11) 4002-8922' },
    nomeExibido: 'Acme Tecnologia', standNumero: 'A01', standLocalizacao: 'Pavilhão Azul', standMetragem: 12, categoria: 'Audiovisual',
    observacoesInternas: 'Cliente recorrente.',
    statusGeral: 'REGULAR', statusCadastral: 'VALIDATED', statusDash: 'VALIDATED', statusFinanceiro: 'PAYMENT_PENDING',
    verifiedAt: daysAgo(9), verifiedBy: 'Admin DASH', validatedAt: daysAgo(7), validatedBy: 'Admin DASH',
    authUid: null, createdAt: daysAgo(20), updatedAt: daysAgo(2),
  });

  const supplier2Id = 'sup-demo-natura';
  await db.collection('suppliers').doc(supplier2Id).set({
    id: supplier2Id, eventId, codigo: 'EXP-002',
    razaoSocial: 'Natura Demo Cosméticos S.A.', nomeFantasia: 'Natura Demo', cnpj: '98.765.432/0001-11',
    inscricaoEstadual: '987.654.321.110',
    endereco: { logradouro: 'Rua das Flores', numero: '250', bairro: 'Centro', cidade: 'Cajamar', estado: 'SP', cep: '07750-000' },
    responsavel: { nome: 'Bruno Alves', cargo: 'Coordenador de Eventos', email: 'bruno.alves@naturademo.com', telefone: '(11) 3344-5566' },
    nomeExibido: 'Natura Demo', standNumero: 'A02', standLocalizacao: 'Pavilhão Azul', standMetragem: 24, categoria: 'Mobiliário',
    observacoesInternas: 'Aguardando confirmação de metragem.',
    statusGeral: 'PENDING', statusCadastral: 'SUBMITTED', statusDash: 'PENDING_REVIEW', statusFinanceiro: 'PAYMENT_PENDING',
    verifiedAt: null, verifiedBy: null, validatedAt: null, validatedBy: null,
    authUid: null, createdAt: daysAgo(15), updatedAt: daysAgo(1),
  });

  // ---- Catálogo --------------------------------------------------------
  const catalogSeed = [
    { code: 'MOB-001', name: 'Banqueta alta', category: 'Mobiliário', price: 90, billingUnit: 'UNIT' },
    { code: 'MOB-002', name: 'Mesa Bistrô', category: 'Mobiliário', price: 180, billingUnit: 'UNIT' },
    { code: 'ELE-004', name: 'Ponto de energia adicional 20A', category: 'Elétrica', price: 450, billingUnit: 'POINT', requiresApproval: true },
    { code: 'AV-010', name: 'TV 55"', category: 'Audiovisual', price: 650, billingUnit: 'DAILY' },
    { code: 'STAFF-001', name: 'Promotor(a)', category: 'Staff', price: 380, billingUnit: 'DAILY', requiresApproval: true },
    { code: 'LIMP-001', name: 'Limpeza extra', category: 'Limpeza', price: 220, billingUnit: 'SERVICE' },
    { code: 'NET-001', name: 'Internet cabeada', category: 'Internet', price: 520, billingUnit: 'PACKAGE' },
    { code: 'OUT-001', name: 'Credencial adicional', category: 'Outros', price: 45, billingUnit: 'UNIT' },
  ];
  const catalogIds: Record<string, string> = {};
  for (const item of catalogSeed) {
    const id = `cat-${item.code}`;
    catalogIds[item.code] = id;
    await db.collection('catalogItems').doc(id).set({
      id, eventId, code: item.code, name: item.name, description: '', category: item.category,
      price: item.price, billingUnit: item.billingUnit, minQty: 1, maxQty: 20, allowsQuantity: true,
      requiresApproval: item.requiresApproval ?? false, availableAfterDeadline: true, specificDeadline: null, active: true,
      createdAt: now(), updatedAt: now(), createdBy: 'seed', updatedBy: 'seed',
    });
  }

  // ---- Pedido de exemplo -------------------------------------------------
  await db.collection('orders').doc('ord-demo-1').set({
    id: 'ord-demo-1', eventId, supplierId: supplier1Id, status: 'APPROVED', createdAt: daysAgo(9), updatedAt: daysAgo(7),
    items: [
      { id: 'oi-1', catalogItemId: catalogIds['ELE-004'], codeSnapshot: 'ELE-004', nameSnapshot: 'Ponto de energia adicional 20A', unitSnapshot: 'POINT', unitPriceSnapshot: 450, quantity: 2, approvalStatus: 'APPROVED', notes: '' },
      { id: 'oi-2', catalogItemId: catalogIds['AV-010'], codeSnapshot: 'AV-010', nameSnapshot: 'TV 55"', unitSnapshot: 'DAILY', unitPriceSnapshot: 650, quantity: 3, approvalStatus: 'APPROVED', notes: '' },
    ],
  });

  // ---- Pagamento de exemplo -----------------------------------------------
  await db.collection('payments').doc('pay-demo-1').set({
    id: 'pay-demo-1', eventId, supplierId: supplier1Id, orderId: 'ord-demo-1', amount: 2850, status: 'PAYMENT_PENDING',
    paymentMethod: null, reference: null, notes: '', paidAt: null, verifiedAt: null, verifiedBy: null, createdAt: daysAgo(7),
  });

  // ---- Prazo de exemplo -----------------------------------------------------
  await db.collection('deadlines').doc('deadline-demo-1').set({
    id: 'deadline-demo-1', eventId, titulo: 'Envio de documentos obrigatórios',
    descricao: 'Contrato social, cartão CNPJ e ficha técnica do estande.', dataLimite: '2026-10-20',
  });

  // ---- Usuários de demonstração --------------------------------------------
  const adminUid = await ensureAuthUser('admin@dasheventos.com.br', 'TrocarSenha123!', 'Admin DASH');
  await db.collection('profiles').doc(adminUid).set({
    uid: adminUid, email: 'admin@dasheventos.com.br', name: 'Admin DASH', role: 'SUPER_ADMIN',
    supplierId: null, eventId: null, createdAt: now(),
  });

  const expositorUid = await ensureAuthUser('contato@acmetecnologia.com.br', 'TrocarSenha123!', 'Carla Menezes');
  await db.collection('profiles').doc(expositorUid).set({
    uid: expositorUid, email: 'contato@acmetecnologia.com.br', name: 'Carla Menezes', role: 'EXPOSITOR',
    supplierId: supplier1Id, eventId, createdAt: now(),
  });
  await db.collection('suppliers').doc(supplier1Id).update({ authUid: expositorUid });

  console.log('Seed concluído com sucesso.');
  console.log('---');
  console.log('Login Admin DASH:      admin@dasheventos.com.br      / TrocarSenha123!');
  console.log('Login Expositor demo:  contato@acmetecnologia.com.br / TrocarSenha123!');
  console.log('IMPORTANTE: troque essas senhas no Firebase Authentication antes de ir para produção.');
}

main().catch((err) => {
  console.error('Falha ao rodar o seed:', err);
  process.exit(1);
});
