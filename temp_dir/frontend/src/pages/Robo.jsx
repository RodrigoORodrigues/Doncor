import React, { useEffect, useMemo, useState } from 'react';
import { Bot, PlayCircle, PauseCircle, Activity, Loader2, RefreshCw, FileText, FolderArchive, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import {
  fetchRoboStatus,
  fetchRoboExecucoes,
  fetchRoboConfig,
  fetchRoboHistorico,
  startRobo,
  pauseRobo,
  triggerRoboReal,
} from '../services/api';

const cardStyle = {
  background: '#fff',
  border: '1px solid #e3e6f0',
  borderRadius: '10px',
  padding: '16px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
};

const PAGE_SIZE = 5;

const asText = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const Robo = () => {
  const [status, setStatus] = useState(null);
  const [execucoes, setExecucoes] = useState([]);
  const [historico, setHistorico] = useState({ resumo: {}, boletos: [], arquivos: [], diagnosticos: [] });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastTriggerMessage, setLastTriggerMessage] = useState('');
  const [historyTab, setHistoryTab] = useState('boletos');

  const loadData = async () => {
    try {
      const [statusData, execData, historicoData] = await Promise.all([
        fetchRoboStatus(),
        fetchRoboExecucoes(),
        fetchRoboHistorico(),
      ]);
      setStatus(statusData);
      setExecucoes(execData);
      setHistorico(historicoData);
    } catch (error) {
      console.error('Erro ao carregar dados do robô', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
    if (value === 'running' || value === 'sucesso' || value === 'success' || value === 'baixado' || value === 'concluído') return 'default';
    if (value === 'pausado' || value === 'ready' || value === 'pending' || value === 'simulado') return 'secondary';
    if (value === 'erro' || value === 'error' || value === 'offline' || value === 'falha') return 'destructive';
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

      const roboConfig = await fetchRoboConfig();
      const user_id = window.prompt('Informe o user_id para execução real do RPA:');
      const unique_login_code = window.prompt('Informe o unique_login_code do segurado:');
      const apolice_id = window.prompt('Informe o apolice_id:');

      if (user_id && unique_login_code && apolice_id) {
        const triggerResult = await triggerRoboReal({
          user_id,
          unique_login_code,
          apolice_id,
          operadora_nome: roboConfig?.operadoras?.[0]?.nome || '',
        });
        setLastTriggerMessage(triggerResult?.message || 'RPA acionado com sucesso');
      } else {
        setLastTriggerMessage('RPA não acionado: parâmetros obrigatórios não informados.');
      }

      await loadData();
    } catch (error) {
      console.error('Erro ao iniciar robô', error);
      const message = error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Erro desconhecido ao iniciar o robô';
      setLastTriggerMessage(`Falha ao iniciar robô: ${message}`);
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
      await loadData();
    } catch (error) {
      console.error('Erro ao pausar robô', error);
    } finally {
      setUpdating(false);
    }
  };

  const renderHistoryTable = () => {
    if (historyTab === 'boletos') {
      const rows = historico.boletos || [];
      return (
        <table className="data-table">
          <thead>
            <tr><th>Operadora</th><th>Apólice</th><th>Competência</th><th>Vencimento</th><th>Status</th><th>Arquivo</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8a8d93' }}>Nenhum boleto registrado.</td></tr>
            ) : rows.map((item) => (
              <tr key={item.id}>
                <td>{asText(item.operadora)}</td>
                <td>{asText(item.apolice_id || item.apoliceId)}</td>
                <td>{asText(item.competencia)}</td>
                <td>{asText(item.vencimento)}</td>
                <td><Badge variant={getStatusBadgeVariant((item.status || '').toLowerCase())}>{asText(item.status)}</Badge></td>
                <td>{item.arquivo_url || item.public_url ? <a href={item.arquivo_url || item.public_url} target="_blank" rel="noreferrer">Abrir</a> : asText(item.arquivo_nome || item.arquivo_path)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (historyTab === 'arquivos') {
      const rows = historico.arquivos || [];
      return (
        <table className="data-table">
          <thead>
            <tr><th>Tipo</th><th>Nome</th><th>Bucket</th><th>Caminho</th><th>Tamanho</th><th>Link</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8a8d93' }}>Nenhum arquivo registrado.</td></tr>
            ) : rows.map((item) => (
              <tr key={item.id}>
                <td>{asText(item.tipo)}</td>
                <td>{asText(item.nome_arquivo || item.nomeArquivo)}</td>
                <td>{asText(item.storage_bucket || item.bucket)}</td>
                <td>{asText(item.storage_path || item.path)}</td>
                <td>{asText(item.tamanho_bytes || item.size)}</td>
                <td>{item.public_url ? <a href={item.public_url} target="_blank" rel="noreferrer">Abrir</a> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    const rows = historico.diagnosticos || [];
    return (
      <table className="data-table">
        <thead>
          <tr><th>Operadora</th><th>Etapa</th><th>Status</th><th>Mensagem</th><th>Print</th><th>HTML</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#8a8d93' }}>Nenhum diagnóstico registrado.</td></tr>
          ) : rows.map((item) => (
            <tr key={item.id}>
              <td>{asText(item.operadora)}</td>
              <td>{asText(item.etapa)}</td>
              <td><Badge variant={getStatusBadgeVariant((item.status || '').toLowerCase())}>{asText(item.status)}</Badge></td>
              <td title={asText(item.detalhe)}>{asText(item.mensagem || item.detalhe).slice(0, 120)}</td>
              <td>{item.screenshot_path ? asText(item.screenshot_path) : '-'}</td>
              <td>{item.html_path ? asText(item.html_path) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
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
          Painel conectado com status, execuções, boletos baixados, arquivos gerados e diagnósticos do RPA.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={handleStart} disabled={updating || status?.status === 'running'} style={{ background:'#27ae60', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 12px', fontWeight:600, cursor:'pointer', opacity: (updating || status?.status === 'running') ? 0.7 : 1 }}>
          Iniciar Robô
        </button>
        <button onClick={handlePause} disabled={updating || status?.status !== 'running'} style={{ background:'#e67e22', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 12px', fontWeight:600, cursor:'pointer', opacity: (updating || status?.status !== 'running') ? 0.7 : 1 }}>
          Pausar Robô
        </button>
        <button onClick={loadData} disabled={updating} style={{ background:'#fff', color:'#2C7BE5', border:'1px solid #2C7BE5', borderRadius:'6px', padding:'8px 12px', fontWeight:600, cursor:'pointer' }}>
          Atualizar histórico
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#5E6E82' }}>
          {updating && <RefreshCw size={14} className="animate-spin" />}
          <span style={{ fontSize: '0.85rem' }}>{updating ? 'Atualizando...' : (lastTriggerMessage || 'Sem atualização pendente')}</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontWeight: 600 }}><FileText size={18} /> Boletos baixados</div>
          <div style={{ marginTop: '8px', fontSize: '1.3rem', fontWeight: 700 }}>{historico?.resumo?.boletosBaixados ?? 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', fontWeight: 600 }}><FolderArchive size={18} /> Arquivos gerados</div>
          <div style={{ marginTop: '8px', fontSize: '1.3rem', fontWeight: 700 }}>{historico?.resumo?.arquivosGerados ?? 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: 600 }}><AlertTriangle size={18} /> Diagnósticos</div>
          <div style={{ marginTop: '8px', fontSize: '1.3rem', fontWeight: 700 }}>{historico?.resumo?.diagnosticos ?? 0}</div>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
          <h3 style={{ fontSize:'0.9rem', fontWeight:600, color:'#344050', margin:0 }}>Histórico detalhado do RPA</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setHistoryTab('boletos')} style={{ border:'1px solid #d7dde8', borderRadius:'6px', padding:'6px 10px', background: historyTab === 'boletos' ? '#2C7BE5' : '#fff', color: historyTab === 'boletos' ? '#fff' : '#344050' }}>Boletos</button>
            <button onClick={() => setHistoryTab('arquivos')} style={{ border:'1px solid #d7dde8', borderRadius:'6px', padding:'6px 10px', background: historyTab === 'arquivos' ? '#2C7BE5' : '#fff', color: historyTab === 'arquivos' ? '#fff' : '#344050' }}>Arquivos</button>
            <button onClick={() => setHistoryTab('diagnosticos')} style={{ border:'1px solid #d7dde8', borderRadius:'6px', padding:'6px 10px', background: historyTab === 'diagnosticos' ? '#2C7BE5' : '#fff', color: historyTab === 'diagnosticos' ? '#fff' : '#344050' }}>Diagnósticos</button>
          </div>
        </div>
        {renderHistoryTable()}
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
