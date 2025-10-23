import dotenv from 'dotenv';
// Carrega variáveis de ambiente uma única vez
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não definida. Configure a variável de ambiente.');
  process.exit(1);
}
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import chamadosRouter from './routes/chamados.js';
import usersRouter from './routes/users.js';
import { autoFinalizeChamadosEmValidacao } from './services/autoFinalizeValidation.js';
// Rota /login antiga dependia de controller inexistente. Se necessário futuramente, integrar em usersRouter.

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/chamados', chamadosRouter);
app.use('/api/users', usersRouter);

// Conexão com MongoDB Atlas
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI não definida. Configure a variável de ambiente.');
  process.exit(1);
}

// Print presence of env vars (sem imprimir valores) — útil para logs na plataforma
console.log('ENV check - MONGO_URI present:', !!process.env.MONGO_URI);
console.log('ENV check - JWT_SECRET present:', !!process.env.JWT_SECRET);

// Mais logs do mongoose para diagnosticar no Railway
mongoose.connection.on('connecting', () => console.log('Mongoose: connecting...'));
mongoose.connection.on('connected', () => console.log('Mongoose: connected'));
mongoose.connection.on('reconnected', () => console.log('Mongoose: reconnected'));
mongoose.connection.on('disconnected', () => console.log('Mongoose: disconnected'));
mongoose.connection.on('error', (err) => console.error('Mongoose: connection error:', err && err.message ? err.message : err));

// Adiciona serverSelectionTimeoutMS para falhar mais rapidamente em caso de problemas de rede/DNS
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10s
})
.then(() => {
  console.log('MongoDB Atlas conectado!');
  const server = app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  // Health endpoint para plataformas como Railway
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

  // Graceful shutdown: fecha servidor e conexão com mongoose
  const shutdown = async (signal) => {
    console.log(`Recebido ${signal}. Fechando servidor...`);
    try {
      await mongoose.disconnect();
      server.close(() => {
        console.log('Servidor finalizado.');
        process.exit(0);
      });
      // Caso não finalize em 10s, forçar
      setTimeout(() => {
        console.error('Falha ao fechar a tempo, forçando saída.');
        process.exit(1);
      }, 10000).unref();
    } catch (err) {
      console.error('Erro durante shutdown:', err);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  // Agendamento: roda a cada 10 minutos
  setInterval(() => {
    autoFinalizeChamadosEmValidacao().catch(err => console.error('Erro no autoFinalize:', err));
  }, 10 * 60 * 1000);
})
.catch((err) => {
  console.error('Erro ao conectar no MongoDB:', err && err.message ? err.message : err);
  // Em ambiente de produção é melhor falhar rápido para ver o erro nos logs da plataforma
  process.exit(1);
});
