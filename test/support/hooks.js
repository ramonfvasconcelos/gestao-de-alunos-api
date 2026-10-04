import mongoose from 'mongoose';

// Root hooks: rodam uma única vez para toda a suíte, depois de todos os arquivos de teste.
// Fechar a conexão aqui (e não dentro de um arquivo de teste) evita que um arquivo
// derrube o banco enquanto outro ainda está rodando.
export const mochaHooks = {
  async afterAll() {
    await mongoose.connection.close();
  },
};
