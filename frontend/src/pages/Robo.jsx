import React, { useEffect, useMemo, useState } from 'react';
import { Bot, PlayCircle, PauseCircle, Activity, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { fetchRoboStatus, fetchRoboExecucoes, startRobo, pauseRobo } from '../services/api';

const cardStyle = {
  background: '#fff',
  border: '1px solid #e3e6f0',
  borderRadius: '10px',
  padding: '16px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
};

const PAGE_SIZE = 5;

const Robo = () => {
  const [status, setStatus] = useState(null);
  const [execucoes, setExecucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const [statusData, execData] = await Promise.all([
          fetchRoboStatus(),
          fetchRoboExecucoes(),
        ]);
        setStatus(statusData);
        setExecucoes(execData);
      } catch (error) {
        console.error('Erro ao carregar dados do robô', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const statusLabel = useMemo(() => {
    if (!status) return 'Carregando';
    if (status.status === 'running') return 'Em execução';
    if (status.status === 'ready') return 'Pronto para iniciar';
    return 'Offline';
  }, [status]);

  const formattedLastRunAt = useMemo(() => {
    if (!status?.lastRunAt) return 'Sem execução recente';
    const date = new Date(status.lastRunAt);
    if (Number.isNaN(date.getTime())) return status.lastRunAt;
    return date.toLocaleString('pt-BR');
  }, [status]);

  const getStatusBadgeVariant = (value) => {
    if (value === 'running' || value === 'sucesso' || value === 'success') return 'default';
    if (value === 'pausado' || value === 'ready' || value === 'pending') return 'secondary';
    if (value === 'erro' || value === 'error' || value === 'offline') return 'destructive';
    return 'outline';
  };

  const filteredExecucoes = useMemo(() => {
    if (statusFilter === 'todos') return execucoes;
    return execucoes.filter((item) => (item.status || '').toLowerCase() === statusFilter);
  }, [execucoes, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredExecucoes.length / PAGE_SIZE));

  const pagedExecucoes = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredExecucoes.slice(start, start + PAGE_SIZE);
  }, [filteredExecucoes, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const lastEvent = useMemo(() => {
    if (execucoes.length === 0) return 'Sem eventos registrados';
    const item = execucoes[0];
    return `${item.processo} (${item.status}) às ${item.inicio}`;
  }, [execucoes]);

  const handleStart = async () => {
    const confirmed = window.confirm('Confirma iniciar o robô agora?');
    if (!confirmed) return;

    try {
      setUpdating(true);
      await startRobo();
      const updated = await fetchRoboStatus();
      setStatus(updated);
    } catch (error) {
      console.error('Erro ao iniciar robô', error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePause = async () => {
    const confirmed = window.confirm('Confirma pausar o robô agora?');
    if (!confirmed) return;

    try {
      setUpdating(true);
      await pauseRobo();
      const updated = await fetchRoboStatus();
      setStatus(updated);
    } catch (error) {
      console.error('Erro ao pausar robô', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'50vh'}}><Loader2 size={32} className="animate-spin" style={{color:'#4979bb',animation:'spin 1s linear infinite'}}/></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={24} /> Robô de Automação
        </h2>
        <p style={{ margin: '8px 0 0', color: '#5E6E82' }}>
          Painel conectado com status e histórico de execuções.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={handleStart} disabled={updating || status?.status === 'running'} style={{ background:'#27ae60', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 12px', fontWeight:600, cursor:'pointer', opacity: (updating || status?.status === 'running') ? 0.7 : 1 }}>
          Iniciar Robô
        </button>
        <button onClick={handlePause} disabled={updating || status?.status !== 'running'} style={{ background:'#e67e22', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 12px', fontWeight:600, cursor:'pointer', opacity: (updating || status?.status !== 'running') ? 0.7 : 1 }}>
          Pausar Robô
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#5E6E82' }}>
          {updating && <RefreshCw size={14} className="animate-spin" />}
          <span style={{ fontSize: '0.85rem' }}>{updating ? 'Atualizando...' : 'Sem atualização pendente'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#27ae60', fontWeight: 600 }}>
            <PlayCircle size={18} /> Status
          </div>
          <div style={{ marginTop: '8px' }}><Badge variant={getStatusBadgeVariant(status?.status)}>{statusLabel}</Badge></div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e67e22', fontWeight: 600 }}>
            <PauseCircle size={18} /> Fila
          </div>
          <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 600 }}>{status?.queue ?? 0} tarefas pendentes</div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2C7BE5', fontWeight: 600 }}>
            <Activity size={18} /> Taxa de sucesso
          </div>
          <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 600 }}>{status?.successRate ?? 0}%</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontWeight: 600, color: '#344050' }}>Último evento</div>
          <div style={{ marginTop: '8px', fontSize: '0.95rem', color: '#5E6E82' }}>{lastEvent}</div>
          <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#8898aa' }}>Última execução: {formattedLastRunAt}</div>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
          <h3 style={{ fontSize:'0.9rem', fontWeight:600, color:'#344050', margin:0 }}>Últimas execuções</h3>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: '1px solid #d7dde8', borderRadius: '6px', padding: '6px 8px' }}>
            <option value="todos">Todos</option>
            <option value="sucesso">Sucesso</option>
            <option value="erro">Erro</option>
            <option value="running">Em execução</option>
          </select>
        </div>

        <table className="data-table">
          <thead>
            <tr><th>Processo</th><th>Início</th><th>Duração</th><th>Status</th></tr>
          </thead>
          <tbody>
            {pagedExecucoes.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#8a8d93' }}>Sem execuções registradas.</td></tr>
            ) : pagedExecucoes.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.processo}</td>
                <td>{item.inicio}</td>
                <td>{item.duracao}</td>
                <td><Badge variant={getStatusBadgeVariant((item.status || '').toLowerCase())}>{item.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Página {currentPage} de {totalPages}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ border: '1px solid #d7dde8', background: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>Anterior</button>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ border: '1px solid #d7dde8', background: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Robo;
