import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { tokenAdmin } from './helpers/auth.helper.js';
import {
  carregarFixture,
  criarAlunoMatriculado,
  removerAlunoEDados,
  montarRota,
} from './helpers/dados.helper.js';

// Matriz de permissões por perfil: "esconder botão não é autorização" —
// cada rota é chamada direto na API com o token de cada perfil.
const { aluno: alunoBase, disciplinaMatriculada, outroAlunoId, casos } = carregarFixture('autorizacao.json');

describe('Autorização por perfil', () => {
  let tokens;
  let valores;

  before(async () => {
    const admin = await tokenAdmin();
    const aluno = await criarAlunoMatriculado(admin, alunoBase, disciplinaMatriculada);
    tokens = { admin, aluno: aluno.token };
    valores = { alunoId: aluno.id, outroAlunoId };
  });

  after(async () => {
    await removerAlunoEDados(tokens.admin, valores.alunoId);
  });

  casos.forEach((caso) => {
    it(`deve retornar ${caso.statusEsperado} quando ${caso.descricao}`, async () => {
      const rota = montarRota(caso.rota, valores);
      const corpo = caso.corpo ? JSON.parse(montarRota(JSON.stringify(caso.corpo), valores)) : undefined;

      const resposta = await request(app)[caso.metodo](rota)
        .set('Authorization', `Bearer ${tokens[caso.perfil]}`)
        .send(corpo);

      expect(resposta.status).to.equal(caso.statusEsperado);
      if (caso.erroEsperado) {
        expect(resposta.body).to.deep.equal({ error: caso.erroEsperado });
      }
    });
  });

  it('não deve ter alterado o trabalho que o aluno tentou corrigir', async () => {
    const resposta = await request(app)
      .get('/api/admin/trabalhos/trabalho-ana-lista-exercicios-1')
      .set('Authorization', `Bearer ${tokens.admin}`);

    expect(resposta.status).to.equal(200);
    expect(resposta.body.nota).to.not.equal(10);
  });

  it('não deve ter matriculado o aluno que tentou se matricular sozinho', async () => {
    const resposta = await request(app)
      .get(`/api/alunos/${valores.alunoId}/disciplinas`)
      .set('Authorization', `Bearer ${tokens.aluno}`);

    const ids = resposta.body.map((disciplina) => disciplina.id);
    expect(ids).to.deep.equal([disciplinaMatriculada]);
  });
});
