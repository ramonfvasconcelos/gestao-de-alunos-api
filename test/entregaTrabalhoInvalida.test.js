import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { tokenAdmin } from './helpers/auth.helper.js';
import {
  carregarFixture,
  criarAlunoMatriculado,
  itOuPendente,
  removerAlunoEDados,
} from './helpers/dados.helper.js';

// Data-Driven Testing: cada caso inválido do JSON vira um teste.
// Casos com "bugConhecido" ficam pendentes até o defeito ser corrigido.
const { aluno: alunoBase, disciplinaMatriculada, casos } = carregarFixture('entregas-invalidas.json');

describe('POST /api/alunos/:alunoId/trabalhos - entregas inválidas', () => {
  let admin;
  let aluno;

  const entregar = () =>
    request(app)
      .post(`/api/alunos/${aluno.id}/trabalhos`)
      .set('Authorization', `Bearer ${aluno.token}`);

  const listarTrabalhos = () =>
    request(app)
      .get(`/api/alunos/${aluno.id}/trabalhos`)
      .set('Authorization', `Bearer ${aluno.token}`);

  before(async () => {
    admin = await tokenAdmin();
    aluno = await criarAlunoMatriculado(admin, alunoBase, disciplinaMatriculada);
  });

  after(async () => {
    await removerAlunoEDados(admin, aluno.id);
  });

  casos.forEach((caso) => {
    const titulo = `${caso.bugConhecido ? `[${caso.bugConhecido}] ` : ''}deve retornar ${caso.statusEsperado} quando ${caso.descricao}`;

    itOuPendente(caso)(titulo, async () => {
      const resposta = caso.corpoBruto
        ? await entregar().set('Content-Type', 'application/json').send(caso.corpoBruto)
        : await entregar().send(caso.corpo);

      expect(resposta.status).to.equal(caso.statusEsperado);
      if (caso.erroEsperado) {
        expect(resposta.body).to.deep.equal({ error: caso.erroEsperado });
      }
    });
  });

  it('não deve ter gravado nenhuma das entregas rejeitadas', async () => {
    const resposta = await listarTrabalhos();

    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.be.an('array').that.is.empty;
  });

  it('deve retornar 401 quando o token não for enviado', async () => {
    const resposta = await request(app)
      .post(`/api/alunos/${aluno.id}/trabalhos`)
      .send({ disciplinaId: disciplinaMatriculada, titulo: 'Trabalho sem login' });

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal('Token de autenticação não informado.');
  });

  it('deve retornar 404 quando o admin entregar para um aluno que não existe', async () => {
    const resposta = await request(app)
      .post('/api/alunos/aluno-inexistente/trabalhos')
      .set('Authorization', `Bearer ${admin}`)
      .send({ disciplinaId: disciplinaMatriculada, titulo: 'Para ninguém' });

    expect(resposta.status).to.equal(404);
    expect(resposta.body.error).to.equal('Aluno com id "aluno-inexistente" não encontrado.');
  });

  describe('Depois que o admin remove o aluno', () => {
    let removido;

    before(async () => {
      removido = await criarAlunoMatriculado(admin, { ...alunoBase, nome: 'Aluno Removido' }, disciplinaMatriculada);
      await request(app)
        .post(`/api/alunos/${removido.id}/trabalhos`)
        .set('Authorization', `Bearer ${removido.token}`)
        .send({ disciplinaId: disciplinaMatriculada, titulo: 'Entregue antes da remoção' });
      await removerAlunoEDados(admin, removido.id);
    });

    it('o login do aluno removido deve falhar', async () => {
      const resposta = await request(app)
        .post('/api/auth/login')
        .send({ email: removido.email, senha: removido.senha });

      expect(resposta.status).to.equal(401);
    });

    it('o token antigo não deve conseguir registrar novas entregas', async () => {
      const resposta = await request(app)
        .post(`/api/alunos/${removido.id}/trabalhos`)
        .set('Authorization', `Bearer ${removido.token}`)
        .send({ disciplinaId: disciplinaMatriculada, titulo: 'Depois da remoção' });

      expect(resposta.status).to.equal(404);
    });

    it.skip('[BUG-06] o token antigo não deve continuar lendo os dados do aluno removido', async () => {
      const resposta = await request(app)
        .get(`/api/alunos/${removido.id}/trabalhos`)
        .set('Authorization', `Bearer ${removido.token}`);

      expect(resposta.status).to.be.oneOf([401, 404]);
    });
  });
});
