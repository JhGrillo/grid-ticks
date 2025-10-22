import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList, LineChart, Line
} from 'recharts';

// Função customizada para labels em barras (sempre dentro da barra, ou acima se for muito pequena)
function renderBarLabel({ x, y, width, height, value }) {
  const fontSize = 15;
  const minHeight = 24;
  // Se a barra for alta, coloca o label dentro, senão coloca acima
  const isTall = height > minHeight;
  return (
    <text
      x={x + width / 2}
      y={isTall ? y + 18 : y - 6}
      fill={isTall ? '#fff' : '#fff'}
      fontSize={fontSize}
      fontWeight="bold"
      textAnchor="middle"
      style={{ textShadow: '0 1px 4px #23243a' }}
    >
      {value}
    </text>
  );
}

// Função customizada para labels em pizza (sempre centralizado na fatia)
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value }) {
  const RADIAN = Math.PI / 180;
  // Posição do label: centro da fatia
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      fontSize={15}
      fontWeight="bold"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ textShadow: '0 1px 4px #23243a' }}
    >
      {value}
    </text>
  );
}

// Componente base para resumo de analytics dos chamados
export default function AnalyticsResumo({ chamados }) {
  // Aqui você pode implementar a lógica de agrupamento e contagem
  // Exemplo de estrutura inicial:
  if (!chamados || !Array.isArray(chamados)) {
    return <div>Nenhum dado disponível.</div>;
  }


  // Filtros globais
  const [statusFiltro, setStatusFiltro] = useState('');
  const [carteiraFiltro, setCarteiraFiltro] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState({ de: '', ate: '' });

  // Agrupamentos
  const statusCount = {};
  const analistaCount = {};
  const areaCount = {};
  const carteiraCount = {};
  let atrasados = 0;
  let semAtribuicao = 0;
  const retornoValidacao = {};
  const agora = new Date();
  // Contagem de entregas com atraso por analista
  const entregasAtrasoPorAnalista = {};
  // Tempo médio de atendimento por analista
  const tempoTotalPorAnalista = {};
  const chamadosFinalizadosPorAnalista = {};

  // Listas únicas para filtros
  const statusUnicos = Array.from(new Set(chamados.map(c => c.status).filter(s => s && s.toLowerCase() !== 'aberto')));
  const carteirasUnicas = Array.from(new Set(chamados.map(c => c.carteira).filter(Boolean)));
  const areasUnicas = Array.from(new Set(chamados.map(c => c.area).filter(Boolean)));

  // Aplicar filtros globais
  const chamadosFiltrados = chamados.filter(c => {
    let ok = true;
    if (carteiraFiltro && c.carteira !== carteiraFiltro) ok = false;
    if (areaFiltro && c.area !== areaFiltro) ok = false;
    if (periodoFiltro.de) {
      const dataAbertura = c.createdAt ? new Date(c.createdAt) : null;
      if (!dataAbertura || dataAbertura < new Date(periodoFiltro.de)) ok = false;
    }
    if (periodoFiltro.ate) {
      const dataAbertura = c.createdAt ? new Date(c.createdAt) : null;
      if (!dataAbertura || dataAbertura > new Date(periodoFiltro.ate + 'T23:59:59')) ok = false;
    }
    return ok;
  });

  chamadosFiltrados.forEach(c => {
    // Status
    statusCount[c.status] = (statusCount[c.status] || 0) + 1;
    // Analista (considera filtro de status)
    if (c.responsavel && (!statusFiltro || c.status === statusFiltro)) {
      analistaCount[c.responsavel] = (analistaCount[c.responsavel] || 0) + 1;
    }
    // Área
    if (c.area) areaCount[c.area] = (areaCount[c.area] || 0) + 1;
    // Carteira
    if (c.carteira) carteiraCount[c.carteira] = (carteiraCount[c.carteira] || 0) + 1;
    // Atrasados
    if (c.prazo && new Date(c.prazo) < agora && c.status !== 'Finalizado') atrasados++;
    // Sem atribuição
    if (!c.responsavel) semAtribuicao++;

    // Contar quantas vezes o analista teve a atualização 'Reprovação' em chamados que ele é responsável
    if (c.responsavel && Array.isArray(c.atualizacoes)) {
      const reprovacoes = c.atualizacoes.filter(a =>
        (typeof a === 'string' && a.toLowerCase().includes('reprovação')) ||
        (typeof a === 'object' && a.descricao && typeof a.descricao === 'string' && a.descricao.toLowerCase().includes('reprovação'))
      ).length;
      if (reprovacoes > 0) {
        retornoValidacao[c.responsavel] = (retornoValidacao[c.responsavel] || 0) + reprovacoes;
      }
    }
    // Entregas com atraso por analista
    // Considera chamado finalizado, com prazo definido, e data de finalização > prazo
    if (
      c.status && c.status.toLowerCase() === 'finalizado' &&
      c.prazo && c.responsavel
    ) {
      // Tenta pegar data de finalização (updatedAt, dataFinalizacao, ou similar)
      let dataFinalizacao = null;
      if (c.updatedAt) dataFinalizacao = new Date(c.updatedAt);
      else if (c.dataFinalizacao) dataFinalizacao = new Date(c.dataFinalizacao);
      else if (c.finalizadoEm) dataFinalizacao = new Date(c.finalizadoEm);
      // Se não tiver campo, assume que não é possível calcular
      if (dataFinalizacao && new Date(c.prazo) < dataFinalizacao) {
        entregasAtrasoPorAnalista[c.responsavel] = (entregasAtrasoPorAnalista[c.responsavel] || 0) + 1;
      }
    }
    // Tempo médio de atendimento por analista
    if (
      c.status && c.status.toLowerCase() === 'finalizado' &&
      c.responsavel && c.createdAt
    ) {
      let dataFinalizacao = null;
      if (c.updatedAt) dataFinalizacao = new Date(c.updatedAt);
      else if (c.dataFinalizacao) dataFinalizacao = new Date(c.dataFinalizacao);
      else if (c.finalizadoEm) dataFinalizacao = new Date(c.finalizadoEm);
      const dataCriacao = new Date(c.createdAt);
      if (dataFinalizacao && dataCriacao && dataFinalizacao > dataCriacao) {
        const tempo = (dataFinalizacao - dataCriacao) / 1000; // segundos
        tempoTotalPorAnalista[c.responsavel] = (tempoTotalPorAnalista[c.responsavel] || 0) + tempo;
        chamadosFinalizadosPorAnalista[c.responsavel] = (chamadosFinalizadosPorAnalista[c.responsavel] || 0) + 1;
      }
    }
  });

  // Dados para gráficos
  const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  const analistaData = Object.entries(analistaCount).map(([name, value]) => ({ name, value }));
  const areaData = Object.entries(areaCount).map(([name, value]) => ({ name, value }));
  const carteiraData = Object.entries(carteiraCount).map(([name, value]) => ({ name, value }));
  const retornoValidacaoData = Object.entries(retornoValidacao).map(([name, value]) => ({ name, value }));
  const entregasAtrasoData = Object.entries(entregasAtrasoPorAnalista).map(([name, value]) => ({ name, value }));
  // Tempo médio de atendimento por analista (em horas, 2 casas decimais)
  const tempoMedioAnalistaData = Object.entries(tempoTotalPorAnalista).map(([name, total]) => {
    const count = chamadosFinalizadosPorAnalista[name] || 1;
    return { name, value: +(total / count / 3600).toFixed(2) };
  });

  // Tempo médio em cada status (em horas)
  // --- Taxa de retrabalho: % de chamados que retornam para execução após validação ---
  let totalComValidacao = 0;
  let totalComRetornoExecucao = 0;
  chamadosFiltrados.forEach(c => {
    if (Array.isArray(c.atualizacoes)) {
      // Procura se há pelo menos uma ida para validação e depois volta para execução
      let foiParaValidacao = false;
      let voltouParaExecucao = false;
      c.atualizacoes.forEach(a => {
        if (typeof a === 'string') {
          if (/status alterado para.*valida[çc][aã]o/i.test(a)) {
            foiParaValidacao = true;
          }
          if (foiParaValidacao && /status alterado para.*execu[çc][aã]o/i.test(a)) {
            voltouParaExecucao = true;
          }
        }
      });
      if (foiParaValidacao) totalComValidacao++;
      if (foiParaValidacao && voltouParaExecucao) totalComRetornoExecucao++;
    }
  });
  const taxaRetrabalho = totalComValidacao > 0 ? ((totalComRetornoExecucao / totalComValidacao) * 100).toFixed(1) : '0.0';
  // --- Evolução de chamados ao longo do tempo (mensal) ---
  // Agrupa chamados por mês de abertura
  const chamadosPorMes = {};
  chamadosFiltrados.forEach(c => {
    if (c.createdAt) {
      const data = new Date(c.createdAt);
      const mes = data.getMonth() + 1;
      const ano = data.getFullYear();
      const chave = `${ano}-${mes.toString().padStart(2, '0')}`;
      chamadosPorMes[chave] = (chamadosPorMes[chave] || 0) + 1;
    }
  });
  // Ordena por data
  const evolucaoData = Object.entries(chamadosPorMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => {
      // Formata para "MM/yyyy"
      const [ano, mes] = name.split('-');
      return { name: `${mes}/${ano}`, value };
    });
  const tempoTotalPorStatus = {};
  const contagemPorStatus = {};
  chamadosFiltrados.forEach(c => {
    // 1. Se houver historicoStatus estruturado
    if (Array.isArray(c.historicoStatus) && c.historicoStatus.length > 1) {
      for (let i = 1; i < c.historicoStatus.length; i++) {
        const prev = c.historicoStatus[i - 1];
        const curr = c.historicoStatus[i];
        const status = typeof prev === 'object' ? prev.status : prev;
        const dataIni = new Date(typeof prev === 'object' ? prev.data : null);
        const dataFim = new Date(typeof curr === 'object' ? curr.data : null);
        if (status && dataIni && dataFim && dataFim > dataIni) {
          const tempo = (dataFim - dataIni) / 1000; // segundos
          tempoTotalPorStatus[status] = (tempoTotalPorStatus[status] || 0) + tempo;
          contagemPorStatus[status] = (contagemPorStatus[status] || 0) + 1;
        }
      }
    } else if (Array.isArray(c.atualizacoes) && c.atualizacoes.length > 0) {
      // 2. Extrai transições de status do array atualizacoes
      // Exemplo: "[13/09/2025, 02:05:25 - ...] Status alterado para Em Validação"
      const transicoes = [];
      c.atualizacoes.forEach(a => {
        if (typeof a === 'string') {
          // Regex para data e status
          const match = a.match(/\[(\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2}:\d{2})[^\]]*\]\s*Status alterado para ([^\n]+)/i);
          if (match) {
            // Data no formato dd/MM/yyyy, HH:mm:ss
            const [_, dia, hora, status] = match;
            const dataStr = `${dia} ${hora}`;
            // Converte para Date (ajusta para UTC se necessário)
            const [d, m, y] = dia.split('/');
            const data = new Date(`${y}-${m}-${d}T${hora}`);
            transicoes.push({ status: status.trim(), data });
          }
        }
      });
      // Ordena por data
      transicoes.sort((a, b) => a.data - b.data);
      // Se não houver transição, tenta usar createdAt e status atual
      if (transicoes.length === 0 && c.createdAt && c.status) {
        transicoes.push({ status: c.status, data: new Date(c.createdAt) });
      }
      // Adiciona status final se finalizado
      if (c.status && c.status.toLowerCase() === 'finalizado' && c.updatedAt) {
        transicoes.push({ status: 'Finalizado', data: new Date(c.updatedAt) });
      }
      // Calcula tempo em cada status
      for (let i = 1; i < transicoes.length; i++) {
        const prev = transicoes[i - 1];
        const curr = transicoes[i];
        if (prev.status && prev.data && curr.data && curr.data > prev.data) {
          const tempo = (curr.data - prev.data) / 1000; // segundos
          tempoTotalPorStatus[prev.status] = (tempoTotalPorStatus[prev.status] || 0) + tempo;
          contagemPorStatus[prev.status] = (contagemPorStatus[prev.status] || 0) + 1;
        }
      }
    }
  });
  const tempoMedioStatusData = Object.entries(tempoTotalPorStatus).map(([status, total]) => {
    const count = contagemPorStatus[status] || 1;
    return { name: status, value: +(total / count / 3600).toFixed(2) };
  });

  const COLORS = ['#1e90ff', '#ffb300', '#00e396', '#ff4d6d', '#4caf50', '#b6c6f5', '#2ecc71', '#23243a'];

  return (
    <div style={{ 
      padding: 32, 
      background: '#23243a'
    }}>
      <h2 style={{ color: '#b6c6f5', letterSpacing: 1, fontWeight: 800, marginBottom: 28 }}>Resumo Geral dos Chamados</h2>
      {/* Filtros globais */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24, alignItems: 'end' }}>
        <div>
          <label style={{ color: '#b6c6f5', fontWeight: 500 }}>Carteira:</label><br />
          <select value={carteiraFiltro} onChange={e => setCarteiraFiltro(e.target.value)} style={{ background: '#23243a', color: '#fff', border: '1px solid #2a3b6b', borderRadius: 8, padding: '6px 12px', fontSize: 15, minWidth: 120 }}>
            <option value="">Todas</option>
            {carteirasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#b6c6f5', fontWeight: 500 }}>Área:</label><br />
          <select value={areaFiltro} onChange={e => setAreaFiltro(e.target.value)} style={{ background: '#23243a', color: '#fff', border: '1px solid #2a3b6b', borderRadius: 8, padding: '6px 12px', fontSize: 15, minWidth: 120 }}>
            <option value="">Todas</option>
            {areasUnicas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#b6c6f5', fontWeight: 500 }}>Período (Abertura):</label><br />
          <input type="date" value={periodoFiltro.de} onChange={e => setPeriodoFiltro(f => ({ ...f, de: e.target.value }))} style={{ background: '#23243a', color: '#fff', border: '1px solid #2a3b6b', borderRadius: 8, padding: '6px 12px', fontSize: 15, marginRight: 6 }} />
          <span style={{ color: '#b6c6f5', margin: '0 4px' }}>até</span>
          <input type="date" value={periodoFiltro.ate} onChange={e => setPeriodoFiltro(f => ({ ...f, ate: e.target.value }))} style={{ background: '#23243a', color: '#fff', border: '1px solid #2a3b6b', borderRadius: 8, padding: '6px 12px', fontSize: 15 }} />
        </div>
      </div>
  <div
    style={{
      display: 'flex',
      gap: 32,
      flexWrap: 'wrap',
      marginBottom: 32,
      justifyContent: 'flex-start',
      rowGap: 24,
      alignItems: 'stretch',
    }}
  >
    <div
      style={{
        background: 'rgba(35,36,58,0.98)',
        color: '#fff',
        borderRadius: 16,
        padding: 22,
        minWidth: 140,
        minHeight: 110,
        flex: '1 1 220px',
        maxWidth: 340,
        boxShadow: '0 4px 24px 0 rgba(30,144,255,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.10)',
        border: '1.5px solid #ffb300',
        transition: 'box-shadow 0.2s',
        fontWeight: 600,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {/* Ícone relógio */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="#ffb300" strokeWidth="2.2"/><path d="M11 6.5V11L14 13" stroke="#ffb300" strokeWidth="2.2" strokeLinecap="round"/></svg>
        </span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#ffb300' }}>Atrasados</span>
      </div>
      <div style={{ fontSize: 34, color: '#fff', textShadow: '0 2px 8px #1e90ff33' }}>{atrasados}</div>
    </div>
    <div
      style={{
        background: 'rgba(35,36,58,0.98)',
        color: '#fff',
        borderRadius: 16,
        padding: 22,
        minWidth: 140,
        minHeight: 110,
        flex: '1 1 220px',
        maxWidth: 340,
        boxShadow: '0 4px 24px 0 rgba(30,144,255,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.10)',
        border: '1.5px solid #00e396',
        transition: 'box-shadow 0.2s',
        fontWeight: 600,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {/* Ícone usuário */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="8" r="4" stroke="#00e396" strokeWidth="2.2"/><path d="M3.5 18c0-2.485 3.134-4.5 7.5-4.5s7.5 2.015 7.5 4.5" stroke="#00e396" strokeWidth="2.2"/></svg>
        </span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#00e396' }}>Sem atribuição</span>
      </div>
      <div style={{ fontSize: 34, color: '#fff', textShadow: '0 2px 8px #00e39633' }}>{semAtribuicao}</div>
    </div>
    <div
      style={{
        background: 'rgba(35,36,58,0.98)',
        color: '#fff',
        borderRadius: 16,
        padding: 22,
        minWidth: 180,
        minHeight: 110,
        flex: '1 1 260px',
        maxWidth: 380,
        boxShadow: '0 4px 24px 0 rgba(30,144,255,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.10)',
        border: '1.5px solid #ff4d6d',
        transition: 'box-shadow 0.2s',
        fontWeight: 600,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {/* Ícone loop/retrabalho */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6.5 7.5V4.5H3.5" stroke="#ff4d6d" strokeWidth="2.2" strokeLinecap="round"/><path d="M3.5 11c0-4.142 4.03-7.5 8.5-7.5 3.866 0 7 2.634 7 6.5" stroke="#ff4d6d" strokeWidth="2.2"/><path d="M15.5 14.5v3h3" stroke="#ff4d6d" strokeWidth="2.2" strokeLinecap="round"/><path d="M18.5 11c0 4.142-4.03 7.5-8.5 7.5-3.866 0-7-2.634-7-6.5" stroke="#ff4d6d" strokeWidth="2.2"/></svg>
        </span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#ff4d6d' }}>Taxa de Retrabalho</span>
      </div>
      <div style={{ fontSize: 34, color: '#fff', textShadow: '0 2px 8px #ff4d6d33' }}>{taxaRetrabalho}%</div>
      <div style={{ fontSize: 13, color: '#b6c6f5', marginTop: 2 }}>% de chamados que retornam para execução após validação</div>
    </div>
  </div>

      {/* Gráfico de evolução de chamados ao longo do tempo (linha) */}
      <div style={{ background: '#202534', borderRadius: 16, padding: 18, marginBottom: 32 }}>
        <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Evolução de Chamados Abertos por Mês</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={evolucaoData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <XAxis dataKey="name" stroke="#b6c6f5" />
            <YAxis stroke="#b6c6f5" allowDecimals={false} />
            <Tooltip content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div style={{ background: '#23243a', border: '1px solid #4caf50', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                    <div><span style={{ color: '#b6c6f5' }}>Mês:</span> {label}</div>
                    <div><span style={{ color: '#4caf50' }}>Chamados abertos:</span> {payload[0].value}</div>
                  </div>
                );
              }
              return null;
            }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4caf50"
              strokeWidth={3}
              dot={{ r: 6, fill: '#23243a', stroke: '#4caf50', strokeWidth: 2 }}
              activeDot={{ r: 8, fill: '#4caf50', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            >
              <LabelList dataKey="value" content={renderBarLabel} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Chamados por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="name" stroke="#b6c6f5" />
              <YAxis stroke="#b6c6f5" allowDecimals={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #1e90ff', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Status:</span> {label}</div>
                      <div><span style={{ color: '#1e90ff' }}>Chamados:</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="value" fill="#1e90ff" isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-status-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="value" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Chamados por Analista</h3>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="filtro-status-analista" style={{ color: '#b6c6f5', fontWeight: 500, marginRight: 8 }}>Filtrar por Status:</label>
            <select
              id="filtro-status-analista"
              value={statusFiltro}
              onChange={e => setStatusFiltro(e.target.value)}
              style={{ background: '#23243a', color: '#fff', border: '1px solid #2a3b6b', borderRadius: 8, padding: '6px 12px', fontSize: 15 }}
            >
              <option value="">Todos</option>
              {statusUnicos.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analistaData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="name" stroke="#b6c6f5" />
              <YAxis stroke="#b6c6f5" allowDecimals={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #ffb300', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Analista:</span> {label}</div>
                      <div><span style={{ color: '#ffb300' }}>Chamados:</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="value" fill="#ffb300" isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {analistaData.map((entry, index) => (
                  <Cell key={`cell-analista-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="value" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Chamados por Área</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={areaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={renderPieLabel} labelLine={false} isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {areaData.map((entry, index) => (
                  <Cell key={`cell-area-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                formatter={(value, entry, index) => {
                  // Tenta encontrar a cor correta baseada no nome do valor
                  let color = COLORS[index % COLORS.length];
                  if (entry && entry.color) color = entry.color;
                  if (entry && entry.payload && entry.payload.fill) color = entry.payload.fill;
                  return (
                    <span style={{ color, fontWeight: 600, fontSize: 15 }}>
                      {value}
                    </span>
                  );
                }}
              />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #00e396', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Área:</span> {payload[0].name}</div>
                      <div><span style={{ color: '#00e396' }}>Chamados:</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Chamados por Carteira</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={carteiraData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={renderPieLabel} labelLine={false} isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {carteiraData.map((entry, index) => (
                  <Cell key={`cell-carteira-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                formatter={(value, entry, index) => (
                  <span style={{ color: COLORS[index % COLORS.length], fontWeight: 600, fontSize: 15 }}>
                    {value}
                  </span>
                )}
              />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #b6c6f5', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Carteira:</span> {payload[0].name}</div>
                      <div><span style={{ color: '#b6c6f5' }}>Chamados:</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Retornos de Validação por Analista</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={retornoValidacaoData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="name" stroke="#b6c6f5" />
              <YAxis stroke="#b6c6f5" allowDecimals={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #ff4d6d', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Analista:</span> {label}</div>
                      <div><span style={{ color: '#ff4d6d' }}>Retornos:</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="value" fill="#ff4d6d" isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {retornoValidacaoData.map((entry, index) => (
                  <Cell key={`cell-retorno-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="value" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Entregas com Atraso por Analista</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={entregasAtrasoData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="name" stroke="#b6c6f5" />
              <YAxis stroke="#b6c6f5" allowDecimals={false} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #b71c1c', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Analista:</span> {label}</div>
                      <div><span style={{ color: '#b71c1c' }}>Entregas com atraso:</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="value" fill="#b71c1c" isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {entregasAtrasoData.map((entry, index) => (
                  <Cell key={`cell-atraso-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="value" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos de tempo médio de atendimento por analista e tempo médio em cada status */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Tempo Médio de Atendimento por Analista (h)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tempoMedioAnalistaData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="name" stroke="#b6c6f5" />
              <YAxis stroke="#b6c6f5" allowDecimals={true} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #00e396', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Analista:</span> {label}</div>
                      <div><span style={{ color: '#00e396' }}>Tempo médio (h):</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="value" fill="#00e396" isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {tempoMedioAnalistaData.map((entry, index) => (
                  <Cell key={`cell-tempo-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="value" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: 320, background: '#202534', borderRadius: 16, padding: 18 }}>
          <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Tempo Médio em Cada Status (h)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tempoMedioStatusData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <XAxis dataKey="name" stroke="#b6c6f5" />
              <YAxis stroke="#b6c6f5" allowDecimals={true} />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ background: '#23243a', border: '1px solid #b6c6f5', borderRadius: 8, padding: 12, color: '#fff', fontWeight: 500, fontSize: 15 }}>
                      <div><span style={{ color: '#b6c6f5' }}>Status:</span> {label}</div>
                      <div><span style={{ color: '#b6c6f5' }}>Tempo médio (h):</span> {payload[0].value}</div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="value" fill="#b6c6f5" isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
                {tempoMedioStatusData.map((entry, index) => (
                  <Cell key={`cell-statusmed-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="value" content={renderBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de chamados atrasados e sem atribuição */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Chamados Atrasados</h3>
        <div style={{
          background: '#23243a',
          borderRadius: 14,
          padding: 12,
          color: '#fff',
          border: '1.5px solid #2a3b6b',
          boxShadow: '0 2px 16px 0 #1e90ff22',
          width: '100%',
        }}>
          <table style={{ minWidth: 700, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ color: '#b6c6f5', fontWeight: 600 }}>
                <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Título</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Prazo</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Responsável</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {chamados.filter(c => c.prazo && new Date(c.prazo) < agora && c.status !== 'Finalizado').map((c, idx) => (
                <tr
                  key={c._id || c.id}
                  style={{
                    background: idx % 2 === 0 ? '#23243a' : '#202534',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#1e90ff22')}
                  onMouseOut={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#23243a' : '#202534')}
                >
                  <td style={{ padding: 8 }}>{(c._id || c.id || '').slice(-8)}</td>
                  <td style={{ padding: 8 }}>{c.titulo}</td>
                  <td style={{ padding: 8 }}>{new Date(c.prazo).toLocaleDateString()}</td>
                  <td style={{ padding: 8 }}>{c.responsavel || '-'}</td>
                  <td style={{ padding: 8 }}>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: '#b6c6f5', marginBottom: 12 }}>Chamados sem Atribuição há mais de 1h</h3>
        <div style={{
          background: '#23243a',
          borderRadius: 14,
          padding: 12,
          color: '#fff',
          border: '1.5px solid #2a3b6b',
          boxShadow: '0 2px 16px 0 #1e90ff22',
          width: '100%',
        }}>
          <table style={{ minWidth: 700, width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ color: '#b6c6f5', fontWeight: 600 }}>
                <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Título</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Criado em</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Prazo</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {chamados.filter(c => !c.responsavel && (c.createdAt || c.prazo) && (() => {
                const baseData = c.createdAt ? new Date(c.createdAt) : new Date(c.prazo);
                return (agora - baseData) > 1000 * 60 * 60;
              })()).map((c, idx) => (
                <tr
                  key={c._id || c.id}
                  style={{
                    background: idx % 2 === 0 ? '#23243a' : '#202534',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#1e90ff22')}
                  onMouseOut={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#23243a' : '#202534')}
                >
                  <td style={{ padding: 8 }}>{(c._id || c.id || '').slice(-8)}</td>
                  <td style={{ padding: 8 }}>{c.titulo}</td>
                  <td style={{ padding: 8 }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</td>
                  <td style={{ padding: 8 }}>{c.prazo ? new Date(c.prazo).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: 8 }}>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
