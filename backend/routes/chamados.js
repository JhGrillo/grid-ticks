


import express from 'express';
import Chamado from '../models/Chamado.js';
import { STATUS } from '../models/status.js';
import { criarChamado, atualizarOrdem } from '../services/chamadoService.js';

const router = express.Router();

// Listar chamados bloqueados por usuário, área e carteira
router.get('/bloqueados', async (req, res) => {
  try {
    const { email, area, carteira } = req.query;
    if (!email || !area || !carteira) {
      return res.status(400).json({ error: 'Informe email, área e carteira.' });
    }
    const chamados = await Chamado.find({
      email,
      area,
      carteira,
      bloqueado: true,
      status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] }
    }).sort({ ordemExecucao: 1, createdAt: 1 });
    res.json(chamados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



import { MESSAGES } from '../constants/messages.js';

// Criar chamado (usa service)
router.post('/', async (req, res) => {
  try {
    const resultado = await criarChamado(req.body);
    if (resultado.error) return res.status(400).json({ error: resultado.error });
    if (resultado.bloqueio === 'usuario') {
      return res.status(201).json({
        chamado: resultado.chamado,
        bloqueio: 'usuario',
        mensagem: MESSAGES.MSG_BLOQUEIO_USUARIO,
        chamados: resultado.chamados
      });
    }
    if (resultado.bloqueio === 'gestor') {
      return res.status(201).json({
        chamado: resultado.chamado,
        bloqueio: 'gestor',
        mensagem: MESSAGES.MSG_BLOQUEIO_GESTOR(req.body.area, req.body.carteira),
        chamados: resultado.chamados
      });
    }
    return res.status(201).json(resultado.chamado);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Listar todos os chamados
router.get('/', async (req, res) => {
  try {
    const chamados = await Chamado.find().sort({ createdAt: -1 });
    res.json(chamados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Consultar chamado por ID ou todos de um email
router.get('/:idOrEmail', async (req, res) => {
  try {
    const param = req.params.idOrEmail;
    // Se for um ObjectId válido, busca por ID
    if (/^[0-9a-fA-F]{24}$/.test(param)) {
      const chamado = await Chamado.findById(param);
      if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });
      // Prioridade pessoal: ordemExecucao
      const prioridadePessoal = chamado.ordemExecucao;
      // Prioridade gestão: só considera chamados de outros usuários
      const gestorChamados = await Chamado.find({
        area: chamado.area,
        carteira: chamado.carteira,
        prioridade: chamado.prioridade,
        status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] },
        email: { $ne: chamado.email }
      });
      let prioridadeGestao = false;
      let ordemGestao = null;
      if (gestorChamados.length > 0) {
        prioridadeGestao = true;
        // Só considera ordemGestao se chamado do gestor estiver desbloqueado e ordemExecucao definida manualmente
        const ordensGestao = gestorChamados
          .filter(c => c.bloqueado === false && c.ordemExecucao !== undefined && c.ordemExecucao !== null && c.ordemExecucao !== 1)
          .map(c => c.ordemExecucao);
        if (ordensGestao.length > 0) {
          ordemGestao = Math.min(...ordensGestao);
        }
      }
      return res.json({
        ...chamado.toObject(),
        bloqueado: chamado.bloqueado,
        prioridadePessoal,
        prioridadeGestao,
        ordemGestao
      });
    }
    // Se não for ID, busca todos daquele email
  const chamados = await Chamado.find({ email: param }).sort({ createdAt: -1 });
    if (!chamados.length) return res.status(404).json({ error: 'Nenhum chamado encontrado para este email' });
    // Para cada chamado, calcula os campos extras
    const chamadosDetalhados = await Promise.all(chamados.map(async chamado => {
      const prioridadePessoal = chamado.ordemExecucao;
      const gestorChamados = await Chamado.find({
        area: chamado.area,
        carteira: chamado.carteira,
        prioridade: chamado.prioridade,
        status: { $in: [STATUS.ABERTO, STATUS.NA_FILA] },
        email: { $ne: chamado.email }
      });
      let prioridadeGestao = false;
      let ordemGestao = null;
      if (gestorChamados.length > 0) {
        prioridadeGestao = true;
        // Só considera ordemGestao se chamado do gestor estiver desbloqueado e ordemExecucao definida manualmente
        const ordensGestao = gestorChamados
          .filter(c => c.bloqueado === false && c.ordemExecucao !== undefined && c.ordemExecucao !== null && c.ordemExecucao !== 1)
          .map(c => c.ordemExecucao);
        if (ordensGestao.length > 0) {
          ordemGestao = Math.min(...ordensGestao);
        }
      }
      return {
        ...chamado.toObject(),
        bloqueado: chamado.bloqueado,
        prioridadePessoal,
        prioridadeGestao,
        ordemGestao
      };
    }));
    return res.json(chamadosDetalhados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Atualizar ordem de execução dos chamados
router.patch('/ordem', async (req, res) => {
  try {
    const { ordens } = req.body;
    const resultado = await atualizarOrdem(ordens);
    if (resultado.error) return res.status(400).json({ error: resultado.error });
    return res.json(resultado);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Atualizar parcialmente um chamado (titulo, descricao, responsavel, prazo, prioridade, carteira, segmentacao, observacoes)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
  const permitido = ['titulo', 'descricao', 'responsavel', 'prazo', 'prioridade', 'carteira', 'segmentacao', 'observacoes', 'atualizacoes', 'avatar', 'status'];
    const updates = {};
    for (const k of permitido) {
      if (k in req.body) updates[k] = req.body[k];
    }
    console.log('[PATCH /api/chamados/:id] id:', id, 'body:', req.body, 'updates:', updates);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo permitido enviado.' });
    }
    const chamado = await Chamado.findByIdAndUpdate(id, updates, { new: true });
    if (!chamado) {
      console.log('[PATCH /api/chamados/:id] chamado não encontrado:', id);
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }
    console.log('[PATCH /api/chamados/:id] chamado atualizado:', chamado);
    return res.json(chamado);
  } catch (err) {
    console.error('[PATCH /api/chamados/:id] erro:', err);
    return res.status(400).json({ error: err.message });
  }
});

// Alterar status de um chamado (e opcionalmente registrar atualização)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, mensagem } = req.body;
    if (!status) return res.status(400).json({ error: 'Status é obrigatório.' });
    if (!Object.values(STATUS).includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }
    const chamado = await Chamado.findById(id);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });
    chamado.status = status;
    if (mensagem) {
      chamado.atualizacoes = chamado.atualizacoes || [];
      chamado.atualizacoes.push(mensagem);
    }
    // Se finalizado remove bloqueio
    if (status === STATUS.FINALIZADO) {
      chamado.bloqueado = false;
      chamado.motivoBloqueio = '';
    }
    await chamado.save();
    return res.json(chamado);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Adicionar atualização textual ao chamado
router.post('/:id/atualizacoes', async (req, res) => {
  try {
    const { id } = req.params;
    const { texto } = req.body;
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'Texto da atualização é obrigatório.' });
    const chamado = await Chamado.findById(id);
    if (!chamado) return res.status(404).json({ error: 'Chamado não encontrado' });
    chamado.atualizacoes = chamado.atualizacoes || [];
    chamado.atualizacoes.push(texto.trim());
    await chamado.save();
    return res.json(chamado);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
