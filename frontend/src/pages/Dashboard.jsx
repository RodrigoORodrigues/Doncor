import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, fetchChartData, fetchDashboardSeguradoras, fetchSaldoVidas, fetchTarefasPendentes, fetchMovimentacoesRecentes } from '../services/api';
import {
  FileText, Users, Heart, CheckCircle, Clock,
  Receipt, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

const COLORS = ['#4979bb', '#e6832a', '#27ae60', '#e63757', '#8e44ad', '#3498db'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [seguradoras, setSeguradoras] = useState([]);
  const [saldo, setSaldo] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c, seg, sal, t, m] = await Promise.all([
          fetchDashboardStats(), fetchChartData(), fetchDashboardSeguradoras(),
          fetchSaldoVidas(), fetchTarefasPendentes(), fetchMovimentacoesRecentes()
        ]);
        setStats(s); setChartData(c); setSeguradoras(seg); setSaldo(sal); setTarefas(t); setMovimentacoes(m);
      } catch (e) { console.error('Dashboard load error', e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'50vh'}}><Loader2 size={32} className="animate-spin" style={{color:'#4979bb',animation:'spin 1s linear infinite'}}/></div>;

  const statCards = stats ? [
    { label: 'Contratos Vigentes', value: stats.totalContratos?.toLocaleString('pt-BR') || '0', icon: FileText, color: '#1a3a52', change: '+12', up: true, tag: 'Ativos' },
    { label: 'Vidas Ativas', value: stats.vidasAtivas?.toLocaleString('pt-BR') || '0', icon: Users, color: '#27ae60', change: '+89', up: true, tag: 'Total' },
    { label: 'Solicitações Pendentes', value: stats.movimentacoesPendentes || '0', icon: Clock, color: '#2a5fcf', change: '-5', up: false, tag: 'Urgente' },
  ] : [];

  const pieData = seguradoras.map(s => ({ name: s.nome, value: s.vidas }));

  const getStatusBadge = (status) => {
    const map = { 'Pendente': 'badge-pendente', 'Aprovado': 'badge-aprovado', 'Em Análise': 'badge-analise' };
    return map[status] || 'badge-pendente';
  };
  const getPrioridadeBadge = (prio) => {
    const map = { 'Alta': 'badge-alta', 'Média': 'badge-media', 'Baixa': 'badge-baixa' };
    return map[prio] || 'badge-media';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a3a52', margin: 0 }}>Bem-vindo ao seu Portal</h2>
        <p style={{ fontSize: '0.85rem', color: '#6c7680', margin: '4px 0 0' }}>Aqui está o resumo das suas informações e operações ativas hoje.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={24} color={stat.color} />
                </div>
                <span style={{ background: '#eef4fb', color: stat.color, padding: '4px 12px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600 }}>{stat.tag}</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a3a52', lineHeight: 1, marginBottom: '6px' }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#6c7680', marginBottom: '8px' }}>{stat.label}</div>
              {/* Trend indicators removed as requested */}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a3a52', marginBottom: '16px' }}>Movimentações Mensais</h3>
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6c7680' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6c7680' }} />
                <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} />
                <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                <Bar dataKey="inclusoes" name="Inclusões" fill="#27ae60" radius={[3, 3, 0, 0]} />
                <Bar dataKey="exclusoes" name="Exclusões" fill="#e63757" radius={[3, 3, 0, 0]} />
                <Bar dataKey="transferencias" name="Transferências" fill="#2a5fcf" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7680', fontSize: '0.85rem' }}>
              Nenhum registro de movimentação encontrado. Os dados serão exibidos quando houver movimentações.
            </div>
          )}
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a3a52', marginBottom: '16px' }}>Vidas por Seguradora</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
              {pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
            </Pie><Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#6c7680' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />{item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {saldo && (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a3a52', margin: 0 }}>Saldo de Vidas</h3>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2a5fcf' }}>{saldo.percentual_total}%</span>
          </div>
          <Progress value={saldo.percentual_total} className="h-3" style={{ backgroundColor: '#eef4fb' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '12px' }}>
            <div style={{ fontSize: '0.75rem' }}><span style={{ color: '#6c7680' }}>Total: </span><span style={{ fontWeight: 600, color: '#1a3a52', fontSize: '1rem' }}>{saldo.total_vidas?.toLocaleString('pt-BR')}</span></div>
            <div style={{ fontSize: '0.75rem' }}><span style={{ color: '#6c7680' }}>Ativas: </span><span style={{ fontWeight: 600, color: '#27ae60', fontSize: '1rem' }}>{saldo.vidas_ativas?.toLocaleString('pt-BR')}</span></div>
            <div style={{ fontSize: '0.75rem' }}><span style={{ color: '#6c7680' }}>Suspensas: </span><span style={{ fontWeight: 600, color: '#e6832a', fontSize: '1rem' }}>{saldo.vidas_suspensas?.toLocaleString('pt-BR')}</span></div>
            <div style={{ fontSize: '0.75rem' }}><span style={{ color: '#6c7680' }}>Canceladas: </span><span style={{ fontWeight: 600, color: '#e63757', fontSize: '1rem' }}>{saldo.vidas_canceladas?.toLocaleString('pt-BR')}</span></div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a3a52', marginBottom: '12px' }}>Solicitações Pendentes</h3>
          {tarefas && tarefas.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Protocolo</th>
                  <th>Beneficiário</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tarefas.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{t.tipo}</td>
                    <td style={{ color: '#2a5fcf', fontWeight: 500 }}>
                      <button
                        type="button"
                        onClick={() => setSelectedProtocol(t)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#2a5fcf',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textAlign: 'left'
                        }}
                      >
                        {t.protocolo}
                      </button>
                    </td>
                    <td>{t.beneficiario}</td>
                    <td>{t.dataSolicitacao}</td>
                    <td><span className={getStatusBadge(t.status)}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c7680', fontSize: '0.85rem' }}>
              Nenhuma solicitação pendente encontrada.
            </div>
          )}
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a3a52', marginBottom: '12px' }}>Movimentações Recentes</h3>
          <table className="data-table"><thead><tr><th>Tipo</th><th>Contrato</th><th>Beneficiário</th><th>Data</th><th>Status</th></tr></thead>
            <tbody>{movimentacoes.map((m, i) => (<tr key={i}><td style={{fontWeight:500}}>{m.tipo}</td><td style={{color:'#2a5fcf',fontWeight:500}}>{m.contrato}</td><td>{m.beneficiario}</td><td>{m.data}</td><td><span className={getStatusBadge(m.status)}>{m.status}</span></td></tr>))}</tbody>
          </table>
        </div>
      </div>

      {/* Dialog Detalhes do Protocolo */}
      <Dialog open={!!selectedProtocol} onOpenChange={(open) => !open && setSelectedProtocol(null)}>
        <DialogContent style={{ maxWidth: '600px' }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a52', fontSize: '1.25rem' }}>
              📄 Detalhes da Solicitação ({selectedProtocol?.protocolo})
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '12px 0', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Protocolo</span>
              <span style={{ fontWeight: 700, color: '#1a3a52', fontSize: '0.95rem' }}>{selectedProtocol?.protocolo}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</span>
              <span>
                <span className={selectedProtocol ? getStatusBadge(selectedProtocol.status) : ''} style={{ display: 'inline-block' }}>
                  {selectedProtocol?.status}
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Tipo</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.tipo || '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Data de Solicitação</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.dataSolicitacao}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Beneficiário</span>
              <span style={{ fontWeight: 600, color: '#1a3a52' }}>{selectedProtocol?.beneficiario || '-'}</span>
            </div>
            {selectedProtocol?.cpf && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>CPF</span>
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.cpf}</span>
              </div>
            )}
            {selectedProtocol?.contrato && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Contrato</span>
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.contrato}</span>
              </div>
            )}
            {selectedProtocol?.empresa && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Empresa</span>
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.empresa}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedProtocol(null)} style={{ background: '#1a3a52', color: '#fff', width: '100%' }}>
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
