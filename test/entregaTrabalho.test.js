import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { loginAdmin, loginAluno } from './helpers/auth.helper.js';
import { carregarFixture, gerarAlunoUnico } from './helpers/dados.helper.js';

// Data-Driven Testing: cada item do JSON gera um cenário completo de teste.
const entregas = carregarFixture('entregas.json');

describe('Fluxo de entrega de trabalho pelo aluno', () => {
  entregas.forEach((dados) => {
    describe(dados.cenario, () => {
      const aluno = gerarAlunoUnico(dados.aluno);
      let tokenAdmin;
      let tokenAluno;
      let alunoId;

      it('deve logar como administrador', async () => {
        const resposta = await loginAdmin();

        expect(resposta.status).to.equal(200);
        expect(resposta.body).to.have.property('token');
        expect(resposta.body.usuario.role).to.equal('admin');

        tokenAdmin = resposta.body.token;
      });

      it('deve cadastrar o aluno como administrador', async () => {
        const resposta = await request(app)
          .post('/api/admin/alunos')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send(aluno);

        expect(resposta.status).to.equal(201);
        expect(resposta.body).to.have.property('id');
        expect(resposta.body.nome).to.equal(aluno.nome);
        expect(resposta.body.email).to.equal(aluno.email);
        expect(resposta.body.matricula).to.equal(aluno.matricula);
        expect(resposta.body).to.not.have.property('senha');

        alunoId = resposta.body.id;
      });

      it('deve matricular o aluno na disciplina', async () => {
        const resposta = await request(app)
          .post(`/api/admin/disciplinas/${dados.disciplinaId}/matriculas`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({ alunoId });

        expect(resposta.status).to.equal(201);
        expect(resposta.body.alunoId).to.equal(alunoId);
        expect(resposta.body.disciplinaId).to.equal(dados.disciplinaId);
      });

      it('deve logar como o aluno cadastrado', async () => {
        const resposta = await loginAluno(aluno.email, aluno.senha);

        expect(resposta.status).to.equal(200);
        expect(resposta.body).to.have.property('token');
        expect(resposta.body.usuario.id).to.equal(alunoId);
        expect(resposta.body.usuario.role).to.equal('aluno');

        tokenAluno = resposta.body.token;
      });

      it('deve registrar a entrega do trabalho como aluno', async () => {
        const resposta = await request(app)
          .post(`/api/alunos/${alunoId}/trabalhos`)
          .set('Authorization', `Bearer ${tokenAluno}`)
          .send({ disciplinaId: dados.disciplinaId, ...dados.trabalho });

        expect(resposta.status).to.equal(201);
        expect(resposta.headers['content-type']).to.include('application/json');
        expect(resposta.body).to.have.property('id');
        expect(resposta.body.alunoId).to.equal(alunoId);
        expect(resposta.body.disciplinaId).to.equal(dados.disciplinaId);
        expect(resposta.body.titulo).to.equal(dados.trabalho.titulo);
        expect(resposta.body.descricao).to.equal(dados.trabalho.descricao);
        expect(resposta.body.status).to.equal('entregue');
        expect(resposta.body.nota).to.equal(null);
      });
    });
  });
});
