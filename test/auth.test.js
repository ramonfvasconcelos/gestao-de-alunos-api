import request from 'supertest';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import app from '../src/app.js';
import { login, loginAdmin, gerarTokenExpirado } from './helpers/auth.helper.js';
import { carregarFixture } from './helpers/dados.helper.js';

const { login: casosLogin, tokens: casosToken } = carregarFixture('autenticacao.json');

describe('Autenticação', () => {
  describe('POST /api/auth/login', () => {
    it('deve retornar 200 e um token quando o admin informar e-mail e senha corretos', async () => {
      const resposta = await loginAdmin();

      expect(resposta.status).to.equal(200);
      expect(resposta.body).to.have.property('token').that.is.a('string').and.is.not.empty;
      expect(resposta.body.usuario).to.include({ email: process.env.ADMIN_EMAIL, role: 'admin' });
      expect(resposta.body.usuario).to.not.have.property('senha');
    });

    it('deve emitir um token JWT com o id e o papel do usuário', async () => {
      const resposta = await loginAdmin();
      const payload = jwt.verify(resposta.body.token, process.env.JWT_SECRET);

      expect(payload.sub).to.equal(resposta.body.usuario.id);
      expect(payload.role).to.equal('admin');
      expect(payload.exp).to.be.greaterThan(Math.floor(Date.now() / 1000));
    });

    // Data-Driven: particionamento de equivalência das credenciais
    casosLogin.forEach((caso) => {
      it(`deve retornar ${caso.statusEsperado} quando ${caso.descricao}`, async () => {
        const resposta = await request(app).post('/api/auth/login').send(caso.corpo);

        expect(resposta.status).to.equal(caso.statusEsperado);
        expect(resposta.body).to.deep.equal({ error: caso.erroEsperado });
      });
    });

    it('deve dar a mesma mensagem para usuário inexistente e senha errada (não revela quem existe)', async () => {
      const inexistente = await login('ninguem@escola.com', 'qualquer');
      const senhaErrada = await login(process.env.ADMIN_EMAIL, 'qualquer');

      expect(inexistente.body.error).to.equal(senhaErrada.body.error);
    });
  });

  describe('Token nas rotas protegidas', () => {
    let tokens;

    before(async () => {
      const resposta = await loginAdmin();
      tokens = {
        token: resposta.body.token,
        tokenExpirado: gerarTokenExpirado(resposta.body.usuario.id, 'admin'),
        tokenOutroSegredo: jwt.sign({ sub: resposta.body.usuario.id, role: 'admin' }, 'segredo-que-nao-e-o-da-api'),
      };
    });

    it('deve aceitar um token válido', async () => {
      const resposta = await request(app)
        .get('/api/admin/alunos')
        .set('Authorization', `Bearer ${tokens.token}`);

      expect(resposta.status).to.equal(200);
      expect(resposta.body).to.be.an('array');
    });

    // Data-Driven: variações inválidas do cabeçalho Authorization
    casosToken.forEach((caso) => {
      it(`deve retornar ${caso.statusEsperado} quando ${caso.descricao}`, async () => {
        const requisicao = request(app).get('/api/admin/alunos');
        if (caso.authorization !== null) {
          requisicao.set('Authorization', caso.authorization.replace(/\{(\w+)\}/g, (_, chave) => tokens[chave]));
        }
        const resposta = await requisicao;

        expect(resposta.status).to.equal(caso.statusEsperado);
        expect(resposta.body).to.deep.equal({ error: caso.erroEsperado });
      });
    });
  });
});
