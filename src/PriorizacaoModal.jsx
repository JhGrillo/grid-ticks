
import React, { useEffect, useState } from 'react';
import './PriorizacaoModal.css';
import { MESSAGES } from './utils/messages.js';

export default function PriorizacaoModal({ email, area, carteira, onClose, onSalvo }) {
  const [chamados, setChamados] = useState([]);
  const [ordens, setOrdens] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function fetchBloqueados() {
      setLoading(true);
      try {
        const res = await fetch(`/api/chamados/bloqueados?email=${email}&area=${area}&carteira=${carteira}`);
        const data = await res.json();
        setChamados(data);
        // Preenche ordens iniciais
        const ordensInit = {};
        data.forEach(c => {
          ordensInit[c._id] = c.ordemExecucao || '';
        });
        setOrdens(ordensInit);
      } catch (err) {
  setErro(MESSAGES.ERRO_BLOQUEADOS);
      }
      setLoading(false);
    }
    fetchBloqueados();
  }, [email, area, carteira]);

  function handleChange(id, value) {
    setOrdens({ ...ordens, [id]: value });
  }

  function validarOrdens() {
    const valores = Object.values(ordens);
    if (valores.some(v => v === '' || v === null || isNaN(Number(v)))) {
      setErro(MESSAGES.ORDEM_VAZIA);
      return false;
    }
    if (valores.some(v => Number(v) < 1)) {
      setErro(MESSAGES.ORDEM_INVALIDA);
      return false;
    }
    const setOrdens = new Set(valores.map(Number));
    if (setOrdens.size !== valores.length) {
      setErro(MESSAGES.ORDEM_REPETIDA);
      return false;
    }
    setErro('');
    return true;
  }

  async function handleSalvar() {
    if (!validarOrdens()) return;
    setSalvando(true);
    setErro('');
    try {
      const payload = {
        ordens: Object.entries(ordens).map(([id, ordemExecucao]) => ({ id, ordemExecucao: Number(ordemExecucao) }))
      };
      const res = await fetch('/api/chamados/ordem', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  if (!res.ok) throw new Error(MESSAGES.ERRO_SALVAR_ORDEM);
      const data = await res.json();
      // Se persistir bloqueio gestor, chama onSalvo com info do gestor
      if (data.bloqueio === 'gestor' && data.mensagem) {
        onSalvo && onSalvo(data.mensagem);
      } else {
        onSalvo && onSalvo();
      }
      onClose && onClose();
    } catch (err) {
      setErro(MESSAGES.ERRO_SALVAR_ORDEM);
    }
    setSalvando(false);
  }

  if (!email || !area || !carteira) return null;

  return (
    <div className="modal-priorizacao anim-pop">
      <div className="modal-content">
        <div style={{textAlign: 'center', marginBottom: 10}}>
          <span style={{fontSize: 38, color: '#1e90ff', marginBottom: 2, display: 'inline-block'}}>⚠️</span>
          <h2 style={{color: '#1e90ff', fontWeight: 700, fontSize: 24, margin: '8px 0 0 0'}}>Priorize seus chamados</h2>
          <div style={{color: '#b6c6f5', fontSize: 16, marginTop: 6, marginBottom: 10}}>
            Para liberar seus chamados, defina a ordem de execução (1, 2, 3...).
          </div>
        </div>
        {loading ? <p>Carregando...</p> : (
          <>
            {chamados.length === 0 ? <p style={{textAlign: 'center', color: '#b6c6f5'}}>Nenhum chamado bloqueado.</p> : (
              <table style={{marginBottom: 10}}>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Descrição</th>
                    <th>Prioridade</th>
                    <th>Ordem</th>
                  </tr>
                </thead>
                <tbody>
                  {chamados.map(c => (
                    <tr key={c._id}>
                      <td>{c.titulo}</td>
                      <td>{c.descricao}</td>
                      <td>{c.prioridade}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={ordens[c._id]}
                          onChange={e => handleChange(c._id, e.target.value)}
                          style={{ width: 50, fontWeight: 600, fontSize: 16, textAlign: 'center', border: '2px solid #1e90ff' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {erro && <p className="erro" style={{display: 'flex', alignItems: 'center', gap: 8}}><span style={{fontSize: 20}}>❗</span> {erro}</p>}
            <div className="modal-actions" style={{justifyContent: 'center'}}>
              <button
                onClick={handleSalvar}
                disabled={salvando || chamados.length === 0}
                style={{
                  background: 'linear-gradient(90deg,#1e90ff 60%,#1e4fff 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 18,
                  boxShadow: '0 2px 12px #1e4fff33',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 0',
                  minWidth: 120,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </>
        )}
      </div>
      <style>{`
        .anim-pop {
          animation: modalPop 0.5s cubic-bezier(.68,-0.55,.27,1.55) forwards;
        }
        @keyframes modalPop {
          0% { transform: scale(0.95); opacity: 0; }
          60% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 600px) {
          .modal-content {
            min-width: 90vw;
            padding: 18px 6vw;
          }
          table {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
