// Carrega as variáveis do arquivo .env ANTES de qualquer teste importar a API,
// pois a conexão com o MongoDB lê process.env.MONGODB_URI no momento do import.
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
