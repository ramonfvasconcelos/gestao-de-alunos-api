import request from 'supertest';
import app from '../../src/app.js';

/**
 * Faz login na API e devolve a resposta completa do Supertest
 * (status, body com token e dados do usuário).
 */
export async function login(email, senha) {
  return request(app).post('/api/auth/login').send({ email, senha });
}

/**
 * Login do administrador pré-cadastrado.
 * As credenciais vêm do arquivo .env (ADMIN_EMAIL e ADMIN_SENHA).
 */
export async function loginAdmin() {
  return login(process.env.ADMIN_EMAIL, process.env.ADMIN_SENHA);
}

/**
 * Login de um aluno com o e-mail e a senha informados.
 */
export async function loginAluno(email, senha) {
  return login(email, senha);
}
