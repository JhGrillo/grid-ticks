import React from 'react';
import { Clock, AlertTriangle, Lock, Search } from 'lucide-react';

function getAvatarUrl(nome, avatar) {
  return avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=23243a&color=fff&size=128`;
}

function getPrioridadeColor(prioridade) {
  if (prioridade === 'Alta') return '#1e90ff';
  if (prioridade === 'Baixa') return '#4caf50';
  return '#ffb300';
}

// Props extras: isConsulta (boolean), usuario (objeto)
export default function KanbanCardVisual({ chamado, onClick, isConsulta }) {
  if (!chamado) return null;
  // Exibe lupa se: tela de consulta e status em validação
  const podeValidar = isConsulta && chamado.status === 'Em validação';
  return (
    <div
      className="kanban-card"
      style={{
        background: 'linear-gradient(135deg, #161826 0%, #1f2334 60%, #252b42 100%)',
        border: '1.5px solid #2a3b6b',
        borderRadius: 12,
        margin: '4px 0',
        padding: '8px 8px 7px 8px',
        boxShadow: '0 8px 40px -8px #1e4fff33, 0 4px 18px -4px #10162b',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.18s, box-shadow 0.18s, transform 0.18s',
        position: 'relative',
        minWidth: 0,
        maxWidth: '100%',
        width: '100%',
        wordBreak: 'break-word',
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        zIndex: 1,
        fontSize: 14,
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 40px -4px #1e4fff77, 0 4px 18px -4px #10162b';
        e.currentTarget.style.transform = 'scale(1.01)';
        e.currentTarget.style.zIndex = 2;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 8px 40px -8px #1e4fff33, 0 4px 18px -4px #10162b';
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = 1;
      }}
    >
      {/* Título, data */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 }}>
        <span
          className="kanban-card-title"
          style={{ fontWeight: 'bold', fontSize: 14, maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={chamado.titulo}
        >
          {chamado.titulo}
        </span>
        <span style={{ fontSize: 10, color: '#b6c6f5', marginLeft: 6 }}>{chamado.prazo ? new Date(chamado.prazo).toLocaleDateString() : ''}</span>
      </div>
      {/* Ícone de validação (lupa) apenas */}
      <div style={{ position: 'relative', minHeight: 22 }}>
        <div style={{ position: 'absolute', right: 0, top: 12, display: 'flex', flexDirection: 'row', gap: 2 }}>
          {podeValidar && (
            <span title="Validar chamado" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, margin: 0 }}
              onClick={e => { e.stopPropagation(); if(onClick) onClick(); }}
            >
              <Search color="#1e90ff" size={18} style={{ verticalAlign: 'middle' }} />
            </span>
          )}
        </div>
        <span style={{ display: 'block', fontSize: 13, color: '#b6c6f5', marginBottom: 0 }}>{chamado.carteira}</span>
        <span style={{ display: 'block', fontSize: 13, color: '#b6c6f5', marginBottom: 0 }}>{chamado.area}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span className={`kanban-card-prioridade prioridade-${chamado.prioridade ? chamado.prioridade.toLowerCase() : ''}`}
          style={{ background: getPrioridadeColor(chamado.prioridade), marginLeft: 'auto', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 8, padding: '2px 10px' }}
        >{chamado.prioridade}</span>
      </div>
      <div style={{ fontSize: 13, color: '#b6c6f5', marginTop: 2, marginBottom: 2 }}>
        <b>Status:</b> {chamado.status}
      </div>
      {/* Barra de progresso do prazo (SLA) */}
      <div style={{ height: 4, borderRadius: 2, background: '#1e4fff22', margin: '4px 0 2px 0', width: '100%' }}>
        <div style={{
          width: `${chamado.prazo ? Math.max(0, Math.min(100, 100 - ((new Date(chamado.prazo) - new Date()) / (1000*60*60*24*7)) * 100)) : 100}%`,
          height: '100%',
          background: getPrioridadeColor(chamado.prioridade),
          borderRadius: 2,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}