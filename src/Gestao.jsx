import React, { useEffect, useState } from 'react';
import { listarChamados, atualizarChamado, atualizarOrdem } from './api/chamados.js';
import ChamadoDetalhesModal from './ChamadoDetalhesModal.jsx';
import IconDetalhes from './IconDetalhes.jsx';

export default function Gestao({ usuario }) {
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  // Removido: edição individual
  const [editandoPrioridade, setEditandoPrioridade] = useState(false);
  const [ordensEdicao, setOrdensEdicao] = useState({}); // {id: valor}
  const [detalhesChamado, setDetalhesChamado] = useState(null); // chamado selecionado para detalhes

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      setErro('');
      try {
        const todos = await listarChamados();
        let filtrados = todos;
        if (usuario.role !== 'admin') {
          const areasGestor = Array.isArray(usuario.area) ? usuario.area : [usuario.area];
          const carteirasGestor = Array.isArray(usuario.carteira) ? usuario.carteira : [usuario.carteira];
          // Se for gestor de Planejamento, filtra por área + carteira
          if (areasGestor.includes('Planejamento')) {
            filtrados = todos.filter(c => {
              // c.area pode ser string ou array
              const areaMatch = Array.isArray(c.area)
                ? c.area.includes('Planejamento')
                : c.area === 'Planejamento';
              const carteiraMatch = carteirasGestor.includes(c.carteira);
              return areaMatch && carteiraMatch;
            });
          } else {
            // Demais gestores: filtra só por área (área do chamado pode ser string, gestor pode ter várias áreas)
            filtrados = todos.filter(c => {
              if (!c.area) return false;
              // Normaliza para comparar ignorando maiúsculas/minúsculas e espaços
              const areaChamado = String(c.area).trim().toLowerCase();
              return areasGestor.some(a => String(a).trim().toLowerCase() === areaChamado);
            });
          }
        }
        setChamados(filtrados);
      } catch (e) {
        setErro('Erro ao carregar chamados: ' + (e.message || e));
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [usuario]);

  // Função de salvar em lote será implementada na próxima etapa

  function filtrarChamados() {
    // Filtro
    let filtrados = chamados.filter(c => {
      // Se não estiver filtrando por status, esconde os finalizados
      if (!filtroStatus && c.status && c.status.toLowerCase() === 'finalizado') return false;
      // Se estiver filtrando por status, mostra todos normalmente
      if (filtroStatus && c.status && c.status.toLowerCase() !== filtroStatus.toLowerCase()) return false;
      if (filtroPrioridade && (!c.prioridade || c.prioridade.toLowerCase() !== filtroPrioridade.toLowerCase())) return false;
      return true;
    });
    // Ordenação: prioridade (Alta, Média, Baixa), depois ordemExecucao crescente
    const prioridadeOrder = { 'Alta': 1, 'Média': 2, 'Baixa': 3 };
    filtrados = filtrados.sort((a, b) => {
      const pa = prioridadeOrder[a.prioridade] || 99;
      const pb = prioridadeOrder[b.prioridade] || 99;
      if (pa !== pb) return pa - pb;
      // Se prioridade igual, ordena por ordemExecucao (menor primeiro)
      const oa = a.ordemExecucao ?? 9999;
      const ob = b.ordemExecucao ?? 9999;
      return oa - ob;
    });
    return filtrados;
  }

  if (!usuario || (usuario.role !== 'gestor' && usuario.role !== 'admin')) {
    return <div style={{ padding: 32, color: '#ff4d6d', fontWeight: 600 }}>Acesso restrito a gestores.</div>;
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#b6c6f5', fontWeight: 700, fontSize: 28, marginBottom: 18 }}>Gestão de Prioridades</h1>
      <div style={{ marginBottom: 18, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ background:'#23243a', color:'#b6c6f5', border:'1px solid #2a3b6b', borderRadius:8, padding:'8px 12px', fontSize:15 }}>
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Na fila">Na fila</option>
          <option value="Em execução">Em execução</option>
          <option value="Em validação">Em validação</option>
          <option value="Finalizado">Finalizado</option>
        </select>
        <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} style={{ background:'#23243a', color:'#b6c6f5', border:'1px solid #2a3b6b', borderRadius:8, padding:'8px 12px', fontSize:15 }}>
          <option value="">Prioridade</option>
          <option value="Alta">Alta</option>
          <option value="Média">Média</option>
          <option value="Baixa">Baixa</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
        <button onClick={() => setEditandoPrioridade(true)} style={{background:'#1e4fff', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:600, fontSize:15, cursor:'pointer', marginLeft:8}}>
          Definir prioridades
        </button>
      </div>
      {erro && <div style={{color:'#ff6b6b', marginBottom:12}}>{erro}</div>}
      {/* Notificação de chamados bloqueados */}
      {chamados.some(c => c.bloqueado === true) && (
        <div style={{
          background:'#ffb30022',
          color:'#ffb300',
          border:'1.5px solid #ffb300',
          borderRadius:10,
          padding:'10px 18px',
          marginBottom:16,
          fontWeight:600,
          fontSize:16
        }}>
          Existem chamados bloqueados! Defina a ordem de execução para liberar o atendimento.
        </div>
      )}
      {editandoPrioridade && (
        <button
          onClick={async () => {
            // Corrigido: considerar todos os chamados editáveis, não só os alterados
            const editaveis = filtrarChamados().filter(c => c.status === 'Aberto' || c.status === 'Na fila');
            const valores = editaveis.map(c => {
              const v = ordensEdicao[c._id||c.id];
              return v !== undefined && v !== null && v !== '' ? Number(v) : Number(c.ordemExecucao);
            });
            const temDuplicados = new Set(valores).size !== valores.length;
            const temInvalidos = valores.some(v => !Number.isInteger(v) || v <= 0);
            if (temDuplicados) {
              setErro('Não é permitido salvar prioridades (ordem) duplicadas! Cada chamado deve ter um valor único.');
              return;
            }
            if (temInvalidos) {
              setErro('Só é permitido valores inteiros positivos (1, 2, 3, ...).');
              return;
            }
            try {
              // Atualiza em lote usando a rota PATCH /api/chamados/ordem
              const ordensPayload = editaveis.map((c, idx) => {
                const novoValor = ordensEdicao[c._id||c.id];
                return {
                  id: c._id || c.id,
                  ordemExecucao: novoValor !== undefined && novoValor !== '' ? Number(novoValor) : Number(c.ordemExecucao)
                };
              });
              await atualizarOrdem(ordensPayload);
              // Recarrega chamados do backend para refletir bloqueio/desbloqueio
              const todos = await listarChamados();
              let filtrados = todos;
              if (usuario.role !== 'admin') {
                const areasGestor = Array.isArray(usuario.area) ? usuario.area : [usuario.area];
                const carteirasGestor = Array.isArray(usuario.carteira) ? usuario.carteira : [usuario.carteira];
                if (areasGestor.includes('Planejamento')) {
                  filtrados = todos.filter(c => {
                    const areaMatch = Array.isArray(c.area)
                      ? c.area.includes('Planejamento')
                      : c.area === 'Planejamento';
                    const carteiraMatch = carteirasGestor.includes(c.carteira);
                    return areaMatch && carteiraMatch;
                  });
                } else {
                  filtrados = todos.filter(c => {
                    if (!c.area) return false;
                    const areaChamado = String(c.area).trim().toLowerCase();
                    return areasGestor.some(a => String(a).trim().toLowerCase() === areaChamado);
                  });
                }
              }
              setChamados(filtrados);
              setEditandoPrioridade(false);
              setOrdensEdicao({});
            } catch (e) {
              setErro('Erro ao salvar prioridades: ' + (e.message || e));
            }
          }}
          style={{background:'#1e4fff', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:600, fontSize:15, cursor:'pointer', marginBottom:16, marginRight:12}}
        >
          Salvar prioridades
        </button>
      )}
      {loading ? (
        <div style={{color:'#b6c6f5'}}>Carregando chamados...</div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background:'#202534', color:'#e0e6f2', borderRadius:12, overflow:'hidden', minWidth:900 }}>
            <thead>
              <tr style={{ background:'#23243a', color:'#b6c6f5' }}>
                {/* <th style={{padding:'10px 12px'}}>ID</th> */}
                <th style={{padding:'10px 12px'}}>Título</th>
                <th style={{padding:'10px 12px'}}>Detalhes</th>
                <th style={{padding:'10px 12px'}}>Status</th>
                <th style={{padding:'10px 12px'}}>Ordem Execução</th>
                <th style={{padding:'10px 12px'}}>Prioridade</th>
                <th style={{padding:'10px 12px'}}>Email de abertura</th>
                <th style={{padding:'10px 12px'}}>Carteira</th>
                <th style={{padding:'10px 12px'}}>Área</th>
                {/* <th style={{padding:'10px 12px'}}>Prazo</th> */}
                {/* Coluna Ação removida */}
              </tr>
            </thead>
            <tbody>
              {filtrarChamados().map(c => {
                const podeEditar = editandoPrioridade && (c.status === 'Aberto' || c.status === 'Na fila');
                return (
                  <tr key={c._id || c.id} style={{ borderBottom:'1px solid #2a3b6b' }}>
                    {/* <td style={{padding:'8px 12px', fontFamily:'monospace'}}>{(c._id||c.id||'').slice(-8)}</td> */}
                    <td style={{padding:'8px 12px', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={c.titulo}>{c.titulo}</td>
                    <td style={{padding:'8px 12px', textAlign:'center'}}>
                      <button title="Ver detalhes" onClick={() => setDetalhesChamado(c)} style={{background:'none', border:'none', cursor:'pointer', padding:2}}>
                        <IconDetalhes size={20} color="#b6c6f5" />
                      </button>
                    </td>
                    <td style={{padding:'8px 12px'}}>{c.status}</td>
                    <td style={{padding:'8px 12px', textAlign:'center'}}>
                      {(c.status === 'Aberto' || c.status === 'Na fila') ? (
                        podeEditar ? (
                          <input type="number" min={1} value={ordensEdicao[c._id||c.id] ?? c.ordemExecucao ?? ''}
                            onChange={e => setOrdensEdicao(prev => ({...prev, [c._id||c.id]: e.target.value}))}
                            style={{width:60, background:'#23243a', color:'#b6c6f5', border:'1px solid #2a3b6b', borderRadius:8, padding:'4px 10px', fontSize:15}} placeholder="Ordem" />
                        ) : (
                          c.ordemExecucao ?? ''
                        )
                      ) : (
                        <span style={{color:'#6f7ca4'}}>-</span>
                      )}
                    </td>
                    <td style={{padding:'8px 12px'}}>{c.prioridade || (c.bloqueado ? 'Bloqueado' : '')}</td>
                    <td style={{padding:'8px 12px'}}>{c.email}</td>
                    <td style={{padding:'8px 12px'}}>{c.carteira}</td>
                    <td style={{padding:'8px 12px'}}>{c.area}</td>
                    {/* <td style={{padding:'8px 12px'}}>{c.prazo ? new Date(c.prazo).toLocaleDateString() : ''}</td> */}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    {/* Modal de detalhes do chamado */}
    {detalhesChamado && (
      <ChamadoDetalhesModal chamado={detalhesChamado} onClose={() => setDetalhesChamado(null)} usuario={usuario} />
    )}
  </div>
  );
}
