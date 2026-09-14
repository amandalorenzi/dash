/**
 * Nomes de coleções do Firestore centralizados — nunca hardcode strings
 * de coleção diretamente nas queries.
 */
export const COLLECTIONS = {
  events: 'events',
  eventUpdates: 'eventUpdates',
  discussions: 'discussions',
  categories: 'categories',
  suppliers: 'suppliers',
  catalogItems: 'catalogItems',
  orders: 'orders',
  payments: 'payments',
  teamMembers: 'teamMembers',
  documents: 'documents',
  deadlines: 'deadlines',
  auditLogs: 'auditLogs',
  profiles: 'profiles',
  catalogImports: 'catalogImports',
} as const;

export const SESSION_COOKIE_NAME = '__dash_session';
