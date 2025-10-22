export const MESSAGES = {
  EMAIL_INVALIDO: 'Email inválido.',
  PRAZO_INVALIDO: 'O prazo deve ser uma data futura.',
  CONFLITO_USUARIO: 'Conflito de prioridade: defina a ordem de execução.',
  CONFLITO_GESTOR: 'Conflito de prioridade no nível gestor. Aguarde definição do gestor.',
  MSG_BLOQUEIO_USUARIO: 'Conflito de prioridade detectado. Defina a ordem de execução para liberar os chamados.',
  MSG_BLOQUEIO_GESTOR: (area, carteira) => `Chamado aberto com sucesso! Todos os chamados em Aberto ou Na Fila na área "${area}" e carteira "${carteira}" estão bloqueados até que o gestor defina a priorização geral.`
};
