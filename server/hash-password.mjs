import { stdin, stdout } from 'node:process';
import { hashPassword } from './admin-core.mjs';

if (stdin.isTTY) {
  console.error('Envía la contraseña por stdin; no la pongas en los argumentos del proceso.');
  process.exit(1);
}
let input = '';
for await (const chunk of stdin) {
  input += chunk;
  if (input.length > 1024) throw new Error('Entrada demasiado grande.');
}
stdout.write(`${await hashPassword(input.replace(/\r?\n$/, ''))}\n`);
