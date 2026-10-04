import request from 'supertest';
import jwt from 'jsonwebtoken';
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

/**
 * Atalho para quando o teste só precisa do token do admin (setup),
 * e não está validando o login em si.
 */
export async function tokenAdmin() {
  const resposta = await loginAdmin();
  if (resposta.status !== 200) {
    throw new Error(`Setup falhou: login do admin retornou ${resposta.status}`);
  }
  return resposta.body.token;
}

/**
 * Gera um token assinado com o JWT_SECRET do .env, mas já expirado.
 * Serve para testar a rejeição de sessões vencidas sem esperar 8 horas.
 */
export function gerarTokenExpirado(usuarioId, role) {
  return jwt.sign({ sub: usuarioId, role, nome: 'Token expirado' }, process.env.JWT_SECRET, {
    expiresIn: -60,
  });
}
