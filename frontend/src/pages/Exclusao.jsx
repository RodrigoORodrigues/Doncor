import React, { useState } from 'react';
import { UserMinus, Search, Filter, Eye } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const mockExclusoes = [
  { id: 1, protocolo: 'EXC-2026-0102', contrato: 'ADH-2024-003', beneficiario: 'Roberto Oliveira', cpf: '111.222.333-44', motivo: 'Solicitação do titular', dataSolicitacao: '04/03/2026', status: 'Pendente' },
  { id: 2, protocolo: 'EXC-2026-0101', contrato: 'EMP-2024-001', beneficiario: 'Sandra Ferreira', cpf: '555.666.777-88', motivo: 'Desligamento', dataSolicitacao: '03/03/2026', status: 'Aprovado' },
  { id: 3, protocolo: 'EXC-2026-0100', contrato: 'EMP-2024-003', beneficiario: 'Ricardo Gomes', cpf: '999.888.777-66', motivo: 'Desligamento', dataSolicitacao: '01/03/2026', status: 'Aprovado' },
  { id: 4, protocolo: 'EXC-2026-0099', contrato: 'ADH-2024-002', beneficiario: 'Cláudia Rocha', cpf: '222.333.444-55', motivo: 'Portabilidade', dataSolicitacao: '28/02/2026', status: 'Em Análise' },
  { id: 5, protocolo: 'EXC-2026-0098', contrato: 'EMP-2024-005', beneficiario: 'Marcos Tavares', cpf: '444.555.666-77', motivo: 'Solicitação do titular', dataSolicitacao: '26/02/2026', status: 'Aprovado' },
];

const Exclusao = () => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = mockExclusoes.filter(i =>
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
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e6375715', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserMinus size={18} color="#e63757" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Exclusão de Beneficiários</h2>
            <p style={{ fontSize: '0.72rem', color: '#8a8d93', margin: 0 }}>Gerencie as solicitações de exclusão</p>
          </div>
        </div>
        <Button style={{ background: '#e63757', color: '#fff', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserMinus size={14} /> Nova Exclusão
        </Button>
      </div>

      <div className="filters-toggle" onClick={() => setShowFilters(!showFilters)} style={{ background: '#bf0000' }}>
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
          <thead><tr><th>Protocolo</th><th>Contrato</th><th>Beneficiário</th><th>CPF</th><th>Motivo</th><th>Solicitação</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600, color: '#e63757' }}>{item.protocolo}</td>
                <td style={{ color: '#2C7BE5', fontWeight: 500 }}>{item.contrato}</td>
                <td style={{ fontWeight: 500 }}>{item.beneficiario}</td>
                <td style={{ fontSize: '0.75rem', color: '#5E6E82' }}>{item.cpf}</td>
                <td>{item.motivo}</td>
                <td>{item.dataSolicitacao}</td>
                <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                <td><button style={{ background: 'none', border: '1px solid #d8e2ef', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#2C7BE5' }}><Eye size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.72rem', color: '#8a8d93' }}>
        <span>Exibindo {filtered.length} de {mockExclusoes.length} registros</span>
      </div>
    </div>
  );
};

export default Exclusao;
