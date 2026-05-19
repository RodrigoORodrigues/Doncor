import React, { useEffect, useMemo, useState } from 'react';
import { Bot, PlayCircle, PauseCircle, Activity, Loader2 } from 'lucide-react';
import { fetchRoboStatus, fetchRoboExecucoes, startRobo, pauseRobo } from '../services/api';

const cardStyle = {
  background: '#fff',
  border: '1px solid #e3e6f0',
  borderRadius: '10px',
  padding: '16px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
};

const Robo = () => {
  const [status, setStatus] = useState(null);
  const [execucoes, setExecucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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


  const handleStart = async () => {
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#27ae60', fontWeight: 600 }}>
            <PlayCircle size={18} /> Status
          </div>
          <div style={{ marginTop: '8px', fontSize: '1.1rem', fontWeight: 600 }}>{statusLabel}</div>
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
      </div>

      <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize:'0.9rem', fontWeight:600, color:'#344050', margin:'0 0 12px' }}>Últimas execuções</h3>
        <table className="data-table">
          <thead>
            <tr><th>Processo</th><th>Início</th><th>Duração</th><th>Status</th></tr>
          </thead>
          <tbody>
            {execucoes.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#8a8d93' }}>Sem execuções registradas.</td></tr>
            ) : execucoes.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.processo}</td>
                <td>{item.inicio}</td>
                <td>{item.duracao}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Robo;
