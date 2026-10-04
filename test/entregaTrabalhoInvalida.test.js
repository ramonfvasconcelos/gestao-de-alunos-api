import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { loginAdmin, loginAluno } from './helpers/auth.helper.js';
import { carregarFixture, gerarAlunoUnico } from './helpers/dados.helper.js';

// Data-Driven Testing: cada caso inválido do JSON vira um teste.
const { aluno: alunoBase, disciplinaMatriculada, casos } = carregarFixture('entregas-invalidas.json');

describe('POST /api/alunos/:alunoId/trabalhos - entregas inválidas', () => {
  const aluno = gerarAlunoUnico(alunoBase);
  let tokenAluno;
  let alunoId;

  before(async () => {
    const tokenAdmin = (await loginAdmin()).body.token;

    const cadastro = await request(app)
      .post('/api/admin/alunos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(aluno);
    alunoId = cadastro.body.id;

    await request(app)
      .post(`/api/admin/disciplinas/${disciplinaMatriculada}/matriculas`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ alunoId });

    tokenAluno = (await loginAluno(aluno.email, aluno.senha)).body.token;
  });

  casos.forEach((caso) => {
    it(`deve retornar ${caso.statusEsperado} quando ${caso.descricao}`, async () => {
      const resposta = await request(app)
        .post(`/api/alunos/${alunoId}/trabalhos`)
        .set('Authorization', `Bearer ${tokenAluno}`)
        .send(caso.corpo);

      expect(resposta.status).to.equal(caso.statusEsperado);
      expect(resposta.body.error).to.equal(caso.erroEsperado);
    });
  });

  it('deve retornar 403 quando o aluno tentar registrar trabalho em nome de outro aluno', async () => {
    const resposta = await request(app)
      .post('/api/alunos/aluno-ana-souza/trabalhos')
      .set('Authorization', `Bearer ${tokenAluno}`)
      .send({ disciplinaId: disciplinaMatriculada, titulo: 'Trabalho de outra pessoa' });

    expect(resposta.status).to.equal(403);
    expect(resposta.body.error).to.equal('Você só pode acessar os seus próprios dados.');
  });

  it('deve retornar 401 quando o token não for enviado', async () => {
    const resposta = await request(app)
      .post(`/api/alunos/${alunoId}/trabalhos`)
      .send({ disciplinaId: disciplinaMatriculada, titulo: 'Trabalho sem login' });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal('Token de autenticação não informado.');
  });
});
