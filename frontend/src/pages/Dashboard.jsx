import React, { useState } from 'react';
import { dashboardStats, dashboardChartData, pendingTasks, recentMovements, seguradoras, saldoVidas } from '../data/mockData';
import {
  FileText, Users, Heart, AlertTriangle, TrendingUp, Clock,
  Receipt, Headphones, ArrowUpRight, ArrowDownRight, CheckCircle,
  XCircle, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '../components/ui/progress';

const COLORS = ['#4979bb', '#e6832a', '#27ae60', '#e63757', '#8e44ad', '#3498db'];

const Dashboard = () => {
  const [filter, setFilter] = useState('todos');

  const stats = [
    { label: 'Total Contratos', value: dashboardStats.totalContratos.toLocaleString('pt-BR'), icon: FileText, color: '#4979bb', change: '+12', up: true },
    { label: 'Contratos Ativos', value: dashboardStats.contratosAtivos.toLocaleString('pt-BR'), icon: CheckCircle, color: '#27ae60', change: '+8', up: true },
    { label: 'Total de Vidas', value: dashboardStats.vidasTotal.toLocaleString('pt-BR'), icon: Users, color: '#2C7BE5', change: '+156', up: true },
    { label: 'Vidas Ativas', value: dashboardStats.vidasAtivas.toLocaleString('pt-BR'), icon: Heart, color: '#e6832a', change: '+89', up: true },
    { label: 'Mov. Pendentes', value: dashboardStats.movimentacoesPendentes, icon: Clock, color: '#8e44ad', change: '-5', up: false },
    { label: 'Faturas Pendentes', value: dashboardStats.faturasPendentes, icon: Receipt, color: '#e63757', change: '+2', up: true },
  ];

  const pieData = seguradoras.map(s => ({ name: s.nome, value: s.vidas }));

  const getStatusBadge = (status) => {
    const map = {
      'Pendente': 'badge-pendente',
      'Aprovado': 'badge-aprovado',
      'Em Análise': 'badge-analise',
    };
    return map[status] || 'badge-pendente';
  };

  const getPrioridadeBadge = (prio) => {
    const map = {
      'Alta': 'badge-alta',
      'Média': 'badge-media',
      'Baixa': 'badge-baixa',
    };
    return map[prio] || 'badge-media';
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Dashboard do Usuário</h2>
          <p style={{ fontSize: '0.78rem', color: '#8a8d93', margin: '2px 0 0' }}>Visão geral das suas operações e contratos</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: '#fff', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '6px 14px', fontSize: '0.75rem', color: '#5E6E82' }}>
            Última atualização: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: `${stat.color}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={18} color={stat.color} />
                </div>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '2px',
                  fontSize: '0.65rem', fontWeight: 600,
                  color: stat.up ? '#27ae60' : '#e63757'
                }}>
                  {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#344050', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#8a8d93', marginTop: '4px' }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Bar Chart */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '16px' }}>
            Movimentações Mensais
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboardChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8a8d93' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8a8d93' }} />
              <Tooltip
                contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
              <Bar dataKey="inclusoes" name="Inclusões" fill="#27ae60" radius={[3, 3, 0, 0]} />
              <Bar dataKey="exclusoes" name="Exclusões" fill="#e63757" radius={[3, 3, 0, 0]} />
              <Bar dataKey="transferencias" name="Transferências" fill="#8e44ad" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Seguradoras */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '16px' }}>
            Vidas por Seguradora
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.62rem', color: '#5E6E82' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Saldo Vidas Bar */}
      <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', margin: 0 }}>Saldo de Vidas</h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4979bb' }}>{saldoVidas.percentual_total}%</span>
        </div>
        <Progress value={saldoVidas.percentual_total} className="h-3" style={{ backgroundColor: '#edf2f9' }} />
        <div style={{ display: 'flex', gap: '24px', marginTop: '10px' }}>
          <div style={{ fontSize: '0.72rem' }}>
            <span style={{ color: '#8a8d93' }}>Total: </span>
            <span style={{ fontWeight: 600, color: '#344050' }}>{saldoVidas.total_vidas.toLocaleString('pt-BR')}</span>
          </div>
          <div style={{ fontSize: '0.72rem' }}>
            <span style={{ color: '#8a8d93' }}>Ativas: </span>
            <span style={{ fontWeight: 600, color: '#27ae60' }}>{saldoVidas.vidas_ativas.toLocaleString('pt-BR')}</span>
          </div>
          <div style={{ fontSize: '0.72rem' }}>
            <span style={{ color: '#8a8d93' }}>Suspensas: </span>
            <span style={{ fontWeight: 600, color: '#e6832a' }}>{saldoVidas.vidas_suspensas.toLocaleString('pt-BR')}</span>
          </div>
          <div style={{ fontSize: '0.72rem' }}>
            <span style={{ color: '#8a8d93' }}>Canceladas: </span>
            <span style={{ fontWeight: 600, color: '#e63757' }}>{saldoVidas.vidas_canceladas.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Pending Tasks */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '12px' }}>
            Demandas Pendentes
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Prazo</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingTasks.map((task) => (
                <tr key={task.id}>
                  <td style={{ fontWeight: 500 }}>{task.tipo}</td>
                  <td>{task.descricao}</td>
                  <td>{task.prazo}</td>
                  <td><span className={getPrioridadeBadge(task.prioridade)}>{task.prioridade}</span></td>
                  <td><span className={getStatusBadge(task.status)}>{task.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Movements */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '12px' }}>
            Movimentações Recentes
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Contrato</th>
                <th>Beneficiário</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map((mov) => (
                <tr key={mov.id}>
                  <td style={{ fontWeight: 500 }}>{mov.tipo}</td>
                  <td style={{ color: '#2C7BE5', fontWeight: 500 }}>{mov.contrato}</td>
                  <td>{mov.beneficiario}</td>
                  <td>{mov.data}</td>
                  <td><span className={getStatusBadge(mov.status)}>{mov.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
