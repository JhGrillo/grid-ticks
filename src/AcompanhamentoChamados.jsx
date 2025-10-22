// Toast visual simples
function Toast({ msg, tipo, onClose }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      background: tipo === 'erro' ? 'linear-gradient(90deg,#ff6b6b,#ffb300)' : 'linear-gradient(90deg,#1e4fff,#00e396)',
      color: '#fff',
      fontWeight: 600,
      fontSize: 16,
      padding: '16px 38px',
      borderRadius: 16,
      boxShadow: '0 4px 24px #1e4fff33',
      letterSpacing: '.02em',
      animation: 'toastFadeIn .4s',
      minWidth: 220,
      textAlign: 'center',
      cursor: 'pointer',
    }} onClick={onClose}>
      {msg}
      <style>{`@keyframes toastFadeIn { from { opacity:0; transform:translateY(-18px) scale(.98);} to { opacity:1; transform:translateY(0) scale(1);} }`}</style>
    </div>
  );
}
import {
  Clock,
  List,
  Play,
  UserCircle,
  Check,
  Pencil,
  Info,
  CheckCircle2,
  Search,
  Flag,
  AlertTriangle,
  Lock
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import SidebarModern from './SidebarModern.jsx';
import AnalyticsResumo from './AnalyticsResumo.jsx';
import Gestao from './Gestao.jsx';
import './AcompanhamentoChamados.css';


// Wrapper para padronizar cor/tamanho dos ícones
function Icon({ as: LucideIcon, color = '#b6c6f5', size = 20, title, ...props }) {
  return (
    <LucideIcon color={color} size={size} strokeWidth={1.8} {...props}>
      {title ? <title>{title}</title> : null}
    </LucideIcon>
  );
}
import { listarChamados, atualizarStatus, atualizarChamado } from './api/chamados.js';

// Estrutura inicial vazia para Kanban
const emptyChamados = { pendentes: [], naFila: [], emExecucao: [], emValidacao: [], finalizados: [] };

export default function AcompanhamentoChamados({ usuario, onLogout, initialPagina }) {
  // Toast state
  const [toast, setToast] = useState({ msg: '', tipo: 'sucesso' });
  function showToast(msg, tipo = 'sucesso') {
    setToast({ msg, tipo });
    setTimeout(() => setToast({ msg: '', tipo }), 3500);
  }
  // Estado para busca e filtros
  const [busca, setBusca] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [filtroCarteira, setFiltroCarteira] = useState('');

  // Gera lista única de carteiras para o filtro
  function getCarteirasUnicas() {
    const todas = [];
    Object.values(chamados).forEach(lista => {
      lista.forEach(c => {
        if (c.carteira && !todas.includes(c.carteira)) {
          todas.push(c.carteira);
        }
      });
    });
    return todas.sort((a, b) => a.localeCompare(b));
  }

  // Função para filtrar chamados conforme busca/filtros
  function filtrarChamadosPorBusca(chamadosOrig) {
    const novo = {};
    Object.keys(chamadosOrig).forEach(col => {
      novo[col] = chamadosOrig[col].filter(c => {
        const buscaLower = busca.trim().toLowerCase();
        const matchBusca = !buscaLower ||
          (c.titulo && c.titulo.toLowerCase().includes(buscaLower)) ||
          (c.descricao && c.descricao.toLowerCase().includes(buscaLower)) ||
          (c.responsavel && c.responsavel.toLowerCase().includes(buscaLower)) ||
          (c._id && String(c._id).toLowerCase().includes(buscaLower)) ||
          (c.id && String(c.id).toLowerCase().includes(buscaLower));
        const matchPrioridade = !filtroPrioridade || (c.prioridade && c.prioridade.toLowerCase() === filtroPrioridade.toLowerCase());
        const matchCarteira = !filtroCarteira || (c.carteira && c.carteira.toLowerCase().includes(filtroCarteira.toLowerCase()));
        return matchBusca && matchPrioridade && matchCarteira;
      });
    });
    return novo;
  }
  // Estado para modal de observação obrigatória (agora corretamente dentro do componente)
  const [modalObs, setModalObs] = useState({ aberto: false, chamado: null, acao: null, novoStatus: null });
  const [obsTexto, setObsTexto] = useState('');
  // Função utilitária para normalizar status
  function normalizarStatus(status) {
    return (status || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }

  const [pagina, setPagina] = useState(initialPagina || 'chamados');
  const [chamados, setChamados] = useState(emptyChamados);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [modalChamado, setModalChamado] = useState(null);

  const statusList = [
  { key: 'pendentes', label: 'Pendentes', icon: <Icon as={Clock} color="#f7b731" />, status: 'Pendente' },
  { key: 'naFila', label: 'Na fila', icon: <Icon as={List} color="#1e90ff" />, status: 'Na fila' },
  { key: 'emExecucao', label: 'Em execução', icon: <Icon as={Play} color="#00e396" />, status: 'Em execução' },
  { key: 'emValidacao', label: 'Em validação', icon: <Icon as={Search} color="#ffb300" />, status: 'Em validação' },
  { key: 'finalizados', label: 'Finalizados', icon: <Icon as={CheckCircle2} color="#2ecc71" />, status: 'Finalizado' },
  ];

  const mapear = useCallback((lista) => {
    const agg = { pendentes: [], naFila: [], emExecucao: [], emValidacao: [], finalizados: [] };
    lista.forEach(c => {
      const statusNorm = normalizarStatus(c.status);
      if (statusNorm === 'aberto' || statusNorm === 'pendente') agg.pendentes.push(c);
      else if (statusNorm === 'na fila') agg.naFila.push(c);
      else if (statusNorm === 'em execucao') agg.emExecucao.push(c);
      else if (statusNorm === 'em validacao') agg.emValidacao.push(c);
      else if (statusNorm === 'finalizado' || statusNorm === 'concluido') agg.finalizados.push(c);
      else agg.pendentes.push(c);
    });
    return agg;
  }, []);

  async function mudarStatusChamado(chamado, novoStatus) {
    // Se for para execução ou validação, exige observação
    if (['Em execução', 'Em validação'].includes(novoStatus)) {
      setModalObs({ aberto: true, chamado, acao: 'status', novoStatus });
      setObsTexto('');
      return;
    }
    try {
      await atualizarStatus(chamado._id || chamado.id, novoStatus, `Status alterado para ${novoStatus}`);
      showToast('Status atualizado com sucesso!');
      setChamados(prev => {
        const novo = { ...emptyChamados };
        Object.keys(prev).forEach(col => {
          novo[col] = prev[col].filter(c => (c._id || c.id) !== (chamado._id || chamado.id));
        });
        const atualizado = { ...chamado, status: novoStatus };
        const statusNorm = normalizarStatus(novoStatus);
        if (statusNorm === 'aberto' || statusNorm === 'pendente') novo.pendentes.push(atualizado);
        else if (statusNorm === 'na fila') novo.naFila.push(atualizado);
        else if (statusNorm === 'em execucao') novo.emExecucao.push(atualizado);
        else if (statusNorm === 'em validacao') novo.emValidacao.push(atualizado);
        else if (statusNorm === 'finalizado' || statusNorm === 'concluido') novo.finalizados.push(atualizado);
        else novo.pendentes.push(atualizado);
        return novo;
      });
    } catch (e) {
      setErro('Erro ao atualizar status: ' + e.message);
      showToast('Erro ao atualizar status: ' + e.message, 'erro');
    }
  }

  // Handler para salvar observação obrigatória
  async function salvarObservacaoObrigatoria() {
    if (!obsTexto.trim()) {
      setErro('A observação é obrigatória.');
      showToast('A observação é obrigatória.', 'erro');
      return;
    }
    const { chamado, acao, novoStatus } = modalObs;
    setErro('');
    setModalObs({ aberto: false, chamado: null, acao: null, novoStatus: null });
    setObsTexto('');
    try {
      // Monta nova observação do usuário
      const data = new Date();
      const usuarioNome = usuario && usuario.nome ? usuario.nome : 'Usuário';
      const novaObs = `[${data.toLocaleString()} - ${usuarioNome}] ${obsTexto.trim()}`;
      // Só adiciona em observacoes
      const observacoesAntigas = Array.isArray(chamado.observacoes) ? chamado.observacoes : [];
      const observacoes = [...observacoesAntigas, novaObs];
      await atualizarChamado(chamado._id || chamado.id, { observacoes });
      showToast('Observação salva com sucesso!');
      // Se for mudança de status, faz depois da observação
      if (acao === 'status' && novoStatus) {
        await mudarStatusChamadoDireto(chamado, novoStatus);
      }
      // Se for só edição, recarrega chamados
      if (acao === 'editar') {
        const lista = await listarChamados();
        setChamados(mapear(lista));
      }
    } catch (e) {
      setErro('Erro ao salvar observação: ' + e.message);
      showToast('Erro ao salvar observação: ' + e.message, 'erro');
    }
  }

  // Função auxiliar para mudar status sem abrir modal
  async function mudarStatusChamadoDireto(chamado, novoStatus) {
    try {
      // Monta mensagem de status
      const data = new Date();
      const usuarioNome = usuario && usuario.nome ? usuario.nome : 'Usuário';
      const msg = `[${data.toLocaleString()} - ${usuarioNome}] Status alterado para ${novoStatus}`;
      // Array atual de atualizacoes
      const atualizacoesAntigas = Array.isArray(chamado.atualizacoes) ? chamado.atualizacoes : [];
      const atualizacoes = [...atualizacoesAntigas, msg];
      await atualizarChamado(chamado._id || chamado.id, { status: novoStatus, atualizacoes });
      showToast('Status atualizado com sucesso!');
      setChamados(prev => {
        const novo = { ...emptyChamados };
        Object.keys(prev).forEach(col => {
          novo[col] = prev[col].filter(c => (c._id || c.id) !== (chamado._id || chamado.id));
        });
        const atualizado = { ...chamado, status: novoStatus, atualizacoes };
        const statusNorm = normalizarStatus(novoStatus);
        if (statusNorm === 'aberto' || statusNorm === 'pendente') novo.pendentes.push(atualizado);
        else if (statusNorm === 'na fila') novo.naFila.push(atualizado);
        else if (statusNorm === 'em execucao') novo.emExecucao.push(atualizado);
        else if (statusNorm === 'em validacao') novo.emValidacao.push(atualizado);
        else if (statusNorm === 'finalizado' || statusNorm === 'concluido') novo.finalizados.push(atualizado);
        else novo.pendentes.push(atualizado);
        return novo;
      });
    } catch (e) {
      setErro('Erro ao atualizar status: ' + e.message);
      showToast('Erro ao atualizar status: ' + e.message, 'erro');
    }
  }

  async function atribuirChamado(chamado) {
    if (!usuario || !usuario.nome) {
      setErro('Usuário não identificado para atribuição.');
      showToast('Usuário não identificado para atribuição.', 'erro');
      return;
    }
    try {
      const id = chamado._id || chamado.id;
      // Monta mensagem de atribuição
      const data = new Date();
      const usuarioNome = usuario && usuario.nome ? usuario.nome : 'Usuário';
      const msg = `[${data.toLocaleString()} - ${usuarioNome}] Chamado atribuído para ${usuario.nome}`;
      // Array atual de atualizacoes
      const atualizacoesAntigas = Array.isArray(chamado.atualizacoes) ? chamado.atualizacoes : [];
      const atualizacoes = [...atualizacoesAntigas, msg];
      const payload = { responsavel: usuario.nome, status: 'Na fila', atualizacoes };
  await atualizarChamado(id, payload);
  showToast('Chamado atribuído com sucesso!');
      setChamados(prev => {
        const novo = { ...emptyChamados };
        Object.keys(prev).forEach(col => {
          novo[col] = prev[col].filter(c => (c._id || c.id) !== id);
        });
        const atualizado = { ...chamado, responsavel: usuario.nome, status: 'Na fila', atualizacoes };
        novo.naFila.push(atualizado);
        return novo;
      });
    } catch (e) {
      setErro('Erro ao atribuir: ' + e.message);
      showToast('Erro ao atribuir: ' + e.message, 'erro');
    }
  }

  function prioridadeValor(prioridade) {
    if (!prioridade) return 99;
    const p = prioridade.toLowerCase();
    if (p === 'alta') return 1;
    if (p === 'média' || p === 'media') return 2;
    if (p === 'baixa') return 3;
    return 99;
  }

  function getPrioridadeColor(prioridade) {
    if (prioridade === 'Alta') return '#1e90ff';
    if (prioridade === 'Baixa') return '#4caf50';
    return '#ffb300';
  }

  function getAvatarUrl(nome, avatar) {
    return avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=23243a&color=fff&size=128`;
  }



  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setErro('');
      try {
        const lista = await listarChamados();
        setChamados(mapear(lista));
      } catch (e) {
        setErro('Erro ao carregar chamados: ' + (e.message || e));
        showToast('Erro ao carregar chamados: ' + (e.message || e), 'erro');
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [mapear]);

  return (
    <>
      {/* Toast visual */}
      <Toast msg={toast.msg} tipo={toast.tipo} onClose={() => setToast({ msg: '', tipo: toast.tipo })} />
      <div className="acompanhamento-bg">
        <div className="acompanhamento-sidebar-fixa">
          <SidebarModern usuario={usuario} pagina={pagina} onNavigate={setPagina} />
        </div>
        <main className="acompanhamento-main">
          {pagina === 'analytics' ? (
            <AnalyticsResumo chamados={Object.values(chamados).flat()} />
          ) : pagina === 'gestao' ? (
            <Gestao usuario={usuario} />
          ) : (
            <>
              <h1 className="acompanhamento-titulo">Acompanhamento de chamados</h1>
              {/* Busca e filtros rápidos */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                alignItems: 'center',
                marginBottom: 18,
                marginLeft: 28,
                marginTop: 2
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon as={Search} color="#b6c6f5" />
                  <input
                    type="text"
                    placeholder="Buscar por ID, título, descrição ou responsável..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    style={{
                      background: '#23243a',
                      border: '1px solid #2a3b6b',
                      color: '#e0e6f2',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 15,
                      minWidth: 220,
                      outline: 'none',
                    }}
                  />
                </div>
                <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} style={{ background:'#23243a', color:'#b6c6f5', border:'1px solid #2a3b6b', borderRadius:8, padding:'8px 12px', fontSize:15 }}>
                  <option value="">Prioridade</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
                <select value={filtroCarteira} onChange={e => setFiltroCarteira(e.target.value)} style={{ background:'#23243a', color:'#b6c6f5', border:'1px solid #2a3b6b', borderRadius:8, padding:'8px 12px', fontSize:15, minWidth:160 }}>
                  <option value="">Carteira</option>
                  {getCarteirasUnicas().map(carteira => (
                    <option key={carteira} value={carteira}>{carteira}</option>
                  ))}
                </select>
                <button onClick={() => { setBusca(''); setFiltroPrioridade(''); setFiltroCarteira(''); }}
                  style={{ background:'#23243a', color:'#b6c6f5', border:'1px solid #2a3b6b', borderRadius:8, padding:'8px 18px', fontSize:15, cursor:'pointer', marginLeft:8 }}>
                  Limpar filtros
                </button>
              </div>
              {erro && <div style={{color:'#ff6b6b', marginBottom:12}}>{erro}</div>}
              {loading && <div style={{color:'#b6c6f5', marginBottom:12}}>Carregando...</div>}
              <div className="kanban-columns">
                {statusList.map(col => {
                  const chamadosFiltrados = filtrarChamadosPorBusca(chamados)[col.key];
                  return (
                    <div className="kanban-col" key={col.key}>
                      <div className="kanban-col-header">
                        {col.icon} {col.label}
                      </div>
                      {chamadosFiltrados
                        .slice()
                        .sort((a, b) => {
                          const pA = prioridadeValor(a.prioridade);
                          const pB = prioridadeValor(b.prioridade);
                          if (pA !== pB) return pA - pB;
                          const oA = typeof a.ordemExecucao === 'number' ? a.ordemExecucao : 9999;
                          const oB = typeof b.ordemExecucao === 'number' ? b.ordemExecucao : 9999;
                          return oA - oB;
                        })
                        .map((c, idx) => (
                          <div
                            className={`kanban-card${hoveredCard === (c._id || c.id) ? ' kanban-card-hovered' : ''}`}
                            key={c._id || c.id}
                            onMouseEnter={() => setHoveredCard(c._id || c.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            style={{
                              boxShadow: hoveredCard === (c._id || c.id) ? '0 8px 32px #1e90ff55, 0 2px 12px #1e4fff33' : undefined,
                              background: hoveredCard === (c._id || c.id) ? '#23243aff' : undefined,
                            }}
                          >
                            {/* Título e data */}
                            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                              <span
                                className="kanban-card-title"
                                style={{ fontWeight: 'bold', fontSize: 16, maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={c.titulo}
                              >
                                {c.titulo}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 12, color: '#b6c6f5', marginLeft: 8 }}>{c.prazo ? new Date(c.prazo).toLocaleDateString() : ''}</span>
                              </span>
                            </div>
                            {/* Alerta, carteira e área */}
                            <div style={{ position: 'relative', minHeight: 22 }}>
                              <div style={{ position: 'absolute', right: 0, top: 12, display: 'flex', flexDirection: 'row', gap: 2 }}>
                                {(!c.prioridade || c.prioridade === 'Bloqueado' || c.bloqueado) && (
                                  <Icon as={Lock} color="#b6c6f5" size={18} title="Chamado bloqueado aguardando prioridade" />
                                )}
                                {col.key === 'pendentes' && !c.responsavel && (c.createdAt || c.prazo) && (() => {
                                  const baseData = c.createdAt ? new Date(c.createdAt) : new Date(c.prazo);
                                  const agora = new Date();
                                  const diffMs = agora - baseData;
                                  if (diffMs > 1000 * 60 * 60) {
                                    return (
                                      <Icon as={AlertTriangle} color="#ffb300" size={18} title="Mais de 1h sem atribuição" />
                                    );
                                  }
                                  return null;
                                })()}
                                {c.prazo && new Date(c.prazo) < new Date() && col.key !== 'finalizados' && (
                                  <Icon as={Clock} color="#ff6b6b" size={18} title="Prazo estourado" />
                                )}
                                {col.key === 'emExecucao' && c.atualizacoes && c.atualizacoes.some(a => (typeof a === 'string' && a.toLowerCase().includes('validação'))) && (
                                  <Icon as={AlertTriangle} color="#ffb300" size={18} title="Retornou da validação para execução" />
                                )}
                              </div>
                              <span style={{ display: 'block', fontSize: 13, color: '#b6c6f5', marginBottom: 0 }}>{c.carteira}</span>
                              <span style={{ display: 'block', fontSize: 13, color: '#b6c6f5', marginBottom: 0 }}>{c.area}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              {col.key !== 'pendentes' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <img
                                    className="acompanhamento-card-avatar"
                                    src={getAvatarUrl(c.responsavel, c.avatar)}
                                    alt={c.responsavel}
                                    title={c.responsavel}
                                  />
                                  <span style={{ fontSize: 13, color: '#b6c6f5' }}> {
                                    c.responsavel
                                      ? (() => {
                                          const partes = c.responsavel.trim().split(' ');
                                          if (partes.length > 1) {
                                            return `${partes[0]} ${partes[1][0]}`;
                                          }
                                          return partes[0];
                                        })()
                                      : ''
                                  }</span>
                                </div>
                              )}
                              <span className={`kanban-card-prioridade prioridade-${c.prioridade ? c.prioridade.toLowerCase() : ''}`}
                                style={{ background: getPrioridadeColor(c.prioridade), marginLeft: 'auto' }}
                              >{c.prioridade}</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: '#1e4fff22', margin: '4px 0 2px 0', width: '100%' }}>
                              <div style={{
                                width: `${Math.max(0, Math.min(100, 100 - ((new Date(c.prazo) - new Date()) / (1000*60*60*24*7)) * 100))}%`,
                                height: '100%',
                                background: getPrioridadeColor(c.prioridade),
                                borderRadius: 2,
                                transition: 'width 0.3s',
                              }} />
                            </div>
                            {hoveredCard === (c._id || c.id) && (
                              (!c.prioridade || c.prioridade === 'Bloqueado' || c.bloqueado) ? (
                                <div className="acompanhamento-card-footer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#b6c6f5', fontWeight: 'bold', fontSize: 13 }}>
                                  <span>Chamado bloqueado</span>
                                </div>
                              ) : (
                                <div className="acompanhamento-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0 }}>
                                  {['emValidacao', 'finalizados'].includes(col.key) ? (
                                    <>
                                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                                        <button className="acompanhamento-card-action-btn" title="Detalhes" onClick={() => setModalChamado(c)}><Icon as={Info} /></button>
                                      </div>
                                      <div style={{ flex: 1 }} />
                                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }} />
                                    </>
                                  ) : (
                                    col.key === 'pendentes' ? (
                                      <>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                                          <button className="acompanhamento-card-action-btn" title="Atribuir" onClick={() => atribuirChamado(c)}>
                                            <span style={{fontSize: '1.3rem', fontWeight: 'bold', lineHeight: 1}}>+</span>
                                          </button>
                                        </div>
                                        <div style={{ flex: 1 }} />
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                          <button className="acompanhamento-card-action-btn" title="Detalhes" onClick={() => setModalChamado(c)}><Icon as={Info} /></button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                                          {col.key === 'naFila' ? (
                                            <button className="acompanhamento-card-action-btn" title="Iniciar execução" onClick={() => mudarStatusChamado(c, 'Em execução')}><Icon as={Play} /></button>
                                          ) : col.key === 'emExecucao' ? (
                                            <button className="acompanhamento-card-action-btn" title="Enviar para validação" onClick={() => mudarStatusChamado(c, 'Em validação')}><Icon as={Search} /></button>
                                          ) : (
                                            <button className="acompanhamento-card-action-btn" title="Concluir"><Icon as={Check} /></button>
                                          )}
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                          <button className="acompanhamento-card-action-btn" title="Editar" onClick={() => { setModalObs({ aberto: true, chamado: c, acao: 'editar', novoStatus: null }); setObsTexto(''); }}><Icon as={Pencil} /></button>
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                          <button className="acompanhamento-card-action-btn" title="Detalhes" onClick={() => setModalChamado(c)}><Icon as={Info} /></button>
                                        </div>
                                      </>
                                    )
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
      {/* Modal de detalhes do chamado */}
      {modalChamado && (
        <div className="acompanhamento-modal-bg" style={{backdropFilter:'blur(6px)', background:'rgba(10,15,30,0.70)'}} onClick={() => setModalChamado(null)}>
          <div className="acompanhamento-modal" onClick={e => e.stopPropagation()}
               style={{
                 maxWidth: 820,
                 width: '92vw',
                 maxHeight: '80vh',
                 background: 'linear-gradient(135deg, #161826 0%, #1f2334 60%, #252b42 100%)',
                 border: '1.5px solid #2a3b6b',
                 borderRadius: 28,
                 padding: '2.2rem 2.4rem 2.4rem 2.4rem',
                 position: 'relative',
                 boxShadow: '0 8px 40px -8px #1e4fff55, 0 4px 18px -4px #10162b',
                 overflow: 'hidden',
                 animation: 'modalFadeUp .5s cubic-bezier(.68,-0.55,.27,1.55)',
                 display: 'flex',
                 flexDirection: 'column',
               }}>
            {/* Glow decorativo */}
            <div style={{position:'absolute', inset:0, pointerEvents:'none'}}>
              <div style={{position:'absolute', width:240, height:240, top:-80, left:-80, background:'radial-gradient(circle,#1e4fff33,transparent 70%)'}} />
              <div style={{position:'absolute', width:260, height:260, bottom:-90, right:-70, background:'radial-gradient(circle,#00e39633,transparent 70%)'}} />
            </div>
            <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24}}>
              <div>
                <div style={{fontSize:14, letterSpacing:'.08em', textTransform:'uppercase', color:'#6f7ca4', fontWeight:600}}>Detalhes do chamado</div>
                <h2 style={{margin:'4px 0 0 0', fontSize:26, fontWeight:700, background:'linear-gradient(90deg,#fff,#b6c6f5)', WebkitBackgroundClip:'text', color:'transparent'}}>Visualização completa</h2>
              </div>
              <button aria-label="Fechar" onClick={() => setModalChamado(null)}
                style={{background:'transparent', border:'none', color:'#b6c6f5', fontSize:24, cursor:'pointer', lineHeight:1, padding:4, borderRadius:8}}>&times;</button>
            </div>
            {/* Conteúdo com rolagem interna */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              paddingRight: 4,
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Grid de informações principais */}
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                gap:16,
                background:'#202534',
                border:'1px solid #2d3650',
                padding:'14px 18px 12px 18px',
                borderRadius:16,
                marginBottom:24,
                position:'relative'
              }}>
              <div style={{position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1e4fff,#00e396)'}} />
              <Item label="ID" value={(modalChamado._id||modalChamado.id||'').slice(-8)} mono />
              <Item label="Título" value={modalChamado.titulo} wide />
              <Item label="Status" value={modalChamado.status} />
              <Item label="Prioridade" value={modalChamado.prioridade} pillColor={modalChamado.prioridade==='Alta'?'#1e90ff':modalChamado.prioridade==='Baixa'?'#4caf50':'#ffb300'} />
              <Item label="Prazo" value={modalChamado.prazo ? new Date(modalChamado.prazo).toLocaleDateString(): '-'} />
              <div style={{display:'flex', flexDirection:'column', gap:4, minWidth:0}}>
                <span style={{fontSize:11, letterSpacing:'.08em', color:'#6f7ca4', fontWeight:600}}>Responsável</span>
                <span style={{display:'flex', alignItems:'center', gap:8}}>
                  {modalChamado.responsavel && (
                    <img
                      className="acompanhamento-card-avatar"
                      src={getAvatarUrl(modalChamado.responsavel, modalChamado.avatar)}
                      alt={modalChamado.responsavel}
                      title={modalChamado.responsavel}
                    />
                  )}
                  <span style={{fontSize:14, color:'#d5def0', fontWeight:500}}>{modalChamado.responsavel||'-'}</span>
                </span>
              </div>
              <Item label="Carteira" value={modalChamado.carteira||'-'} />
              <Item label="Área" value={modalChamado.area||'-'} />
            </div>
              {/* Descrição */}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:15, color:'#6f7ca4', fontWeight:600, marginBottom:2}}>Descrição</div>
                <div style={{background:'#181b2a', borderRadius:10, padding:'10px 16px', color:'#e0e3f0', fontSize:15, minHeight:38}}>
                  {modalChamado.descricao || <span style={{color:'#ff6b6b'}}>Sem descrição detalhada.</span>}
                </div>
              </div>
              {/* Timeline do histórico */}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:15, color:'#6f7ca4', fontWeight:600, marginBottom:2}}>Histórico</div>
                <div style={{background:'#181b2a', borderRadius:10, padding:'10px 0 10px 0', color:'#e0e3f0', fontSize:15, minHeight:38, position:'relative'}}>
                  {(() => {
                    const obs = Array.isArray(modalChamado.observacoes) ? modalChamado.observacoes.map(o => ({ tipo: 'observacao', texto: o })) : [];
                    const atz = Array.isArray(modalChamado.atualizacoes) ? modalChamado.atualizacoes.map(a => ({ tipo: 'atualizacao', texto: a })) : [];
                    const hist = [...obs, ...atz]
                      .map((h, i) => ({ ...h, idx: i }))
                      .sort((a, b) => {
                        // Tenta ordenar por data extraída do texto, se possível
                        const regex = /\[(\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2}:\d{2})/;
                        const getData = t => {
                          const m = t.match(regex);
                          if (m) {
                            const [d, h] = [m[1], m[2]];
                            return new Date(d.split('/').reverse().join('-') + 'T' + h);
                          }
                          return new Date(0);
                        };
                        return getData(a.texto) - getData(b.texto);
                      });
                    if (hist.length === 0) return <span style={{color:'#ff6b6b', paddingLeft:18}}>Nenhum histórico.</span>;
                    return (
                      <div style={{position:'relative', paddingLeft:36, paddingRight:8}}>
                        {/* Linha vertical da timeline */}
                        <div style={{position:'absolute', left:18, top:0, bottom:0, width:3, background:'linear-gradient(#1e4fff,#00e396)', borderRadius:2, opacity:0.18}} />
                        {hist.map((h, i) => {
                          const isObs = h.tipo === 'observacao';
                          const isReprovacao = h.tipo === 'atualizacao' && h.texto && h.texto.toLowerCase().includes('reprovação:');
                          return (
                            <div key={i} style={{display:'flex', alignItems:'flex-start', marginBottom:18, position:'relative'}}>
                              {/* Ponto da timeline */}
                              <div style={{
                                width:18,
                                height:18,
                                borderRadius:'50%',
                                background: isObs ? '#1e4fff' : isReprovacao ? '#ffb300' : '#00e396',
                                boxShadow:'0 0 0 2px #23243a',
                                position:'absolute',
                                left:-27,
                                top:2,
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center'
                              }}>
                                {isObs ? <Icon as={Pencil} color="#fff" size={14} /> : <Icon as={Check} color="#fff" size={14} />}
                              </div>
                              <div style={{
                                background: isObs ? '#23243a' : isReprovacao ? '#3a2e1a' : '#1f2a1f',
                                border: isReprovacao ? '2px solid #ffb300' : undefined,
                                borderRadius:8,
                                padding:'10px 14px',
                                minWidth:0,
                                flex:1,
                                boxShadow:'0 1px 6px #1e4fff11'
                              }}>
                                <span style={{fontWeight:600, color: isObs ? '#b6c6f5' : isReprovacao ? '#ffb300' : '#7be396', fontSize:14, marginRight:8}}>{isObs ? 'Observação' : 'Atualização'}</span>
                                <span style={{fontSize:13, color: isReprovacao ? '#ffb300' : '#b6c6f5', opacity: isReprovacao ? 1 : 0.7}}>{h.texto}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <style>{`
              @keyframes modalFadeUp { 0% { transform: translateY(18px) scale(.96); opacity:0;} 60% { transform: translateY(-4px) scale(1.015); opacity:1;} 100% { transform: translateY(0) scale(1); opacity:1;} }
            `}</style>
          </div>
        </div>
      )}
      {/* Modal de observação obrigatória - overlay global */}
      {modalObs.aberto && (
        <div className="acompanhamento-modal-bg" style={{backdropFilter:'blur(6px)', background:'rgba(10,15,30,0.70)'}}
             onClick={() => setModalObs({ aberto: false, chamado: null, acao: null, novoStatus: null })}>
          <div className="acompanhamento-modal" onClick={e => e.stopPropagation()}
               style={{
                 maxWidth: 820,
                 width: '92vw',
                 background: 'linear-gradient(135deg, #161826 0%, #1f2334 60%, #252b42 100%)',
                 border: '1.5px solid #2a3b6b',
                 borderRadius: 28,
                 padding: '2.2rem 2.4rem 2.4rem 2.4rem',
                 position: 'relative',
                 boxShadow: '0 8px 40px -8px #1e4fff55, 0 4px 18px -4px #10162b',
                 overflow: 'hidden',
                 animation: 'modalFadeUp .5s cubic-bezier(.68,-0.55,.27,1.55)',
               }}>
            {/* Glow decorativo */}
            <div style={{position:'absolute', inset:0, pointerEvents:'none'}}>
              <div style={{position:'absolute', width:240, height:240, top:-80, left:-80, background:'radial-gradient(circle,#1e4fff33,transparent 70%)'}} />
              <div style={{position:'absolute', width:260, height:260, bottom:-90, right:-70, background:'radial-gradient(circle,#00e39633,transparent 70%)'}} />
            </div>
            <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24}}>
              <div>
                <div style={{fontSize:14, letterSpacing:'.08em', textTransform:'uppercase', color:'#6f7ca4', fontWeight:600}}>
                  {modalObs.acao === 'editar' ? 'Atualização' : 'Observação obrigatória'}
                </div>
                <h2 style={{margin:'4px 0 0 0', fontSize:26, fontWeight:700, background:'linear-gradient(90deg,#fff,#b6c6f5)', WebkitBackgroundClip:'text', color:'transparent'}}>
                  {modalObs.acao === 'editar' ? 'Atualize o chamado' : 'Observação obrigatória'}
                </h2>
              </div>
              <button aria-label="Fechar" onClick={() => setModalObs({ aberto:false, chamado:null, acao:null, novoStatus:null })}
                style={{background:'transparent', border:'none', color:'#b6c6f5', fontSize:24, cursor:'pointer', lineHeight:1, padding:4, borderRadius:8}}>&times;</button>
            </div>
            {modalObs.chamado && (
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
                gap:16,
                background:'#202534',
                border:'1px solid #2d3650',
                padding:'14px 18px 12px 18px',
                borderRadius:16,
                marginBottom:24,
                position:'relative'
              }}>
                <div style={{position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#1e4fff,#00e396)'}} />
                <Item label="ID" value={(modalObs.chamado._id||modalObs.chamado.id||'').slice(-8)} mono />
                <Item label="Título" value={modalObs.chamado.titulo} wide />
                <Item label="Status" value={modalObs.chamado.status} />
                <Item label="Nova etapa" value={modalObs.novoStatus || (modalObs.acao==='editar'?'-- (edição) --':'')} />
                <Item label="Prioridade" value={modalObs.chamado.prioridade} pillColor={modalObs.chamado.prioridade==='Alta'?'#1e90ff':modalObs.chamado.prioridade==='Baixa'?'#4caf50':'#ffb300'} />
                <Item label="Prazo" value={modalObs.chamado.prazo ? new Date(modalObs.chamado.prazo).toLocaleDateString(): '-'} />
                <Item label="Responsável" value={modalObs.chamado.responsavel||'-'} />
              </div>
            )}
            <div style={{marginBottom:16, fontSize:14, color:'#95a4c8', lineHeight:1.5}}>
              {modalObs.acao==='status' && modalObs.novoStatus ? (
                <>Informe uma atualização <b>obrigatória</b> que justifique a transição para <strong>{modalObs.novoStatus}</strong>. Esse registro ficará no histórico do chamado.</>
              ) : (
                <>Descreva a atualização realizada. Seja específico para melhorar o tracking.</>
              )}
            </div>
            <textarea
              style={{
                width: '100%',
                minHeight: 140,
                background:'#151924',
                border:'1.5px solid #2a3b6b',
                color:'#e0e6f2',
                borderRadius:14,
                padding:'14px 16px',
                fontSize:15,
                lineHeight:1.4,
                resize:'vertical',
                outline:'none',
                boxShadow:'0 0 0 0 rgba(30,79,255,0)',
                transition:'border .25s, box-shadow .25s'
              }}
              placeholder="Descreva a atualização do chamado..."
              value={obsTexto}
              onChange={e => setObsTexto(e.target.value)}
              onFocus={e => { e.target.style.border = '1.5px solid #1e4fff'; e.target.style.boxShadow = '0 0 0 3px #1e4fff22'; }}
              onBlur={e => { e.target.style.border = '1.5px solid #2a3b6b'; e.target.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'; }}
              autoFocus
            />
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20, gap:18, flexWrap:'wrap'}}>
              {modalObs.acao==='status' && modalObs.novoStatus ? (
                <div style={{fontSize:13, color: obsTexto.trim().length < 50 ? '#ff6b6b' : '#6f7ca4'}}>
                  {obsTexto.trim().length === 0 ? 'Campo obrigatório' : obsTexto.trim().length < 50 ? `Descreva melhor a atualização... (${obsTexto.trim().length}/50)` : 'OK'}
                </div>
              ) : (
                <div style={{fontSize:13, color: obsTexto.trim().length < 50 ? '#ff6b6b' : '#6f7ca4'}}>
                  {obsTexto.trim().length === 0 ? 'Campo obrigatório' : obsTexto.trim().length < 50 ? `Descreva melhor a atualização... (${obsTexto.trim().length}/50)` : 'OK'}
                </div>
              )}
              <div style={{display:'flex', gap:12}}>
                <button onClick={() => setModalObs({ aberto:false, chamado:null, acao:null, novoStatus:null })}
                  style={{
                    background:'#202534',
                    border:'1px solid #2d3650',
                    color:'#b6c6f5',
                    padding:'12px 22px',
                    borderRadius:12,
                    cursor:'pointer',
                    fontSize:15,
                    fontWeight:600
                  }}>Cancelar</button>
                <button onClick={salvarObservacaoObrigatoria} disabled={obsTexto.trim().length < 50}
                  style={{
                    background: obsTexto.trim().length >= 50 ? 'linear-gradient(90deg,#1e4fff,#00e396)' : '#2d3650',
                    border:'none',
                    color:'#fff',
                    padding:'12px 26px',
                    borderRadius:14,
                    cursor: obsTexto.trim().length >= 50 ? 'pointer' : 'not-allowed',
                    fontSize:16,
                    fontWeight:700,
                    letterSpacing:'.5px',
                    boxShadow: obsTexto.trim().length >= 50 ? '0 4px 18px -4px #1e4fffaa' : 'none',
                    transition:'filter .25s, transform .25s'
                  }}
                  onMouseDown={e => obsTexto.trim().length >= 50 && (e.currentTarget.style.transform='translateY(2px)')}
                  onMouseUp={e => (e.currentTarget.style.transform='translateY(0)')}
                  onMouseEnter={e => obsTexto.trim().length >= 50 && (e.currentTarget.style.filter='brightness(1.1)')}
                  onMouseLeave={e => (e.currentTarget.style.filter='brightness(1)')}
                >Salvar</button>
              </div>
            </div>
            <style>{`
              @keyframes modalFadeUp { 0% { transform: translateY(18px) scale(.96); opacity:0;} 60% { transform: translateY(-4px) scale(1.015); opacity:1;} 100% { transform: translateY(0) scale(1); opacity:1;} }
            `}</style>
          </div>
        </div>
      )}
    </>
  );
  // Helper small component for info items in modal
  function Item({ label, value, mono, pillColor, wide }) {
    if (pillColor) {
      return (
        <div style={{display:'flex', flexDirection:'column', gap:4, minWidth:0}}>
          <span style={{fontSize:11, letterSpacing:'.08em', color:'#6f7ca4', fontWeight:600}}>{label}</span>
          <span style={{
            background:pillColor,
            color:'#fff',
            fontWeight:600,
            fontSize:12,
            padding:'4px 10px',
            borderRadius:999,
            alignSelf:'flex-start',
            boxShadow:'0 0 0 1px #ffffff22'
          }}>{value||'-'}</span>
        </div>
      );
    }
    return (
      <div style={{display:'flex', flexDirection:'column', gap:4, minWidth: wide ? '100%' : 0}}>
        <span style={{fontSize:11, letterSpacing:'.08em', color:'#6f7ca4', fontWeight:600}}>{label}</span>
        <span style={{
          fontSize:14,
          fontFamily: mono ? 'monospace' : 'inherit',
          color:'#d5def0',
          fontWeight:500,
          whiteSpace:'nowrap',
          overflow:'hidden',
          textOverflow:'ellipsis',
          maxWidth: wide ? '100%' : '160px'
        }} title={value}>{value || '-'}</span>
      </div>
    );
  }
}
