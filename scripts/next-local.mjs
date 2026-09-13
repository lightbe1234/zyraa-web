import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

// Local project configuration must not inherit another project's database.
// Vercel supplies the authoritative environment on deployments.
const env = { ...process.env };
if (!env.VERCEL && existsSync('.env.local')) {
  Object.assign(env, parseEnv(readFileSync('.env.local', 'utf8')));
}
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...process.argv.slice(2)], { env, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
child.on('error', error => { console.error(error.message); process.exit(1); });
