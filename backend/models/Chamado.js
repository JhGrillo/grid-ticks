import mongoose from 'mongoose';
import { STATUS, STATUS_ENUM } from './status.js';

const chamadoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  email: { type: String, required: true },
  area: { 
    type: String, 
    required: true,
    enum: ['Planejamento', 'ControlDesk', 'Monitoria', 'Projetos', 'Sustentação', 'TI', 'Operação', 'Qualidade']
  },
  prazo: { type: Date, required: true },
  prioridade: { 
    type: String, 
    required: true,
    enum: ['Baixa', 'Média', 'Alta']
  },
  carteira: {
    type: String,
    required: true,
    enum: ['Bradesco', 'BV']
  },
  segmentacao: {
    type: String,
    required: true
  },
  descricao: { type: String, required: true },
  status: { type: String, enum: STATUS_ENUM, default: STATUS.ABERTO },
  ordemExecucao: { type: Number, default: 1 },
  bloqueado: { type: Boolean, default: false },
  motivoBloqueio: { type: String },
  // Campos adicionais para acompanhamento / Kanban
  responsavel: { type: String }, // poderá ser preenchido quando atribuído
  observacoes: { type: [String], default: [] },
  atualizacoes: { type: [String], default: [] },
  avatar: { type: String },

}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Índice composto para buscas frequentes (usuário)
chamadoSchema.index({ email: 1, area: 1, carteira: 1, prioridade: 1, status: 1 });
// Índice composto para bloqueio gestor
chamadoSchema.index({ area: 1, carteira: 1, status: 1 });
// Índice parcial para ordemExecucao (apenas chamados abertos ou na fila)
chamadoSchema.index(
  { area: 1, carteira: 1, ordemExecucao: 1 },
  { partialFilterExpression: { status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] } } }
);

export default mongoose.model('Chamado', chamadoSchema);
