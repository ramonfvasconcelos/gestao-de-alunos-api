import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lê um arquivo JSON da pasta test/fixtures.
 * Ex.: carregarFixture('entregas.json')
 */
export function carregarFixture(nomeArquivo) {
  const caminho = path.join(__dirname, '..', 'fixtures', nomeArquivo);
  return JSON.parse(fs.readFileSync(caminho, 'utf8'));
}

/**
 * A API não aceita dois alunos com o mesmo e-mail ou matrícula.
 * Para o teste poder rodar várias vezes no mesmo banco, adicionamos
 * um sufixo único ao e-mail e à matrícula vindos do JSON.
 */
export function gerarAlunoUnico(aluno) {
  const sufixo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const [usuario, dominio] = aluno.email.split('@');

  return {
    ...aluno,
    email: `${usuario}.${sufixo}@${dominio}`,
    matricula: `${aluno.matricula}-${sufixo}`,
  };
}
