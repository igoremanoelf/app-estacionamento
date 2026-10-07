/**
 * RFA0: o administrador é registado diretamente na base de dados.
 *
 * Este script (Firebase Admin SDK) cria um parque com lugares e a conta do
 * administrador associada. Pode ser corrido várias vezes para criar vários
 * parques (RNF0), cada um com o seu administrador.
 *
 * Uso:
 *   node scripts/seed.mjs (--key scripts/serviceAccount.json | --project <id>) \
 *     --email admin@parque.pt --password segredo123 --name "Admin" \
 *     --park "Parque Central" [--zones A:12,B:12] [--demo]
 *
 * Sem --key usa as Application Default Credentials (gcloud auth application-default login).
 *
 * --demo cria também um gestor (gestor.<parkId>@demo.pt) e um utente
 * (utente.<parkId>@demo.pt) ativos, ambos com password "demo1234".
 */
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]);
    return acc;
  }, []),
);

const required = ['email', 'password', 'park'];
if (!args.key && !args.project) required.push('key ou --project');
const missing = required.filter((k) => !args[k] || args[k] === true);
if (missing.length) {
  console.error(`Faltam argumentos: ${missing.map((m) => `--${m}`).join(', ')}`);
  process.exit(1);
}

initializeApp(
  args.key && args.key !== true
    ? { credential: cert(JSON.parse(readFileSync(args.key, 'utf8'))) }
    : { projectId: args.project },
);
const auth = getAuth();
const db = getFirestore();

const DEFAULT_PRICES = {
  hourly: { carro: 1.2, mota: 0.6, carrinha: 1.8 },
  daily: { carro: 12, mota: 6, carrinha: 18 },
  monthly: { carro: 60, mota: 30, carrinha: 90 },
};

async function ensureUser(email, password, displayName) {
  try {
    return await auth.getUserByEmail(email);
  } catch {
    return auth.createUser({ email, password, displayName });
  }
}

async function main() {
  const parkRef = db.collection('parks').doc();
  await parkRef.set({
    name: args.park,
    address: typeof args.address === 'string' ? args.address : '',
    open24h: true,
    openTime: '08:00',
    closeTime: '22:00',
    prices: DEFAULT_PRICES,
    createdAt: FieldValue.serverTimestamp(),
  });

  const zones = (typeof args.zones === 'string' ? args.zones : 'A:12,B:12').split(',').map((z) => {
    const [name, count] = z.split(':');
    return { name: name.toUpperCase(), count: Number(count) };
  });
  const batch = db.batch();
  let order = 1;
  for (const z of zones) {
    for (let i = 1; i <= z.count; i++) {
      const code = `${z.name}${String(i).padStart(2, '0')}`;
      batch.set(parkRef.collection('spots').doc(`${z.name}-${code}`), { code, zone: z.name, order: order++, active: true, occupied: false });
    }
  }
  await batch.commit();

  const profile = (name, email, role, phone = '') => ({
    name,
    email,
    phone,
    photoURL: null,
    role,
    status: 'ativo',
    parkId: parkRef.id,
    vehicles: [],
    createdAt: FieldValue.serverTimestamp(),
  });

  const admin = await ensureUser(args.email, args.password, args.name || 'Administrador');
  await db.collection('users').doc(admin.uid).set(profile(args.name || 'Administrador', args.email.toLowerCase(), 'admin'));
  console.log(`Parque "${args.park}" criado (${parkRef.id}) com ${order - 1} lugares.`);
  console.log(`Administrador: ${args.email}`);

  if (args.demo) {
    const g = await ensureUser(`gestor.${parkRef.id.toLowerCase()}@demo.pt`, 'demo1234', 'Gestor Demo');
    await db.collection('users').doc(g.uid).set(profile('Gestor Demo', g.email, 'gestor', '910000001'));
    const u = await ensureUser(`utente.${parkRef.id.toLowerCase()}@demo.pt`, 'demo1234', 'Utente Demo');
    await db.collection('users').doc(u.uid).set({ ...profile('Utente Demo', u.email, 'utente', '910000002'), vehicles: [{ plate: 'AA-00-AA', type: 'carro' }] });
    console.log(`Gestor demo: ${g.email} / demo1234`);
    console.log(`Utente demo: ${u.email} / demo1234`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
