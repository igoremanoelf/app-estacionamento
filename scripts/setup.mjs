/**
 * Configuração automática do ParkSmart, de ponta a ponta:
 *
 *   1. login no Firebase (abre o browser na primeira vez)
 *   2. cria (ou usa) o projeto Firebase e a Web app
 *   3. escreve o .env com a configuração da Web app
 *   4. cria a base de dados Firestore e publica as regras
 *   5. ativa o login por Email/Password (precisa do gcloud; senão mostra o link)
 *   6. cria o parque, os lugares e o administrador (RFA0) e, com --demo, um gestor e um utente
 *   7. envia o código para o GitLab e cria as tags de avaliação
 *
 * Uso (todas as opções são facultativas; o que faltar é perguntado):
 *   npm run setup -- --project parksmart-123 --park "Parque Central" \
 *     --email admin@parque.pt --password admin123 --demo \
 *     --gitlab https://gitlab.estig.ipb.pt/<grupo>/<projeto>.git --tags Final
 *
 * Opções:
 *   --project <id>     usa um projeto Firebase existente (senão cria um novo)
 *   --key <ficheiro>   chave de conta de serviço para o seed (em vez do gcloud)
 *   --location <loc>   localização do Firestore (por omissão eur3)
 *   --skip-firebase    salta os passos 1 a 6
 *   --gitlab <url>     URL do repositório GitLab (salta o passo 7 se omitido)
 *   --tags "A B"       tags a criar (por omissão "Final")
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] === undefined || all[i + 1].startsWith('--') ? true : all[i + 1]]);
    return acc;
  }, []),
);

const rl = createInterface({ input: process.stdin, output: process.stdout });
async function ask(question, def) {
  // sem terminal interativo (ex.: execução automática) usa o valor por omissão
  if (!process.stdin.isTTY) return def || '';
  const answer = (await rl.question(`${question}${def ? ` [${def}]` : ''}: `)).trim();
  return answer || def || '';
}

function step(n, text) {
  console.log(`\n\x1b[1;34m[${n}/7] ${text}\x1b[0m`);
}

/** Corre um comando com o terminal ligado (interativo). */
function run(cmd, cmdArgs, { allowFail = false } = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: isWin });
  if (r.status !== 0 && !allowFail) throw new Error(`Falhou: ${cmd} ${cmdArgs.join(' ')}`);
  return r.status === 0;
}

/** Corre um comando e devolve o stdout. */
function capture(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', shell: isWin });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function has(cmd) {
  return capture(isWin ? 'where' : 'which', [cmd]).ok;
}

// firebase-tools: usa o instalado globalmente ou o npx
const FB = has('firebase') ? ['firebase'] : ['npx', '-y', 'firebase-tools@latest'];
const fb = (a, o) => run(FB[0], [...FB.slice(1), ...a], o);
function fbJson(a) {
  const r = capture(FB[0], [...FB.slice(1), ...a, '--json']);
  try {
    const parsed = JSON.parse(r.out);
    if (parsed.status === 'success') return parsed.result;
    throw new Error(parsed.error || r.err);
  } catch (e) {
    throw new Error(`firebase ${a.join(' ')}: ${e.message || r.err}`);
  }
}

