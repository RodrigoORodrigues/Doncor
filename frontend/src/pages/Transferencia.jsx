import React, { useState } from 'react';
import { ArrowLeftRight, Search, Filter, Eye } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const mockTransferencias = [
  { id: 1, protocolo: 'TRF-2026-0045', contratoOrigem: 'EMP-2024-002', contratoDestino: 'EMP-2024-001', beneficiario: 'Maria Clara Lima', cpf: '333.444.555-66', dataSolicitacao: '03/03/2026', status: 'Aprovado' },
  { id: 2, protocolo: 'TRF-2026-0044', contratoOrigem: 'ADH-2024-001', contratoDestino: 'ADH-2024-003', beneficiario: 'Paulo Roberto Silva', cpf: '777.888.999-00', dataSolicitacao: '01/03/2026', status: 'Pendente' },
  { id: 3, protocolo: 'TRF-2026-0043', contratoOrigem: 'EMP-2024-003', contratoDestino: 'EMP-2024-005', beneficiario: 'Juliana Martins', cpf: '111.999.888-77', dataSolicitacao: '27/02/2026', status: 'Aprovado' },
  { id: 4, protocolo: 'TRF-2026-0042', contratoOrigem: 'ADH-2024-002', contratoDestino: 'ADH-2024-001', beneficiario: 'Carlos Magno Costa', cpf: '555.444.333-22', dataSolicitacao: '25/02/2026', status: 'Em Análise' },
];

const Transferencia = () => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = mockTransferencias.filter(i =>
    i.protocolo.toLowerCase().includes(search.toLowerCase()) ||
    i.beneficiario.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (s) => {
    const map = { 'Aprovado': 'badge-aprovado', 'Pendente': 'badge-pendente', 'Em Análise': 'badge-analise' };
    return map[s] || 'badge-pendente';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#8e44ad15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeftRight size={18} color="#8e44ad" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Transferências</h2>
            <p style={{ fontSize: '0.72rem', color: '#8a8d93', margin: 0 }}>Gerencie transferências entre contratos</p>
          </div>
        </div>
        <Button style={{ background: '#8e44ad', color: '#fff', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeftRight size={14} /> Nova Transferência
        </Button>
      </div>

      <div className="filters-toggle" onClick={() => setShowFilters(!showFilters)} style={{ background: '#7c4ec3' }}>
        <Filter size={11} style={{ marginRight: '4px' }} /> Filtros
      </div>

      {showFilters && (
        <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8a8d93' }} />
            <Input placeholder="Buscar por protocolo, beneficiário..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: showFilters ? '0' : '12px' }}>
        <table className="data-table">
          <thead><tr><th>Protocolo</th><th>Contrato Origem</th><th>Contrato Destino</th><th>Beneficiário</th><th>CPF</th><th>Solicitação</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600, color: '#8e44ad' }}>{item.protocolo}</td>
                <td style={{ color: '#e63757', fontWeight: 500 }}>{item.contratoOrigem}</td>
                <td style={{ color: '#27ae60', fontWeight: 500 }}>{item.contratoDestino}</td>
                <td style={{ fontWeight: 500 }}>{item.beneficiario}</td>
                <td style={{ fontSize: '0.75rem', color: '#5E6E82' }}>{item.cpf}</td>
                <td>{item.dataSolicitacao}</td>
                <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                <td><button style={{ background: 'none', border: '1px solid #d8e2ef', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#2C7BE5' }}><Eye size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.72rem', color: '#8a8d93' }}>
        <span>Exibindo {filtered.length} de {mockTransferencias.length} registros</span>
      </div>
    </div>
  );
};

export default Transferencia;
