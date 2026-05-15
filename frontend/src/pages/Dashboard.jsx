import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, fetchChartData, fetchDashboardSeguradoras, fetchSaldoVidas, fetchTarefasPendentes, fetchMovimentacoesRecentes } from '../services/api';
import {
  FileText, Users, Heart, CheckCircle, Clock,
  Receipt, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '../components/ui/progress';

const COLORS = ['#4979bb', '#e6832a', '#27ae60', '#e63757', '#8e44ad', '#3498db'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [seguradoras, setSeguradoras] = useState([]);
  const [saldo, setSaldo] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);

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
    { label: 'Total Contratos', value: stats.totalContratos?.toLocaleString('pt-BR') || '0', icon: FileText, color: '#4979bb', change: '+12', up: true },
    { label: 'Contratos Ativos', value: stats.contratosAtivos?.toLocaleString('pt-BR') || '0', icon: CheckCircle, color: '#27ae60', change: '+8', up: true },
    { label: 'Total de Vidas', value: stats.vidasTotal?.toLocaleString('pt-BR') || '0', icon: Users, color: '#2C7BE5', change: '+156', up: true },
    { label: 'Vidas Ativas', value: stats.vidasAtivas?.toLocaleString('pt-BR') || '0', icon: Heart, color: '#e6832a', change: '+89', up: true },
    { label: 'Mov. Pendentes', value: stats.movimentacoesPendentes, icon: Clock, color: '#8e44ad', change: '-5', up: false },
    { label: 'Faturas Pendentes', value: stats.faturasPendentes, icon: Receipt, color: '#e63757', change: '+2', up: true },
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
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Dashboard do Usuário</h2>
          <p style={{ fontSize: '0.78rem', color: '#8a8d93', margin: '2px 0 0' }}>Visão geral das suas operações e contratos</p>
        </div>
        <div style={{ background: '#fff', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '6px 14px', fontSize: '0.75rem', color: '#5E6E82' }}>
          Última atualização: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={stat.color} />
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: 600, color: stat.up ? '#27ae60' : '#e63757' }}>
                  {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{stat.change}
                </span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#344050', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#8a8d93', marginTop: '4px' }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '16px' }}>Movimentações Mensais</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8a8d93' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8a8d93' }} />
              <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} />
              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
              <Bar dataKey="inclusoes" name="Inclusões" fill="#27ae60" radius={[3, 3, 0, 0]} />
              <Bar dataKey="exclusoes" name="Exclusões" fill="#e63757" radius={[3, 3, 0, 0]} />
              <Bar dataKey="transferencias" name="Transferências" fill="#8e44ad" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '16px' }}>Vidas por Seguradora</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
              {pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
            </Pie><Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.62rem', color: '#5E6E82' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />{item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {saldo && (
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', margin: 0 }}>Saldo de Vidas</h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4979bb' }}>{saldo.percentual_total}%</span>
          </div>
          <Progress value={saldo.percentual_total} className="h-3" style={{ backgroundColor: '#edf2f9' }} />
          <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
            <div style={{ fontSize: '0.72rem' }}><span style={{ color: '#8a8d93' }}>Total: </span><span style={{ fontWeight: 600, color: '#344050' }}>{saldo.total_vidas?.toLocaleString('pt-BR')}</span></div>
            <div style={{ fontSize: '0.72rem' }}><span style={{ color: '#8a8d93' }}>Ativas: </span><span style={{ fontWeight: 600, color: '#27ae60' }}>{saldo.vidas_ativas?.toLocaleString('pt-BR')}</span></div>
            <div style={{ fontSize: '0.72rem' }}><span style={{ color: '#8a8d93' }}>Suspensas: </span><span style={{ fontWeight: 600, color: '#e6832a' }}>{saldo.vidas_suspensas?.toLocaleString('pt-BR')}</span></div>
            <div style={{ fontSize: '0.72rem' }}><span style={{ color: '#8a8d93' }}>Canceladas: </span><span style={{ fontWeight: 600, color: '#e63757' }}>{saldo.vidas_canceladas?.toLocaleString('pt-BR')}</span></div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '12px' }}>Demandas Pendentes</h3>
          <table className="data-table"><thead><tr><th>Tipo</th><th>Descrição</th><th>Prazo</th><th>Prioridade</th><th>Status</th></tr></thead>
            <tbody>{tarefas.map((t, i) => (<tr key={i}><td style={{fontWeight:500}}>{t.tipo}</td><td>{t.descricao}</td><td>{t.prazo}</td><td><span className={getPrioridadeBadge(t.prioridade)}>{t.prioridade}</span></td><td><span className={getStatusBadge(t.status)}>{t.status}</span></td></tr>))}</tbody>
          </table>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '12px' }}>Movimentações Recentes</h3>
          <table className="data-table"><thead><tr><th>Tipo</th><th>Contrato</th><th>Beneficiário</th><th>Data</th><th>Status</th></tr></thead>
            <tbody>{movimentacoes.map((m, i) => (<tr key={i}><td style={{fontWeight:500}}>{m.tipo}</td><td style={{color:'#2C7BE5',fontWeight:500}}>{m.contrato}</td><td>{m.beneficiario}</td><td>{m.data}</td><td><span className={getStatusBadge(m.status)}>{m.status}</span></td></tr>))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