async function enableEmailPassword(projectId) {
  if (!has('gcloud')) return false;
  const token = capture('gcloud', ['auth', 'print-access-token']);
  if (!token.ok) {
    run('gcloud', ['auth', 'login'], { allowFail: true });
  }
  const t = capture('gcloud', ['auth', 'print-access-token']);
  if (!t.ok) return false;
  const headers = { Authorization: `Bearer ${t.out}`, 'Content-Type': 'application/json', 'x-goog-user-project': projectId };
  const base = `https://identitytoolkit.googleapis.com`;
  const patch = () =>
    fetch(`${base}/admin/v2/projects/${projectId}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
    });
  let res = await patch();
  if (!res.ok) {
    // projeto novo: o Authentication ainda não foi inicializado
    run('gcloud', ['services', 'enable', 'identitytoolkit.googleapis.com', `--project=${projectId}`], { allowFail: true });
    await fetch(`${base}/v2/projects/${projectId}/identityPlatform:initializeAuth`, { method: 'POST', headers, body: '{}' });
    res = await patch();
  }
  return res.ok;
}

async function ensureAdc(projectId) {
  if (!has('gcloud')) return false;
  const adc = capture('gcloud', ['auth', 'application-default', 'print-access-token']);
  if (!adc.ok) run('gcloud', ['auth', 'application-default', 'login'], { allowFail: true });
  run('gcloud', ['auth', 'application-default', 'set-quota-project', projectId], { allowFail: true });
  return capture('gcloud', ['auth', 'application-default', 'print-access-token']).ok;
}

async function firebaseSetup() {
  step(1, 'Login no Firebase');
  fb(['login']);

  step(2, 'Projeto e Web app');
  let projectId = args.project === true ? '' : args.project;
  if (!projectId) {
    const suggestion = `parksmart-${Math.random().toString(36).slice(2, 8)}`;
    projectId = await ask('ID do novo projeto Firebase (minúsculas, números e hífenes)', suggestion);
    const created = fb(['projects:create', projectId, '-n', 'ParkSmart'], { allowFail: true });
    if (!created) {
      console.log('\nNão foi possível criar o projeto (pode ser preciso aceitar os termos em https://console.firebase.google.com).');
      console.log('Crie-o na consola e volte a correr: npm run setup -- --project <id>');
      process.exit(1);
    }
  }
  writeFileSync(join(ROOT, '.firebaserc'), JSON.stringify({ projects: { default: projectId } }, null, 2) + '\n');

  const apps = fbJson(['apps:list', 'WEB', '--project', projectId]) || [];
  const appId = apps[0]?.appId ?? fbJson(['apps:create', 'WEB', 'ParkSmart', '--project', projectId]).appId;
  const { sdkConfig } = fbJson(['apps:sdkconfig', 'WEB', appId, '--project', projectId]);

  step(3, 'A escrever o .env');
  const envPath = join(ROOT, '.env');
  const previous = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const keep = (k, def) => previous.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? def;
  writeFileSync(
    envPath,
    [
      `EXPO_PUBLIC_FIREBASE_API_KEY=${sdkConfig.apiKey}`,
      `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${sdkConfig.authDomain}`,
      `EXPO_PUBLIC_FIREBASE_PROJECT_ID=${sdkConfig.projectId}`,
      `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=${sdkConfig.storageBucket ?? ''}`,
      `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${sdkConfig.messagingSenderId}`,
      `EXPO_PUBLIC_FIREBASE_APP_ID=${sdkConfig.appId}`,
      `EXPO_PUBLIC_USE_STORAGE=${keep('EXPO_PUBLIC_USE_STORAGE', 'false')}`,
      `EXPO_PUBLIC_EAS_PROJECT_ID=${keep('EXPO_PUBLIC_EAS_PROJECT_ID', '')}`,
      '',
    ].join('\n'),
  );
  console.log('.env escrito.');

  step(4, 'Firestore e regras de segurança');
  const location = args.location && args.location !== true ? args.location : 'eur3';
  fb(['firestore:databases:create', '(default)', '--location', location, '--project', projectId], { allowFail: true });
  fb(['deploy', '--only', 'firestore:rules,firestore:indexes', '--project', projectId]);

  step(5, 'Login por Email/Password');
  const authOk = await enableEmailPassword(projectId).catch(() => false);
  if (!authOk) {
    console.log(`Ative manualmente (1 clique): https://console.firebase.google.com/project/${projectId}/authentication/providers`);
    await ask('Prima Enter depois de ativar o fornecedor "Email/Password"');
  } else {
    console.log('Email/Password ativo.');
  }

  step(6, 'Parque, lugares e administrador');
  const park = args.park && args.park !== true ? args.park : await ask('Nome do parque', 'Parque Central');
  const email = args.email && args.email !== true ? args.email : await ask('Email do administrador', 'admin@parque.pt');
  let password = args.password && args.password !== true ? args.password : await ask('Password do administrador (mín. 6)', '');
  if (password.length < 6 && !process.stdin.isTTY) throw new Error('Indique --password com pelo menos 6 caracteres.');
  while (password.length < 6) password = await ask('Password do administrador (mín. 6)', '');
  const seedArgs = ['scripts/seed.mjs', '--park', park, '--email', email, '--password', password, '--name', 'Administrador', '--project', projectId];
  if (args.zones && args.zones !== true) seedArgs.push('--zones', args.zones);
  if (args.demo) seedArgs.push('--demo');
  if (args.key && args.key !== true) {
    seedArgs.push('--key', args.key);
  } else if (!(await ensureAdc(projectId))) {
    console.log('Sem gcloud: gere uma chave em');
    console.log(`  https://console.firebase.google.com/project/${projectId}/settings/serviceaccounts/adminsdk`);
    const key = await ask('Caminho do ficheiro JSON da chave', 'scripts/serviceAccount.json');
    seedArgs.push('--key', key);
  }
  run('node', seedArgs);
  return projectId;
}

function gitlabSetup(url) {
  step(7, 'GitLab');
  const git = (a, o) => run('git', a, o);
  if (!existsSync(join(ROOT, '.git'))) git(['init', '-b', 'main']);
  git(['add', '-A']);
  git(['commit', '-m', 'Configuração do projeto Firebase'], { allowFail: true });
  git(['branch', '-M', 'main']);
  if (!capture('git', ['remote', 'get-url', 'origin']).ok) git(['remote', 'add', 'origin', url]);
  else git(['remote', 'set-url', 'origin', url]);
  git(['push', '-u', 'origin', 'main']);
  const tags = (args.tags && args.tags !== true ? args.tags : 'Final').split(/[ ,]+/).filter(Boolean);
  for (const tag of tags) {
    git(['tag', '-f', tag]);
    git(['push', '-f', 'origin', `refs/tags/${tag}`]);
  }
  console.log(`Código enviado para ${url} com as tags: ${tags.join(', ')}`);
}

async function main() {
  if (!has('git') && args.gitlab) throw new Error('Instale o git: https://git-scm.com');
  if (!existsSync(join(ROOT, 'node_modules'))) run('npm', ['install']);
  let projectId = null;
  if (!args['skip-firebase']) projectId = await firebaseSetup();
  const gitlab = args.gitlab && args.gitlab !== true ? args.gitlab : await ask('URL do repositório GitLab (Enter para saltar)', '');
  if (gitlab) gitlabSetup(gitlab);
  else console.log('\nGitLab saltado.');
  console.log('\n\x1b[1;32mTudo pronto.\x1b[0m');
  if (projectId) console.log(`Firebase: https://console.firebase.google.com/project/${projectId}`);
  console.log('Arranque a app com: npx expo start');
}

main()
  .catch((e) => {
    console.error(`\n\x1b[1;31mErro:\x1b[0m ${e.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
