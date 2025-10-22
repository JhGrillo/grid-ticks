
import Chamado from '../models/Chamado.js';
import { STATUS } from '../models/status.js';
import { isValidEmail, isFutureDate } from '../utils/validation.js';
import { MESSAGES } from '../constants/messages.js';


export async function criarChamado(dados) {
  const { email, prazo, area, carteira, prioridade } = dados;
  if (!isValidEmail(email)) {
    return { error: MESSAGES.EMAIL_INVALIDO };
  }
  if (!isFutureDate(prazo)) {
    return { error: MESSAGES.PRAZO_INVALIDO };
  }
  const chamado = await Chamado.create({ ...dados, bloqueado: false, status: STATUS.ABERTO });


  // Conflito usuário (mesma prioridade)
  const conflitosPrioridade = await Chamado.find({
    email,
    area,
    carteira,
    prioridade,
    status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] }
  });
  if (conflitosPrioridade.length > 1) {
    const grupo = await Chamado.find({ email, area, carteira, status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] } });
    await Promise.all(grupo.map(async c => {
      c.bloqueado = true;
      c.motivoBloqueio = MESSAGES.CONFLITO_USUARIO;
      await c.save();
    }));
    return { chamado, bloqueio: 'usuario', chamados: grupo };
  }

  // Conflito gestor (ignorar para área 'Operação')
  if (area !== 'Operação') {
    const gestorTrigger = await Chamado.find({ area, carteira, prioridade, status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] } });
    if (gestorTrigger.length > 1 && gestorTrigger.some(c => c.email !== email)) {
      const todosAreaCarteira = await Chamado.find({ area, carteira, status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] } }).sort({ createdAt: 1 });
      await Promise.all(todosAreaCarteira.map(async c => {
        c.bloqueado = true;
        c.motivoBloqueio = MESSAGES.CONFLITO_GESTOR;
        await c.save();
      }));
      return { chamado, bloqueio: 'gestor', chamados: todosAreaCarteira };
    }
  }

  return { chamado };
}


export async function atualizarOrdem(ordens) {
  if (!Array.isArray(ordens) || ordens.length === 0) {
    return { error: 'Envie um array de ordens.' };
  }
  const ordensSet = new Set();
  for (const { ordemExecucao } of ordens) {
    if (ordensSet.has(ordemExecucao)) {
      return { error: 'Não é permitido definir a mesma ordem para mais de um chamado.' };
    }
    ordensSet.add(ordemExecucao);
  }
  const updates = await Promise.all(ordens.map(async ({ id, ordemExecucao }) => {
    const chamado = await Chamado.findById(id);
    if (!chamado) return null;
    chamado.ordemExecucao = ordemExecucao;
    if (ordemExecucao !== undefined && ordemExecucao !== null) {
      chamado.bloqueado = false;
      chamado.motivoBloqueio = '';
    }
    await chamado.save();
    return chamado;
  }));
  const atualizados = updates.filter(c => c);
  if (atualizados.length === 0) return { atualizados: [] };
  const { area, carteira, prioridade } = atualizados[0];
  // Busca todos do grupo
  const grupo = await Chamado.find({ area, carteira, prioridade, status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] } });
  // Se houver duplicidade de ordemExecucao entre usuários diferentes, mantém bloqueio
  const ordensGrupo = grupo.map(c => c.ordemExecucao);
  const temDuplicados = new Set(ordensGrupo).size !== ordensGrupo.length;
  if (temDuplicados) {
    await Promise.all(grupo.map(async c => {
      c.bloqueado = true;
      c.motivoBloqueio = MESSAGES.CONFLITO_GESTOR;
      await c.save();
    }));
    return { atualizados, bloqueio: 'gestor', chamados: grupo };
  } else {
    // Se não há duplicidade, desbloqueia todos
    await Promise.all(grupo.map(async c => {
      c.bloqueado = false;
      c.motivoBloqueio = '';
      await c.save();
    }));
    return { atualizados, desbloqueados: true, chamados: grupo };
  }
}
