// Serviço para finalizar automaticamente chamados em validação após 24h, exceto sexta/sábado/domingo
import Chamado from '../models/Chamado.js';
import { STATUS } from '../models/status.js';

function getNextMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  // 1 = segunda, 5 = sexta, 6 = sábado, 0 = domingo
  if (day === 5) { // sexta
    d.setDate(d.getDate() + 3); // até segunda
  } else if (day === 6) { // sábado
    d.setDate(d.getDate() + 2); // até segunda
  } else if (day === 0) { // domingo
    d.setDate(d.getDate() + 1); // até segunda
  }
  return d;
}

function getValidationDeadline(dataValidacao) {
  const d = new Date(dataValidacao);
  const day = d.getDay();
  if (day === 5 || day === 6 || day === 0) {
    // Se sexta/sábado/domingo, deadline é próxima segunda no mesmo horário
    const segunda = getNextMonday(d);
    segunda.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    return segunda;
  }
  // Caso normal: 24h depois
  return new Date(d.getTime() + 24 * 60 * 60 * 1000);
}

export async function autoFinalizeChamadosEmValidacao() {
  // Busca chamados em validação
  const agora = new Date();
  const chamados = await Chamado.find({ status: STATUS.EM_VALIDACAO });
  for (const chamado of chamados) {
    // Busca a última atualização para "Em validação"
    const atualizacao = (chamado.atualizacoes || []).reverse().find(a => typeof a === 'string' && a.toLowerCase().includes('em validação'));
    if (!atualizacao) continue;
    // Extrai data/hora da atualização
    const match = atualizacao.match(/\[(\d{2}\/\d{2}\/\d{4}),? (\d{2}:\d{2}:\d{2})/);
    if (!match) continue;
    const [_, data, hora] = match;
    const dataValidacao = new Date(data.split('/').reverse().join('-') + 'T' + hora);
    const deadline = getValidationDeadline(dataValidacao);
    if (agora > deadline) {
      chamado.status = STATUS.FINALIZADO;
      chamado.atualizacoes.push(`[${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}] Finalizado automaticamente por falta de validação.`);
      await chamado.save();
    }
  }
}
