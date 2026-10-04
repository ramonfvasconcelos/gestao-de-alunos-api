import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';

describe('Rotas gerais e formato dos erros', () => {
  it('GET / deve apresentar a API e apontar para a documentação', async () => {
    const resposta = await request(app).get('/');

    expect(resposta.status).to.equal(200);
    expect(resposta.body).to.include({ nome: 'Gestão de Alunos API', documentacao: '/api-docs' });
  });

  it('deve retornar 404 em JSON para uma rota que não existe', async () => {
    const resposta = await request(app).get('/api/rota-que-nao-existe');

    expect(resposta.status).to.equal(404);
    expect(resposta.headers['content-type']).to.include('application/json');
    expect(resposta.body).to.deep.equal({ error: 'Rota não encontrada: GET /api/rota-que-nao-existe' });
  });

  it('não deve expor detalhes internos (stack trace) nas respostas de erro', async () => {
    const resposta = await request(app).post('/api/auth/login').send({});

    expect(resposta.status).to.equal(400);
    expect(Object.keys(resposta.body)).to.deep.equal(['error']);
    expect(resposta.text).to.not.match(/at .+\.js:\d+/);
  });
});
