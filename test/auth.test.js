import { expect } from 'chai';
import { login, loginAdmin } from './helpers/auth.helper.js';

describe('POST /api/auth/login', () => {
  it('deve retornar 200 e um token quando o admin informar e-mail e senha corretos', async () => {
    const resposta = await loginAdmin();

    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.have.property('token');
  });

  it('deve retornar 401 quando a senha informada for inválida', async () => {
    const resposta = await login(process.env.ADMIN_EMAIL, 'senha-incorreta');

    expect(resposta.status).to.equal(401);
    expect(resposta.body.error).to.equal('E-mail ou senha inválidos.');
  });
});
