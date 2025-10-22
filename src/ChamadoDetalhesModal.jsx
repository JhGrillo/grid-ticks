import React, { useState } from 'react';
import { Pencil, Check, Info, AlertTriangle } from 'lucide-react';

// Item visual reutilizável
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

function getAvatarUrl(nome, avatar) {
  return avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=23243a&color=fff&size=128`;
}

// Recebe prop extra: usuario (objeto)
export default function ChamadoDetalhesModal({ chamado, onClose, usuario }) {
  if (!chamado) return null;
  // Mostra bloco de validação para qualquer chamado em validação
  const podeValidar = chamado.status === 'Em validação';
  // Estado para modal de observação
  const [acao, setAcao] = useState(null); // 'validar' | 'reprovar' | null
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erroObs, setErroObs] = useState('');
  const [sucesso, setSucesso] = useState(false);

  async function handleEnviarAcao(tipo) {
    setErroObs('');
    if (!observacao.trim()) {
      setErroObs('Digite uma observação obrigatória.');
      return;
    }
    if (tipo === 'reprovar' && observacao.trim().length < 50) {
      setErroObs('A observação para reprovar deve ter pelo menos 50 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const status = tipo === 'validar' ? 'Finalizado' : 'Em execução';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const res = await fetch(`${apiBase.replace(/\/$/, '')}/api/chamados/${chamado._id || chamado.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, mensagem: `[${new Date().toLocaleDateString()}, ${new Date().toLocaleTimeString()}] ${tipo === 'validar' ? 'Validação' : 'Reprovação'}: ${observacao}` })
      });
      if (res.ok) {
        setSucesso(true);
        setTimeout(() => { setAcao(null); setSucesso(false); setObservacao(''); window.location.reload(); }, 1200);
      } else {
        const data = await res.json();
        setErroObs(data.error || 'Erro ao atualizar chamado.');
      }
    } catch (e) {
      setErroObs('Erro de conexão.');
    }
    setLoading(false);
  }
  return (
    <div className="acompanhamento-modal-bg" style={{backdropFilter:'blur(6px)', background:'rgba(10,15,30,0.70)'}} onClick={onClose}>
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
          <button aria-label="Fechar" onClick={onClose}
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
          <Item label="ID" value={(chamado._id||chamado.id||'').slice(-8)} mono />
          <Item label="Título" value={chamado.titulo} wide />
          <Item label="Status" value={chamado.status} />
          <Item label="Prioridade" value={chamado.prioridade} pillColor={chamado.prioridade==='Alta'?'#1e90ff':chamado.prioridade==='Baixa'?'#4caf50':'#ffb300'} />
          <Item label="Prazo" value={chamado.prazo ? new Date(chamado.prazo).toLocaleDateString(): '-'} />
          <div style={{display:'flex', flexDirection:'column', gap:4, minWidth:0}}>
            <span style={{fontSize:11, letterSpacing:'.08em', color:'#6f7ca4', fontWeight:600}}>Responsável</span>
            <span style={{display:'flex', alignItems:'center', gap:8}}>
              {chamado.responsavel && (
                <img
                  className="acompanhamento-card-avatar"
                  src={getAvatarUrl(chamado.responsavel, chamado.avatar)}
                  alt={chamado.responsavel}
                  title={chamado.responsavel}
                />
              )}
              <span style={{fontSize:14, color:'#d5def0', fontWeight:500}}>{chamado.responsavel||'-'}</span>
            </span>
          </div>
          <Item label="Carteira" value={chamado.carteira||'-'} />
          <Item label="Área" value={chamado.area||'-'} />
        </div>
          {/* Descrição */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:15, color:'#6f7ca4', fontWeight:600, marginBottom:2}}>Descrição</div>
            <div style={{background:'#181b2a', borderRadius:10, padding:'10px 16px', color:'#e0e3f0', fontSize:15, minHeight:38}}>
              {chamado.descricao || <span style={{color:'#ff6b6b'}}>Sem descrição detalhada.</span>}
            </div>
          </div>
          {/* Bloco de validação para solicitante */}
          {podeValidar && (
            <div style={{
              background: 'linear-gradient(90deg,#1e4fff22,#00e39622)',
              border: '1.5px solid #1e4fff55',
              borderRadius: 16,
              padding: '18px 22px',
              marginBottom: 22,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 2px 12px #1e4fff22',
              animation: 'fadeSlideIn 0.4s',
              position: 'relative',
              gap: 12
            }}>
              <div style={{fontWeight: 700, fontSize: 18, color: '#1e90ff', marginBottom: 2, letterSpacing: 0.2}}>Validação do chamado</div>
              <div style={{color: '#b6c6f5', fontSize: 15, marginBottom: 8, textAlign: 'center'}}>Deseja validar a solução ou reprovar para reabrir? Uma observação é obrigatória.</div>
              <div style={{display: 'flex', gap: 18, marginTop: 2, justifyContent: 'center', alignItems: 'baseline'}}>
                <button
                  className="gt-btn-primary"
                  style={{
                    fontWeight:700,
                    fontSize:16,
                    lineHeight:1.2,
                    borderRadius:8,
                    minWidth:110,
                    padding:'12px 24px',
                    boxShadow:'0 2px 8px #4caf5033',
                    background: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                  }}
                  onClick={() => { setAcao('validar'); }}
                >
                  <span style={{display:'flex',alignItems:'center',gap:8,fontWeight:700,lineHeight:'1.2'}}>
                    <Check size={20} style={{verticalAlign:'middle'}} /> Validar
                  </span>
                </button>
                <button
                  className="gt-btn-secondary"
                  style={{
                    fontWeight:700,
                    fontSize:16,
                    lineHeight:1.2,
                    borderRadius:8,
                    minWidth:110,
                    padding:'12px 24px',
                    background:'#181b2a',
                    color:'#ff4d6d',
                    border:'2px solid #ff4d6d',
                    boxShadow:'none',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                  }}
                  onClick={() => { setAcao('reprovar'); }}
                >
                  <span style={{display:'flex',alignItems:'center',gap:8,fontWeight:700,lineHeight:'1.2'}}>
                    <AlertTriangle size={20} style={{verticalAlign:'middle'}} /> Reprovar
                  </span>
                </button>
              </div>
              {/* Modal de observação obrigatória */}
              {acao && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 3000,
                  background: 'rgba(18,21,39,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'fadeInBg 0.3s'
                }}>
                  <div style={{
                    background: '#23243a', borderRadius: 18, boxShadow: '0 8px 40px #1e4fff33',
                    padding: '2.2rem 2.2rem 2rem 2.2rem', minWidth: 320, maxWidth: '92vw', textAlign: 'center', color: '#e0e3f0',
                    border: '2px solid #2a3b6b', position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{fontWeight: 700, fontSize: 20, color: acao==='validar'?'#1e90ff':'#ff4d6d', marginBottom: 10}}>
                      {acao === 'validar' ? 'Validar chamado' : 'Reprovar chamado'}
                    </div>
                    <div style={{fontSize: 15, color: '#b6c6f5', marginBottom: 12}}>
                      Digite uma observação obrigatória para {acao === 'validar' ? 'finalizar' : 'reprovar'} o chamado:
                    </div>
                    <textarea
                      style={{width: '100%', minHeight: 64, borderRadius: 8, border: '1.5px solid #1e4fff55', padding: 10, fontSize: 15, marginBottom: 4, resize: 'vertical', background: '#181b2a', color: '#e0e3f0'}}
                      value={observacao}
                      onChange={e => setObservacao(e.target.value)}
                      maxLength={400}
                      disabled={loading || sucesso}
                      autoFocus
                    />
                    <div style={{textAlign:'right', fontSize:13, color: acao==='reprovar' && observacao.trim().length<50 ? '#ff4d6d' : '#b6c6f5', marginBottom: 8}}>
                      {observacao.trim().length} / 400 caractere{observacao.trim().length === 1 ? '' : 's'}
                      {acao==='reprovar' && <span style={{marginLeft:8, fontWeight:500}}>{observacao.trim().length<50 ? 'Mínimo: 50' : 'OK'}</span>}
                    </div>
                    {erroObs && <div style={{color:'#ff4d6d', fontWeight:500, marginBottom:8}}>{erroObs}</div>}
                    {sucesso && <div style={{color:'#1e90ff', fontWeight:600, marginBottom:8}}>Status atualizado com sucesso!</div>}
                    <div style={{display:'flex', gap:12, justifyContent:'center', marginTop:8}}>
                      <div style={{display:'flex', gap:12, alignItems:'baseline'}}>
                        <button
                          className="gt-btn-secondary"
                          style={{
                            minWidth:110,
                            borderRadius:8,
                            fontWeight:700,
                            background:'#181b2a',
                            color:'#b6c6f5',
                            border:'2px solid #b6c6f5',
                            boxShadow:'none',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            padding:'12px 24px',
                            height:48
                          }}
                          onClick={() => { setAcao(null); setObservacao(''); setErroObs(''); }}
                          disabled={loading}
                        >
                          Cancelar
                        </button>
                        <button
                          className="gt-btn-primary"
                          style={{
                            minWidth:110,
                            borderRadius:8,
                            fontWeight:700,
                            background: acao==='reprovar' && observacao.trim().length<50 ? '#23243a' : '',
                            color: acao==='reprovar' && observacao.trim().length<50 ? '#b6c6f5' : '',
                            border: acao==='reprovar' && observacao.trim().length<50 ? '2px solid #2a3b6b' : '',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            padding:'12px 24px',
                            height:48
                          }}
                          onClick={() => handleEnviarAcao(acao)}
                          disabled={loading || sucesso || (acao==='reprovar' && observacao.trim().length<50)}
                          aria-busy={loading}
                        >
                          {loading ? 'Enviando...' : (acao === 'validar' ? 'Validar' : 'Reprovar')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Timeline do histórico */}
          <div style={{marginBottom:18}}>
            <div style={{fontSize:15, color:'#6f7ca4', fontWeight:600, marginBottom:2}}>Histórico</div>
            <div style={{background:'#181b2a', borderRadius:10, padding:'10px 0 10px 0', color:'#e0e3f0', fontSize:15, minHeight:38, position:'relative'}}>
              {(() => {
                const obs = Array.isArray(chamado.observacoes) ? chamado.observacoes.map(o => ({ tipo: 'observacao', texto: o })) : [];
                const atz = Array.isArray(chamado.atualizacoes) ? chamado.atualizacoes.map(a => ({ tipo: 'atualizacao', texto: a })) : [];
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
                            {isObs ? <Pencil color="#fff" size={14} /> : <Check color="#fff" size={14} />}
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
      </div>
    </div>
  );
}