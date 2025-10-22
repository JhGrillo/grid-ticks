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

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Atlas conectado!');
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  // Agendamento: roda a cada 10 minutos
  setInterval(() => {
    autoFinalizeChamadosEmValidacao().catch(err => console.error('Erro no autoFinalize:', err));
  }, 10 * 60 * 1000);
})
.catch((err) => console.error('Erro ao conectar no MongoDB:', err));
