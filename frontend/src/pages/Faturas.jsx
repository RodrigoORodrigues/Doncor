import React, { useState } from 'react';
import { Receipt, Search, Filter, Eye, Download, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const mockFaturas = [
  { id: 1, numero: 'FAT-2026-0312', contrato: 'EMP-2024-001', seguradora: 'Amil', competencia: 'Mar/2026', vencimento: '10/03/2026', valor: 'R$ 22.500,00', valorPago: '-', status: 'Aberta' },
  { id: 2, numero: 'FAT-2026-0298', contrato: 'EMP-2024-002', seguradora: 'Bradesco Saúde', competencia: 'Mar/2026', vencimento: '15/03/2026', valor: 'R$ 54.000,00', valorPago: '-', status: 'Aberta' },
  { id: 3, numero: 'FAT-2026-0285', contrato: 'ADH-2024-003', seguradora: 'SulAmérica', competencia: 'Fev/2026', vencimento: '10/02/2026', valor: 'R$ 78.900,00', valorPago: 'R$ 78.900,00', status: 'Paga' },
  { id: 4, numero: 'FAT-2026-0270', contrato: 'EMP-2024-003', seguradora: 'SulAmérica', competencia: 'Fev/2026', vencimento: '15/02/2026', valor: 'R$ 115.000,00', valorPago: 'R$ 115.000,00', status: 'Paga' },
  { id: 5, numero: 'FAT-2026-0256', contrato: 'ADH-2024-001', seguradora: 'Amil', competencia: 'Fev/2026', vencimento: '10/02/2026', valor: 'R$ 45.200,00', valorPago: '-', status: 'Vencida' },
  { id: 6, numero: 'FAT-2026-0241', contrato: 'EMP-2024-005', seguradora: 'NotreDame', competencia: 'Jan/2026', vencimento: '10/01/2026', valor: 'R$ 38.250,00', valorPago: 'R$ 38.250,00', status: 'Paga' },
  { id: 7, numero: 'FAT-2026-0230', contrato: 'EMP-2024-008', seguradora: 'Porto Seguro', competencia: 'Jan/2026', vencimento: '15/01/2026', valor: 'R$ 24.800,00', valorPago: 'R$ 24.800,00', status: 'Paga' },
];

const Faturas = () => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');

  const filtered = mockFaturas.filter(i => {
    const matchSearch = i.numero.toLowerCase().includes(search.toLowerCase()) ||
      i.seguradora.toLowerCase().includes(search.toLowerCase()) ||
      i.contrato.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || i.status.toLowerCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (s) => {
    const map = { 'Paga': 'badge-aprovado', 'Aberta': 'badge-analise', 'Vencida': 'badge-cancelado' };
    return map[s] || 'badge-pendente';
  };

  const totalAberta = mockFaturas.filter(f => f.status === 'Aberta').length;
  const totalVencida = mockFaturas.filter(f => f.status === 'Vencida').length;
  const totalPaga = mockFaturas.filter(f => f.status === 'Paga').length;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#2C7BE515', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} color="#2C7BE5" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Faturas</h2>
            <p style={{ fontSize: '0.72rem', color: '#8a8d93', margin: 0 }}>Controle de faturas e pagamentos</p>
          </div>
        </div>
        <Button variant="outline" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={14} /> Exportar Relatório
        </Button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div className="stat-card" style={{ borderLeft: '3px solid #2C7BE5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#2C7BE5" />
            <span style={{ fontSize: '0.72rem', color: '#8a8d93' }}>Faturas Abertas</span>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C7BE5' }}>{totalAberta}</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid #e63757' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={16} color="#e63757" />
            <span style={{ fontSize: '0.72rem', color: '#8a8d93' }}>Faturas Vencidas</span>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e63757' }}>{totalVencida}</span>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid #27ae60' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} color="#27ae60" />
            <span style={{ fontSize: '0.72rem', color: '#8a8d93' }}>Faturas Pagas</span>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#27ae60' }}>{totalPaga}</span>
        </div>
      </div>

      <div className="filters-toggle" onClick={() => setShowFilters(!showFilters)}>
        <Filter size={11} style={{ marginRight: '4px' }} /> Filtros
      </div>

      {showFilters && (
        <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8a8d93' }} />
              <Input placeholder="Buscar por número, seguradora, contrato..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px 12px', fontSize: '0.8rem', color: '#344050', background: '#fff', cursor: 'pointer' }}>
              <option value="todos">Todos</option>
              <option value="aberta">Aberta</option>
              <option value="paga">Paga</option>
              <option value="vencida">Vencida</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: showFilters ? '0' : '12px' }}>
        <table className="data-table">
          <thead><tr><th>Número</th><th>Contrato</th><th>Seguradora</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Valor Pago</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600, color: '#344050' }}>{item.numero}</td>
                <td style={{ color: '#2C7BE5', fontWeight: 500 }}>{item.contrato}</td>
                <td>{item.seguradora}</td>
                <td>{item.competencia}</td>
                <td>{item.vencimento}</td>
                <td style={{ fontWeight: 600 }}>{item.valor}</td>
                <td style={{ fontWeight: 500, color: item.valorPago === '-' ? '#8a8d93' : '#27ae60' }}>{item.valorPago}</td>
                <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                <td><button style={{ background: 'none', border: '1px solid #d8e2ef', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#2C7BE5' }}><Eye size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.72rem', color: '#8a8d93' }}>
        <span>Exibindo {filtered.length} de {mockFaturas.length} faturas</span>
      </div>
    </div>
  );
};

export default Faturas;
