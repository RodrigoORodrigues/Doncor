import React, { useState } from 'react';
import { DollarSign, Search, Filter, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '../components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockComissoes = [
  { id: 1, seguradora: 'Amil', competencia: 'Mar/2026', contratos: 3, vidasBase: 313, percentual: '4.5%', valorEstimado: 'R$ 4.788,00', status: 'Prevista' },
  { id: 2, seguradora: 'Bradesco Saúde', competencia: 'Mar/2026', contratos: 3, vidasBase: 287, percentual: '3.8%', valorEstimado: 'R$ 4.218,90', status: 'Prevista' },
  { id: 3, seguradora: 'SulAmérica', competencia: 'Fev/2026', contratos: 2, vidasBase: 464, percentual: '5.0%', valorEstimado: 'R$ 9.695,00', status: 'Paga' },
  { id: 4, seguradora: 'Unimed', competencia: 'Fev/2026', contratos: 2, vidasBase: 85, percentual: '4.0%', valorEstimado: 'R$ 1.026,00', status: 'Paga' },
  { id: 5, seguradora: 'NotreDame', competencia: 'Fev/2026', contratos: 2, vidasBase: 130, percentual: '4.2%', valorEstimado: 'R$ 2.123,10', status: 'Paga' },
  { id: 6, seguradora: 'Porto Seguro', competencia: 'Jan/2026', contratos: 2, vidasBase: 96, percentual: '3.5%', valorEstimado: 'R$ 1.190,00', status: 'Paga' },
];

const chartData = [
  { mes: 'Out', valor: 18500 },
  { mes: 'Nov', valor: 19200 },
  { mes: 'Dez', valor: 21400 },
  { mes: 'Jan', valor: 20800 },
  { mes: 'Fev', valor: 22300 },
  { mes: 'Mar', valor: 9006 },
];

const Comissoes = () => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = mockComissoes.filter(i =>
    i.seguradora.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (s) => {
    const map = { 'Paga': 'badge-aprovado', 'Prevista': 'badge-analise', 'Pendente': 'badge-pendente' };
    return map[s] || 'badge-pendente';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e6832a15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={18} color="#e6832a" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Comissões</h2>
            <p style={{ fontSize: '0.72rem', color: '#8a8d93', margin: 0 }}>Acompanhe suas comissões por seguradora</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', marginBottom: '12px' }}>Evolução de Comissões (R$)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8a8d93' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8a8d93' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} formatter={v => [`R$ ${v.toLocaleString('pt-BR')}`, 'Comissão']} />
            <Bar dataKey="valor" fill="#e6832a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="filters-toggle" onClick={() => setShowFilters(!showFilters)} style={{ background: '#e6832a' }}>
        <Filter size={11} style={{ marginRight: '4px' }} /> Filtros
      </div>

      {showFilters && (
        <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8a8d93' }} />
            <Input placeholder="Buscar por seguradora..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: showFilters ? '0' : '12px' }}>
        <table className="data-table">
          <thead><tr><th>Seguradora</th><th>Competência</th><th>Contratos</th><th>Vidas Base</th><th>Percentual</th><th>Valor Estimado</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{item.seguradora}</td>
                <td>{item.competencia}</td>
                <td style={{ textAlign: 'center' }}>{item.contratos}</td>
                <td style={{ textAlign: 'center' }}>{item.vidasBase}</td>
                <td style={{ fontWeight: 500, color: '#e6832a' }}>{item.percentual}</td>
                <td style={{ fontWeight: 600, color: '#27ae60' }}>{item.valorEstimado}</td>
                <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                <td><button style={{ background: 'none', border: '1px solid #d8e2ef', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#2C7BE5' }}><Eye size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Comissoes;
