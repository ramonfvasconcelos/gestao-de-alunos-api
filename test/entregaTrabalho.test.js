import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { loginAdmin, loginAluno } from './helpers/auth.helper.js';
import { carregarFixture, gerarAlunoUnico, removerAlunoEDados } from './helpers/dados.helper.js';

// Data-Driven Testing: cada item do JSON gera um cenário completo de teste.
const entregas = carregarFixture('entregas.json');

describe('Fluxo de entrega de trabalho pelo aluno', () => {
  entregas.forEach((dados) => {
    describe(dados.cenario, () => {
      const aluno = gerarAlunoUnico(dados.aluno);
      let tokenAdmin;
      let tokenAluno;
      let alunoId;
      let trabalhoEntregue;

      after(async () => {
        if (alunoId) await removerAlunoEDados(tokenAdmin, alunoId);
      });

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
        expect(resposta.body).to.have.property('id').that.is.a('string');
        expect(resposta.body).to.include({
          nome: aluno.nome,
          email: aluno.email,
          matricula: aluno.matricula,
          role: 'aluno',
        });
        expect(resposta.body).to.not.have.property('senha');

        alunoId = resposta.body.id;
      });

      it('deve matricular o aluno na disciplina', async () => {
        const resposta = await request(app)
          .post(`/api/admin/disciplinas/${dados.disciplinaId}/matriculas`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({ alunoId });

        expect(resposta.status).to.equal(201);
        expect(resposta.body).to.include({ alunoId, disciplinaId: dados.disciplinaId });
      });

      it('deve logar como o aluno cadastrado', async () => {
        const resposta = await loginAluno(aluno.email, aluno.senha);

        expect(resposta.status).to.equal(200);
        expect(resposta.body).to.have.property('token');
        expect(resposta.body.usuario).to.include({ id: alunoId, role: 'aluno' });

        tokenAluno = resposta.body.token;
      });

      it('deve registrar a entrega do trabalho como aluno', async () => {
        const antes = Date.now();
        const resposta = await request(app)
          .post(`/api/alunos/${alunoId}/trabalhos`)
          .set('Authorization', `Bearer ${tokenAluno}`)
          .send({ disciplinaId: dados.disciplinaId, ...dados.trabalho });

        expect(resposta.status).to.equal(201);
        expect(resposta.headers['content-type']).to.include('application/json');

        // Contrato: campos, valores e tipos da resposta
        expect(resposta.body).to.include.all.keys('id', 'alunoId', 'disciplinaId', 'titulo', 'descricao', 'status', 'nota', 'feedback', 'dataEntrega');
        expect(resposta.body).to.include({
          alunoId,
          disciplinaId: dados.disciplinaId,
          titulo: dados.trabalho.titulo,
          descricao: dados.trabalho.descricao,
          status: 'entregue',
          nota: null,
          feedback: null,
        });
        expect(resposta.body.id).to.be.a('string').and.not.empty;
        expect(Date.parse(resposta.body.dataEntrega)).to.be.within(antes - 5000, Date.now() + 5000);

        trabalhoEntregue = resposta.body;
      });

      it('deve exibir a entrega na lista de trabalhos do aluno', async () => {
        const resposta = await request(app)
          .get(`/api/alunos/${alunoId}/trabalhos`)
          .set('Authorization', `Bearer ${tokenAluno}`);

        expect(resposta.status).to.equal(200);
        expect(resposta.body).to.have.lengthOf(1);
        expect(resposta.body[0]).to.deep.equal(trabalhoEntregue);
      });

      it('deve mostrar ao admin os mesmos dados da entrega', async () => {
        const resposta = await request(app)
          .get(`/api/admin/trabalhos/${trabalhoEntregue.id}`)
          .set('Authorization', `Bearer ${tokenAdmin}`);

        expect(resposta.status).to.equal(200);
        expect(resposta.body).to.deep.equal(trabalhoEntregue);
      });
    });
  });
});
