import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import app from '../../src/app.js';
import { loginAluno } from './auth.helper.js';

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
  const sufixo = randomUUID().slice(0, 8);
  const [usuario, dominio] = aluno.email.split('@');

  return {
    ...aluno,
    email: `${usuario}.${sufixo}@${dominio}`,
    matricula: `${aluno.matricula}-${sufixo}`,
  };
}

/**
 * Setup usado por vários arquivos: cadastra um aluno, matricula na disciplina
 * informada e faz login com ele. Falha alto se algum passo der errado, para o
 * erro aparecer no setup e não como um falso negativo no teste.
 */
export async function criarAlunoMatriculado(tokenAdmin, alunoBase, disciplinaId) {
  const aluno = gerarAlunoUnico(alunoBase);

  const cadastro = await request(app)
    .post('/api/admin/alunos')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(aluno);
  if (cadastro.status !== 201) throw new Error(`Setup: cadastro do aluno retornou ${cadastro.status}`);

  const matricula = await request(app)
    .post(`/api/admin/disciplinas/${disciplinaId}/matriculas`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ alunoId: cadastro.body.id });
  if (matricula.status !== 201) throw new Error(`Setup: matrícula retornou ${matricula.status}`);

  const sessao = await loginAluno(aluno.email, aluno.senha);
  if (sessao.status !== 200) throw new Error(`Setup: login do aluno retornou ${sessao.status}`);

  return { ...aluno, id: cadastro.body.id, token: sessao.body.token };
}

/**
 * Limpeza: remove os trabalhos e o aluno criados pelo teste, para não deixar
 * lixo no banco. Os trabalhos vão primeiro porque a API não os apaga em cascata.
 */
export async function removerAlunoEDados(tokenAdmin, alunoId) {
  const trabalhos = await request(app)
    .get(`/api/admin/trabalhos?alunoId=${alunoId}`)
    .set('Authorization', `Bearer ${tokenAdmin}`);

  for (const trabalho of trabalhos.body ?? []) {
    await request(app)
      .delete(`/api/admin/trabalhos/${trabalho.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
  }

  await request(app)
    .delete(`/api/admin/alunos/${alunoId}`)
    .set('Authorization', `Bearer ${tokenAdmin}`);
}

/**
 * Troca os marcadores {alunoId}, {outroAlunoId} etc. de uma rota do JSON
 * pelos valores reais do teste.
 */
export function montarRota(rota, valores) {
  return rota.replace(/\{(\w+)\}/g, (_, chave) => valores[chave]);
}

/**
 * Casos marcados com "bugConhecido" no JSON viram testes pendentes:
 * aparecem no relatório do Mocha, mas não quebram a pipeline enquanto
 * o defeito não for corrigido. Ao corrigir, basta apagar o campo do JSON.
 */
export function itOuPendente(caso) {
  return caso.bugConhecido ? it.skip : it;
}
