import React, { useState } from 'react';
import { UserPlus, Search, Filter, Download, Eye, Check, X, Calendar } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

const mockInclusoes = [
  { id: 1, protocolo: 'INC-2026-0341', contrato: 'EMP-2024-001', empresa: 'Tech Solutions Ltda', beneficiario: 'Ana Paula Santos', cpf: '123.456.789-00', parentesco: 'Titular', dataSolicitacao: '05/03/2026', status: 'Aprovado' },
  { id: 2, protocolo: 'INC-2026-0340', contrato: 'ADH-2024-003', empresa: '-', beneficiario: 'João Pedro Alves', cpf: '987.654.321-00', parentesco: 'Dependente', dataSolicitacao: '04/03/2026', status: 'Em Análise' },
  { id: 3, protocolo: 'INC-2026-0339', contrato: 'EMP-2024-003', empresa: 'Indústria ABC ME', beneficiario: 'Fernanda Costa', cpf: '456.789.123-00', parentesco: 'Titular', dataSolicitacao: '02/03/2026', status: 'Aprovado' },
  { id: 4, protocolo: 'INC-2026-0338', contrato: 'EMP-2024-002', empresa: 'Global Commerce SA', beneficiario: 'Lucas Mendes', cpf: '321.654.987-00', parentesco: 'Dependente', dataSolicitacao: '01/03/2026', status: 'Pendente' },
  { id: 5, protocolo: 'INC-2026-0337', contrato: 'ADH-2024-001', empresa: '-', beneficiario: 'Mariana Souza', cpf: '654.987.321-00', parentesco: 'Titular', dataSolicitacao: '28/02/2026', status: 'Aprovado' },
  { id: 6, protocolo: 'INC-2026-0336', contrato: 'EMP-2024-005', empresa: 'Logística Express', beneficiario: 'Pedro Henrique Lima', cpf: '789.123.456-00', parentesco: 'Titular', dataSolicitacao: '27/02/2026', status: 'Recusado' },
];

const Inclusao = () => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({ contrato: '', beneficiario: '', cpf: '', parentesco: 'Titular' });

  const filtered = mockInclusoes.filter(i => {
    const matchSearch = i.protocolo.toLowerCase().includes(search.toLowerCase()) ||
      i.beneficiario.toLowerCase().includes(search.toLowerCase()) ||
      i.contrato.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || i.status.toLowerCase().replace(' ', '_') === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (s) => {
    const map = { 'Aprovado': 'badge-aprovado', 'Pendente': 'badge-pendente', 'Em Análise': 'badge-analise', 'Recusado': 'badge-cancelado' };
    return map[s] || 'badge-pendente';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#27ae6015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={18} color="#27ae60" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Inclusão de Beneficiários</h2>
            <p style={{ fontSize: '0.72rem', color: '#8a8d93', margin: 0 }}>Gerencie as solicitações de inclusão</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)} style={{ background: '#27ae60', color: '#fff', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPlus size={14} /> Nova Inclusão
        </Button>
      </div>

      <div className="filters-toggle" onClick={() => setShowFilters(!showFilters)} style={{ background: '#27ae60' }}>
        <Filter size={11} style={{ marginRight: '4px' }} /> Filtros
      </div>

      {showFilters && (
        <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8a8d93' }} />
              <Input placeholder="Buscar por protocolo, beneficiário..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px 12px', fontSize: '0.8rem', color: '#344050', background: '#fff', cursor: 'pointer' }}>
              <option value="todos">Todos</option>
              <option value="aprovado">Aprovado</option>
              <option value="pendente">Pendente</option>
              <option value="em_análise">Em Análise</option>
              <option value="recusado">Recusado</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: showFilters ? '0' : '12px' }}>
        <table className="data-table">
          <thead><tr><th>Protocolo</th><th>Contrato</th><th>Empresa</th><th>Beneficiário</th><th>CPF</th><th>Parentesco</th><th>Solicitação</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600, color: '#27ae60' }}>{item.protocolo}</td>
                <td style={{ color: '#2C7BE5', fontWeight: 500 }}>{item.contrato}</td>
                <td>{item.empresa}</td>
                <td style={{ fontWeight: 500 }}>{item.beneficiario}</td>
                <td style={{ fontSize: '0.75rem', color: '#5E6E82' }}>{item.cpf}</td>
                <td>{item.parentesco}</td>
                <td>{item.dataSolicitacao}</td>
                <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                <td>
                  <button style={{ background: 'none', border: '1px solid #d8e2ef', borderRadius: '4px', padding: '4px 6px', cursor: 'pointer', color: '#2C7BE5' }} title="Visualizar"><Eye size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#8a8d93', fontSize: '0.85rem' }}>Nenhuma inclusão encontrada.</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.72rem', color: '#8a8d93' }}>
        <span>Exibindo {filtered.length} de {mockInclusoes.length} registros</span>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent style={{ maxWidth: '500px' }}>
          <DialogHeader><DialogTitle>Nova Inclusão</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#8a8d93', fontWeight: 600 }}>Contrato</label>
              <Input placeholder="Selecione o contrato" value={formData.contrato} onChange={e => setFormData({...formData, contrato: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#8a8d93', fontWeight: 600 }}>Nome do Beneficiário</label>
              <Input placeholder="Nome completo" value={formData.beneficiario} onChange={e => setFormData({...formData, beneficiario: e.target.value})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#8a8d93', fontWeight: 600 }}>CPF</label>
                <Input placeholder="000.000.000-00" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#8a8d93', fontWeight: 600 }}>Parentesco</label>
                <select value={formData.parentesco} onChange={e => setFormData({...formData, parentesco: e.target.value})} style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem' }}>
                  <option>Titular</option>
                  <option>Cônjuge</option>
                  <option>Filho(a)</option>
                  <option>Dependente</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button style={{ background: '#27ae60', color: '#fff' }} onClick={() => setShowNew(false)}>Solicitar Inclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inclusao;
