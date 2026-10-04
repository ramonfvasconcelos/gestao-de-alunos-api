import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { tokenAdmin } from './helpers/auth.helper.js';
import { carregarFixture, gerarAlunoUnico, itOuPendente, removerAlunoEDados } from './helpers/dados.helper.js';

const dados = carregarFixture('cadastro-aluno.json');

describe('POST /api/admin/alunos - validação do cadastro', () => {
  let admin;
  const criados = [];

  const cadastrar = (aluno) =>
    request(app).post('/api/admin/alunos').set('Authorization', `Bearer ${admin}`).send(aluno);

  before(async () => {
    admin = await tokenAdmin();
  });

  after(async () => {
    for (const id of criados) await removerAlunoEDados(admin, id);
  });

  // Data-Driven: cada campo obrigatório ausente e só com string vazia
  dados.camposObrigatorios.forEach((campo) => {
    it(`deve retornar 400 quando o campo "${campo}" não for informado`, async () => {
      const { [campo]: _removido, ...semCampo } = gerarAlunoUnico(dados.alunoValido);
      const resposta = await cadastrar(semCampo);

      expect(resposta.status).to.equal(400);
      expect(resposta.body).to.deep.equal({ error: dados.erroObrigatorios });
    });

    it(`deve retornar 400 quando o campo "${campo}" vier vazio`, async () => {
      const resposta = await cadastrar({ ...gerarAlunoUnico(dados.alunoValido), [campo]: '' });

      expect(resposta.status).to.equal(400);
      expect(resposta.body).to.deep.equal({ error: dados.erroObrigatorios });
    });
  });

  describe('Duplicidade', () => {
    let existente;

    before(async () => {
      existente = gerarAlunoUnico(dados.alunoValido);
      const resposta = await cadastrar(existente);
      criados.push(resposta.body.id);
    });

    it('deve retornar 409 quando o e-mail já estiver cadastrado', async () => {
      const novo = gerarAlunoUnico(dados.alunoValido);
      const resposta = await cadastrar({ ...novo, email: existente.email });

      expect(resposta.status).to.equal(409);
      expect(resposta.body).to.deep.equal({ error: dados.erroDuplicado });
    });

    it('deve retornar 409 quando a matrícula já estiver cadastrada', async () => {
      const novo = gerarAlunoUnico(dados.alunoValido);
      const resposta = await cadastrar({ ...novo, matricula: existente.matricula });

      expect(resposta.status).to.equal(409);
      expect(resposta.body).to.deep.equal({ error: dados.erroDuplicado });
    });

    it.skip('[BUG-05] deve retornar 409 quando o e-mail já existir com letras maiúsculas', async () => {
      const novo = gerarAlunoUnico(dados.alunoValido);
      const resposta = await cadastrar({ ...novo, email: existente.email.toUpperCase() });
      if (resposta.body.id) criados.push(resposta.body.id);

      expect(resposta.status).to.equal(409);
    });
  });

  describe('Formato dos campos', () => {
    dados.invalidos.forEach((caso) => {
      const titulo = `${caso.bugConhecido ? `[${caso.bugConhecido}] ` : ''}deve retornar ${caso.statusEsperado} quando ${caso.descricao}`;

      itOuPendente(caso)(titulo, async () => {
        const resposta = await cadastrar({ ...gerarAlunoUnico(dados.alunoValido), ...caso.alteracao });
        if (resposta.body.id) criados.push(resposta.body.id);

        expect(resposta.status).to.equal(caso.statusEsperado);
      });
    });
  });
});
