import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { tokenAdmin } from './helpers/auth.helper.js';
import { carregarFixture, criarAlunoMatriculado, removerAlunoEDados } from './helpers/dados.helper.js';

const dados = carregarFixture('correcao-trabalho.json');

describe('Correção do trabalho entregue (admin)', () => {
  let admin;
  let aluno;
  let trabalhoId;

  const corrigir = (corpo) =>
    request(app)
      .put(`/api/admin/trabalhos/${trabalhoId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send(corpo);

  before(async () => {
    admin = await tokenAdmin();
    aluno = await criarAlunoMatriculado(admin, dados.aluno, dados.disciplinaId);

    const entrega = await request(app)
      .post(`/api/alunos/${aluno.id}/trabalhos`)
      .set('Authorization', `Bearer ${aluno.token}`)
      .send({ disciplinaId: dados.disciplinaId, ...dados.trabalho });
    trabalhoId = entrega.body.id;
  });

  after(async () => {
    await removerAlunoEDados(admin, aluno.id);
  });

  describe('Análise de valor limite da nota (0 a 10)', () => {
    dados.notas.forEach((caso) => {
      it(`deve retornar ${caso.statusEsperado} para nota ${JSON.stringify(caso.valor)} (${caso.classe})`, async () => {
        const resposta = await corrigir({ nota: caso.valor });

        expect(resposta.status).to.equal(caso.statusEsperado);
        if (caso.statusEsperado === 200) {
          expect(resposta.body.nota).to.equal(caso.valor);
        } else {
          expect(resposta.body).to.deep.equal({ error: dados.erroNota });
        }
      });
    });

    it('não deve gravar a nota quando ela for rejeitada', async () => {
      await corrigir({ nota: 5 });
      await corrigir({ nota: 10.01 });

      const resposta = await request(app)
        .get(`/api/admin/trabalhos/${trabalhoId}`)
        .set('Authorization', `Bearer ${admin}`);
      expect(resposta.body.nota).to.equal(5);
    });
  });

  describe('Status do trabalho', () => {
    dados.statusInvalidos.forEach((caso) => {
      it(`deve retornar 400 para status ${JSON.stringify(caso.valor)} (${caso.classe})`, async () => {
        const resposta = await corrigir({ status: caso.valor });

        expect(resposta.status).to.equal(400);
        expect(resposta.body).to.deep.equal({ error: dados.erroStatus });
      });
    });

    it('deve retornar 404 ao corrigir um trabalho que não existe', async () => {
      const resposta = await request(app)
        .put('/api/admin/trabalhos/trabalho-inexistente')
        .set('Authorization', `Bearer ${admin}`)
        .send({ status: 'corrigido' });

      expect(resposta.status).to.equal(404);
      expect(resposta.body.error).to.equal('Trabalho com id "trabalho-inexistente" não encontrado.');
    });
  });

  describe('Transição de estado: entregue → em_correcao → corrigido', () => {
    before(async () => {
      // estado inicial controlado para a sequência
      await corrigir({ status: 'entregue', nota: null, feedback: null });
    });

    dados.transicoes.forEach((passo) => {
      it(`deve mudar o status para "${passo.status}"`, async () => {
        const resposta = await corrigir(passo);

        expect(resposta.status).to.equal(200);
        expect(resposta.body).to.include(passo);
      });
    });

    it('o aluno deve ver a nota e o feedback na própria lista de trabalhos', async () => {
      const final = dados.transicoes.at(-1);
      const resposta = await request(app)
        .get(`/api/alunos/${aluno.id}/trabalhos`)
        .set('Authorization', `Bearer ${aluno.token}`);

      const trabalho = resposta.body.find((t) => t.id === trabalhoId);
      expect(trabalho).to.include({ status: final.status, nota: final.nota, feedback: final.feedback });
    });
  });

  // Filtros isolados e combinados (A, A+B, A+C, A+B+C e ordem invertida).
  // Combinação sem resultado deve trazer lista vazia, nunca erro.
  describe('Filtros da listagem de trabalhos (admin)', () => {
    dados.filtros.forEach((filtro) => {
      it(`deve retornar ${filtro.quantidade} trabalho(s) filtrando por ${filtro.descricao}`, async () => {
        const query = JSON.parse(JSON.stringify(filtro.query).replace('{alunoId}', aluno.id));
        const resposta = await request(app)
          .get('/api/admin/trabalhos')
          .query(query)
          .set('Authorization', `Bearer ${admin}`);

        expect(resposta.status).to.equal(200);
        expect(resposta.body).to.be.an('array').with.lengthOf(filtro.quantidade);
        resposta.body.forEach((trabalho) => expect(trabalho).to.include(query));
      });
    });
  });
});
