import React, { useState } from 'react';
import bgGridTicks from './assets/bg-gridticks.png';
import logoGridTicks from './assets/logo-gridticks.png';

import PriorizacaoModal from './PriorizacaoModal.jsx';
import AcompanhamentoChamados from './AcompanhamentoChamados.jsx';
import Gestao from './Gestao.jsx';
import ChamadoDetalhesModal from './ChamadoDetalhesModal.jsx';
import KanbanCardVisual from './KanbanCardVisual.jsx';
import './App.css';
import { isValidEmail } from './utils/validation.js';
import { MESSAGES } from './utils/messages.js';

function ConsultarChamado({ onResult, onList }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [inputType, setInputType] = useState('');

  // Detecta se é email ou id
  const detectType = (val) => {
    if (isValidEmail(val)) return 'email';
    if (/^[a-fA-F0-9]{24}$/.test(val)) return 'id';
    return '';
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    setInputType(detectType(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
  let url = `http://localhost:5000/api/chamados/${input}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          onList(data);
        } else {
          onResult(data);
        }
      } else {
  setErro(data.error || "Chamado não encontrado.");
      }
    } catch (err) {
  setErro(MESSAGES.ERRO_CONEXAO);
    }
    setLoading(false);
  };

  return (
    <div>
      <form className="gt-form" onSubmit={handleSubmit} style={{marginBottom: 18}} autoComplete="off">
        <input className="gt-input" placeholder="ID do chamado ou Email" required value={input} onChange={handleChange} aria-label="ID do chamado ou Email" />
        <button className="gt-btn-primary" type="submit" disabled={loading || !inputType} aria-busy={loading} aria-label="Consultar chamado">
          {loading ? <span className="gt-spinner" aria-label="Carregando" /> : "Consultar"}
        </button>
      </form>
      {erro && (
        <div style={{
          color: '#ff4d6d',
          background: '#2a1a1a',
          borderRadius: 10,
          padding: '10px 16px',
          marginBottom: 12,
          fontWeight: 500,
          border: '1.5px solid #ff4d6d',
          boxShadow: '0 2px 8px #ff4d6d22',
          fontSize: 16
        }}>
          {erro}
        </div>
      )}
    </div>
  );
}

function App() {
  const [tela, setTela] = useState('login'); // 'login' | 'acompanhamento' | ...
  // Estado do usuário logado
  const [usuario, setUsuario] = useState(() => {
    const saved = localStorage.getItem('usuario');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Direciona gestores para a aba Gestão, demais para Acompanhamento
      setTimeout(() => setTela(parsed.role === 'gestor' ? 'gestao' : 'acompanhamento'), 0);
      return parsed;
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState('abrir');
  const [form, setForm] = useState({
    titulo: '',
    email: '',
    area: '',
    prazo: '',
    prioridade: '',
    descricao: ''
  });
  const [segmentacao, setSegmentacao] = useState('');
  const [modal, setModal] = useState(null);
  const [chamadoConsulta, setChamadoConsulta] = useState(null);
  const [listaChamados, setListaChamados] = useState(null);
  const [erroAbertura, setErroAbertura] = useState("");
  const [loadingAbertura, setLoadingAbertura] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itensPorPagina] = useState(5);
  // Estado para priorização
  const [priorizacao, setPriorizacao] = useState(null);
  // Estado para alerta gestor
  const [alertaGestor, setAlertaGestor] = useState(null);

  // Estado do login
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErro, setLoginErro] = useState("");

  // Áreas e carteiras válidas conforme backend
  const areas = ['Planejamento', 'ControlDesk', 'Monitoria', 'Projetos', 'Sustentação', 'TI', 'Operação', 'Qualidade'];
  const prioridades = ['Alta', 'Média', 'Baixa'];
  const segmentacoes = {
    'Bradesco': ['Segmento 1', 'Segmento 2'],
    'BV': ['Segmento 3', 'Segmento 4']
  };

  const handleChange = (e) => {
    if (e.target.name === 'email') {
  const emailValido = isValidEmail(e.target.value);
  setErroAbertura(emailValido || e.target.value === '' ? '' : MESSAGES.EMAIL_INVALIDO);
    }
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSegmentacao = (e) => {
    setSegmentacao(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroAbertura("");
    if (!isValidEmail(form.email)) {
      setErroAbertura(MESSAGES.EMAIL_INVALIDO);
      return;
    }
    setLoadingAbertura(true);
    try {
      const [carteira, seg] = segmentacao.split('|');
      const payload = { ...form, carteira, segmentacao: seg };
      const res = await fetch('http://localhost:5000/api/chamados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        // Se backend pedir priorização, abre modal
        if (data.bloqueio === 'usuario' && Array.isArray(data.chamados)) {
          setPriorizacao({
            email: payload.email,
            area: payload.area,
            carteira: payload.carteira
          });
          setModal(null);
        } else if (data.bloqueio === 'gestor') {
          // Mostra modal de sucesso primeiro, alerta gestor só depois de fechar o modal
          setModal('sucesso');
          setTimeout(() => {
            setAlertaGestor(data.mensagem || 'Seus chamados em Aberto ou Na Fila estão bloqueados devido a conflito de prioridades na área. Solicite ao seu gestor a definição da prioridade para liberação.');
          }, 800);
        } else {
          setModal('sucesso');
        }
        setForm({ titulo: '', email: '', area: '', prazo: '', prioridade: '', descricao: '' });
        setSegmentacao('');
      } else {
  setErroAbertura(data.error && typeof data.error === 'string' ? data.error : MESSAGES.ERRO_ABERTURA);
      }
    } catch (err) {
  setErroAbertura(MESSAGES.ERRO_CONEXAO);
    }
    setLoadingAbertura(false);
  };

  const handleLoginSuccess = (userData) => {
    setUsuario(userData);
    localStorage.setItem('usuario', JSON.stringify(userData));
    setTela(userData.role === 'gestor' ? 'gestao' : 'acompanhamento');
  };

  const handleLogout = () => {
    console.log('[LOGOUT] Disparado');
    setUsuario(null);
    try { localStorage.removeItem('usuario'); } catch(e) { console.warn('Falha remover localStorage', e); }
    setTela('login');
  };

  if (tela === 'gestao' && usuario) {
    return <AcompanhamentoChamados usuario={usuario} onLogout={handleLogout} initialPagina={'gestao'} />;
  }
  if (tela === 'acompanhamento' && usuario) {
    return <AcompanhamentoChamados usuario={usuario} onLogout={handleLogout} />;
  }

  return (
    <>
      <div className="gt-bg" style={{ backgroundImage: `url(${bgGridTicks})` }}>
        <div className="gt-center-content">
          <div className="gt-left-panel">
            <div className="gt-tabs">
              <button
                className={activeTab === 'abrir' ? 'gt-tab-active' : 'gt-tab'}
                onClick={() => setActiveTab('abrir')}
              >
                Abrir chamado
              </button>
              <button
                className={activeTab === 'consultar' ? 'gt-tab-active' : 'gt-tab'}
                onClick={() => setActiveTab('consultar')}
              >
                Consultar chamado
              </button>
            </div>
            {activeTab === 'abrir' ? (
              <form className="gt-form" onSubmit={handleSubmit} autoComplete="off">
                <input className="gt-input" name="titulo" placeholder="Titulo" required value={form.titulo} onChange={handleChange} />
                <input className="gt-input" name="email" placeholder="Email" type="email" required value={form.email} onChange={handleChange} aria-invalid={!!erroAbertura && erroAbertura.includes('Email')} />
                <div className="gt-row">
                  <select className="gt-input" name="area" required value={form.area} onChange={handleChange}>
                    <option value="" disabled>Área</option>
                    {areas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                  <input className="gt-input" name="prazo" placeholder="Prazo" type="date" required value={form.prazo} onChange={handleChange} aria-label="Prazo" />
                </div>
                <div className="gt-row">
                  <select className="gt-input" required value={segmentacao} onChange={handleSegmentacao} name="segmentacao">
                    <option value="" disabled>Carteira / Segmentação</option>
                    {Object.entries(segmentacoes).map(([carteira, segs]) => (
                      <optgroup key={carteira} label={carteira}>
                        {segs.map(s => (
                          <option key={carteira + '-' + s} value={carteira + '|' + s}>{s}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select className="gt-input" name="prioridade" required value={form.prioridade} onChange={handleChange}>
                    <option value="" disabled>Prioridade</option>
                    {prioridades.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <textarea className="gt-textarea" name="descricao" placeholder="Descrição" required value={form.descricao} onChange={handleChange} />
                {erroAbertura && (
                  <div style={{
                    color: '#ff4d6d',
                    background: '#2a1a1a',
                    borderRadius: 10,
                    padding: '10px 16px',
                    marginBottom: 12,
                    fontWeight: 500,
                    border: '1.5px solid #ff4d6d',
                    boxShadow: '0 2px 8px #ff4d6d22',
                    fontSize: 16
                  }}>{erroAbertura}</div>
                )}
                <button className="gt-btn-primary" type="submit" disabled={loadingAbertura || (erroAbertura && erroAbertura.includes('Email'))} aria-busy={loadingAbertura} aria-label="Abrir chamado">
                  {loadingAbertura ? <span className="gt-spinner" aria-label="Carregando" /> : 'Abrir Chamado'}
                </button>
              </form>
            ) : (
              <ConsultarChamado 
                onResult={(data) => { setChamadoConsulta(data); setModal('consulta'); setListaChamados(null); }}
                onList={(lista) => { setListaChamados(lista); setModal('lista'); setChamadoConsulta(null); }}
              />
            )}
          </div>
          <div className="gt-login-card">
            <div className="gt-logo-area">
              <img src={logoGridTicks} alt="GridTicks Logo" className="gt-logo-img" />
            </div>

            {/* Painel restrito para usuários logados */}
            {usuario && (
              <div style={{
                background: '#1e4fff11',
                border: '1.5px solid #1e4fff44',
                borderRadius: 12,
                padding: 18,
                marginBottom: 18,
                color: '#e0e3f0',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 18
              }}>
                Bem-vindo ao painel restrito<br />
                <span style={{color: '#1e90ff'}}>{usuario.nome}</span>
                <div style={{fontSize: 15, color: '#b6c6f5', marginTop: 4}}>
                  Perfil: <b>{usuario.role}</b>
                </div>
              </div>
            )}

            {/* Formulário de login só aparece se não estiver logado */}
            {!usuario && (
            <form className="gt-login-form" autoComplete="off"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoginErro("");
                setLoginLoading(true);
                try {
                  const res = await fetch('http://localhost:5000/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginForm)
                  });
                  const data = await res.json();
                  if (res.ok && data.token) {
                    setLoginErro("");
                    setLoginForm({ email: '', senha: '' });
                    setTimeout(() => setLoginErro(""), 2000);
                    setLoginErro("Login realizado com sucesso!");
                    handleLoginSuccess({ ...data.user, token: data.token });
                  } else {
                    setLoginErro(data.error || MESSAGES.ERRO_LOGIN);
                  }
                } catch (err) {
                  setLoginErro(MESSAGES.ERRO_CONEXAO);
                }
                setLoginLoading(false);
              }}
            >
              <label className="gt-label">Login</label>
              <input className="gt-input" placeholder="Usuário ou Email" name="email" type="email" required value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
              <label className="gt-label">Senha</label>
              <input className="gt-input" placeholder="Senha" name="senha" type="password" required value={loginForm.senha} onChange={e => setLoginForm(f => ({ ...f, senha: e.target.value }))} />
              {loginErro && (
                <div style={{
                  color: '#ff4d6d',
                  background: '#2a1a1a',
                  borderRadius: 10,
                  padding: '10px 16px',
                  marginBottom: 12,
                  fontWeight: 500,
                  border: '1.5px solid #ff4d6d',
                  boxShadow: '0 2px 8px #ff4d6d22',
                  fontSize: 16
                }}>{loginErro}</div>
              )}
              <button className="gt-btn-primary" type="submit" disabled={loginLoading} aria-busy={loginLoading} aria-label="Entrar">
                {loginLoading ? <span className="gt-spinner" aria-label="Carregando" /> : 'ENTRAR'}
              </button>
              {usuario && (
                <div style={{
                  marginTop: 18,
                  color: '#1e90ff',
                  fontWeight: 600,
                  fontSize: 17,
                  textAlign: 'center',
                  background: '#1e4fff11',
                  borderRadius: 8,
                  padding: '8px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8
                }}>
                  Olá, {usuario.nome}!
                  <button className="gt-btn-secondary" style={{marginTop: 4, minWidth: 90, fontSize: 15, padding: '4px 0'}}
                    onClick={() => {
                      setUsuario(null);
                      localStorage.removeItem('usuario');
                    }}
                  >Logout</button>
                </div>
              )}
            </form>
            )}
          </div>
        </div>
      </div>

      {/* Modal global para lista de chamados */}
  {modal === 'lista' && Array.isArray(listaChamados) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(18,21,39,0.82)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #161826 0%, #1f2334 60%, #252b42 100%)',
            borderRadius: 28,
            border: '1.5px solid #2a3b6b',
            boxShadow: '0 8px 40px -8px #1e4fff55, 0 4px 18px -4px #10162b',
            padding: '2.2rem 2.4rem 2.4rem 2.4rem',
            color: '#e0e3f0',
            width: '100%',
            maxWidth: 540,
            minWidth: 320,
            maxHeight: 600,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 10,
            }}>
              <div style={{
                fontWeight: 700,
                fontSize: 26,
                textAlign: 'left',
                background: 'linear-gradient(90deg,#fff,#b6c6f5)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                letterSpacing: 0.5,
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
                paddingLeft: 2
              }}>Chamados encontrados</div>
              <button aria-label="Fechar" onClick={() => { setListaChamados(null); setModal(null); setChamadoConsulta(null); setCurrentPage(1); }}
                style={{background:'transparent', border:'none', color:'#b6c6f5', fontSize:24, cursor:'pointer', lineHeight:1, padding:4, borderRadius:8}}>&times;</button>
            </div>
            <div
              className="gt-modal-lista-scroll"
              style={{
                flex: 1,
                width: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                marginBottom: 2,
                maxHeight: 340,
                padding: '0 28px 0 4px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                position: 'relative',
              }}
            >
              {listaChamados.length === 0 && (
                <div style={{color: '#b6c6f5', textAlign: 'center', marginTop: 38, fontSize: 18, fontWeight: 500, display:'flex', flexDirection:'column', alignItems:'center', gap:10}}>
                  <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginBottom:4}}>
                    <circle cx="27" cy="27" r="27" fill="#1e4fff22"/>
                    <path d="M18 27h18M27 18v18" stroke="#1e4fff" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  Nenhum chamado encontrado.
                </div>
              )}
              {/* Paginação */}
              {listaChamados.slice((currentPage-1)*itensPorPagina, currentPage*itensPorPagina).map((c, idx, arr) => (
                <div
                  key={c._id || c.id}
                  style={{
                    minWidth:0,
                    width:'100%',
                    animation: 'fadeSlideIn 0.4s',
                    borderBottom: idx < arr.length-1 ? '1px solid #23243a' : 'none',
                    marginBottom: idx < arr.length-1 ? 6 : 0,
                    paddingBottom: idx < arr.length-1 ? 6 : 0,
                  }}
                >
                  <KanbanCardVisual chamado={c} onClick={() => { setChamadoConsulta(c); setModal('consulta'); setListaChamados(null); }} isConsulta={true} />
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              marginTop: 2,
              marginBottom: 0,
              width: '100%'
            }}>
              <button
                className="gt-btn-paginacao-svg"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1e4fff 60%, #1e90ff 100%)',
                  boxShadow: '0 2px 8px #1e4fff33',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  outline: 'none',
                  padding: 0
                }}
                onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                title="Página anterior"
                onMouseEnter={e => { if(currentPage !== 1) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="11" fill="url(#gradLeft)"/>
                  <path d="M13.5 7L9.5 11L13.5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradLeft" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1e4fff"/>
                      <stop offset="1" stopColor="#1e90ff"/>
                    </linearGradient>
                  </defs>
                </svg>
              </button>
              <button
                className="gt-btn-paginacao-svg"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1e4fff 60%, #1e90ff 100%)',
                  boxShadow: '0 2px 8px #1e4fff33',
                  opacity: currentPage === Math.ceil(listaChamados.length/itensPorPagina) ? 0.5 : 1,
                  cursor: currentPage === Math.ceil(listaChamados.length/itensPorPagina) ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  outline: 'none',
                  padding: 0
                }}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(listaChamados.length/itensPorPagina), p+1))}
                disabled={currentPage === Math.ceil(listaChamados.length/itensPorPagina)}
                aria-label="Próxima página"
                title="Próxima página"
                onMouseEnter={e => { if(currentPage !== Math.ceil(listaChamados.length/itensPorPagina)) e.currentTarget.style.transform = 'scale(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="11" fill="url(#gradRight)"/>
                  <path d="M8.5 7L12.5 11L8.5 15" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="gradRight" x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1e4fff"/>
                      <stop offset="1" stopColor="#1e90ff"/>
                    </linearGradient>
                  </defs>
                </svg>
              </button>
            </div>
            <div style={{textAlign: 'center', color: '#b6c6f5', fontWeight: 500, fontSize: 15, marginTop: 0, marginBottom: 0, width: '100%'}}>
              Página {currentPage} de {Math.ceil(listaChamados.length/itensPorPagina)}
            </div>
          </div>
        </div>
      )}

      {/* Modal de consulta (agora com visual Kanban) */}
      {modal === 'consulta' && chamadoConsulta && (
        <ChamadoDetalhesModal chamado={chamadoConsulta} onClose={() => { setModal(null); setChamadoConsulta(null); setCurrentPage(1); }} usuario={usuario} />
      )}

      {/* Modal de sucesso global */}
      {modal === 'sucesso' && (
        <div style={{
          position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(18,21,39,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeInBg 0.4s'
        }}>
          <div style={{
            background: 'linear-gradient(120deg, #23243a 80%, #1e4fff22 100%)', borderRadius: 24, boxShadow: '0 8px 40px #1e4fff33',
            padding: '2.7rem 2.2rem 2.2rem 2.2rem', minWidth: 350, maxWidth: '92vw', textAlign: 'center', color: '#e0e3f0',
            border: '2px solid #2a3b6b',
            transform: 'scale(0.95)', opacity: 0, animation: 'modalPop 0.5s cubic-bezier(.68,-0.55,.27,1.55) forwards',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: -30, left: -30, width: 120, height: 120,
              background: 'radial-gradient(circle, #1e4fff33 0%, transparent 80%)',
              zIndex: 0
            }} />
            <div style={{
              position: 'absolute',
              bottom: -30, right: -30, width: 120, height: 120,
              background: 'radial-gradient(circle, #1e90ff22 0%, transparent 80%)',
              zIndex: 0
            }} />
            <div style={{fontSize: 44, marginBottom: 8, color: '#1e90ff', userSelect: 'none', zIndex: 1, position: 'relative'}}>😊</div>
            <h2 style={{color: '#1e90ff', marginBottom: 10, fontWeight: 700, fontSize: 24, letterSpacing: 0.5, zIndex: 1, position: 'relative'}}>Chamado enviado com sucesso!</h2>
            <div style={{fontSize: '1.13rem', marginBottom: 18, color: '#b6c6f5', fontWeight: 400, zIndex: 1, position: 'relative'}}>
              O seu chamado foi direcionado para o time de <b>MIS/Dados</b> e logo você terá um retorno da equipe.
            </div>
            <div style={{fontSize: '1.08rem', color: '#b6c6f5', marginBottom: 22, zIndex: 1, position: 'relative'}}>
              Obrigado por ajudar a gente a melhorar cada vez mais! <span style={{fontSize: 20, verticalAlign: 'middle'}}>🚀</span>
            </div>
            <button className="gt-btn-primary" style={{width: 140, margin: '0 auto', fontSize: 18, fontWeight: 600, borderRadius: 8, boxShadow: '0 2px 12px #1e4fff33', zIndex: 1, position: 'relative'}} onClick={() => {
              setModal(null);
              setForm({ titulo: '', email: '', area: '', prazo: '', prioridade: '', descricao: '' });
              setSegmentacao('');
              // Se alerta gestor está pendente, mostra agora
              if (alertaGestor === null && typeof window !== 'undefined') {
                setTimeout(() => {
                  setAlertaGestor(prev => prev);
                }, 100);
              }
            }}>
              OK
            </button>
            <style>{`
              @keyframes modalPop {
                0% { transform: scale(0.95); opacity: 0; }
                60% { transform: scale(1.04); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
              }
              @keyframes fadeInBg {
                0% { opacity: 0; }
                100% { opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}
      {/* Modal de priorização global */}
      {priorizacao && (
        <PriorizacaoModal
          email={priorizacao.email}
          area={priorizacao.area}
          carteira={priorizacao.carteira}
          onClose={() => setPriorizacao(null)}
          onSalvo={(mensagemGestor) => {
            setModal('sucesso');
            if (mensagemGestor) {
              setAlertaGestor(mensagemGestor);
            }
          }}
        />
      )}
      {/* Popup alerta gestor no canto inferior esquerdo */}
      {alertaGestor && (
        <div style={{
          position: 'fixed',
          left: 24,
          bottom: 24,
          zIndex: 3000,
          background: '#23243a',
          color: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 24px #1e4fff33',
          border: '2px solid #ff4d6d',
          padding: '18px 22px',
          minWidth: 320,
          maxWidth: '90vw',
          fontSize: 17,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'fadeInAlert 0.5s',
        }}>
          <span style={{fontSize: 28, color: '#ff4d6d'}}>⚠️</span>
          <span>{alertaGestor}</span>
          <button style={{
            marginLeft: 18,
            background: '#ff4d6d',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 15,
            padding: '6px 16px',
            cursor: 'pointer',
          }} onClick={() => setAlertaGestor(null)}>Fechar</button>
          <style>{`
            @keyframes fadeInAlert {
              0% { opacity: 0; transform: translateY(30px); }
              100% { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
      <footer className="gt-footer">
        © {new Date().getFullYear()} GridTicks. Todos os direitos reservados.
      </footer>
    </>
  );
}

export default App;