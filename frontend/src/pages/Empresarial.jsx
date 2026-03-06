import React, { useState } from 'react';
import { contratosEmpresarial } from '../data/mockData';
import { Search, Filter, Plus, Eye, Edit, Handshake, Download, Building } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const Empresarial = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const filtered = contratosEmpresarial.filter(c => {
    const matchSearch = c.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.seguradora.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm);
    const matchStatus = filterStatus === 'todos' || c.status.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status) => {
    const map = {
      'Ativo': 'badge-ativo',
      'Cancelado': 'badge-cancelado',
      'Suspenso': 'badge-suspenso',
      'Vencido': 'badge-vencido',
    };
    return map[status] || 'badge-pendente';
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#4979bb15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Handshake size={18} color="#4979bb" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#344050', margin: 0 }}>Contratos Empresariais / PME</h2>
            <p style={{ fontSize: '0.72rem', color: '#8a8d93', margin: 0 }}>Gerencie seus contratos empresariais e PME</p>
          </div>
        </div>
        <Button
          style={{
            background: '#4979bb',
            color: '#fff',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={14} /> Novo Contrato
        </Button>
      </div>

      {/* Filters Toggle */}
      <div className="filters-toggle" onClick={() => setShowFilters(!showFilters)}>
        <Filter size={11} style={{ marginRight: '4px' }} />
        Filtros
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{
          background: '#fff',
          borderRadius: '0 0 8px 8px',
          padding: '16px',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          animation: 'slideInUp 0.2s ease'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8a8d93' }} />
              <Input
                placeholder="Buscar por empresa, CNPJ, seguradora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                border: '1px solid #d8e2ef',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.8rem',
                color: '#344050',
                background: '#fff',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="vencido">Vencido</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <Button
              variant="outline"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={13} /> Exportar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: showFilters ? '0' : '12px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Seguradora</th>
              <th>Produto</th>
              <th>Vigência</th>
              <th>Vencimento</th>
              <th>Vidas</th>
              <th>Valor Mensal</th>
              <th>Status</th>
              <th style={{ width: '80px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contrato) => (
              <tr key={contrato.id}>
                <td style={{ fontWeight: 600, color: '#2C7BE5' }}>{contrato.numero}</td>
                <td style={{ fontWeight: 500 }}>{contrato.empresa}</td>
                <td style={{ fontSize: '0.75rem', color: '#5E6E82' }}>{contrato.cnpj}</td>
                <td>{contrato.seguradora}</td>
                <td>{contrato.produto}</td>
                <td>{contrato.vigencia}</td>
                <td>{contrato.vencimento}</td>
                <td style={{ fontWeight: 600 }}>{contrato.vidas}</td>
                <td style={{ fontWeight: 500 }}>{contrato.valorMensal}</td>
                <td><span className={getStatusBadge(contrato.status)}>{contrato.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => { setSelectedContrato(contrato); setShowDetail(true); }}
                      style={{
                        background: 'none',
                        border: '1px solid #d8e2ef',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        color: '#2C7BE5',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      title="Visualizar"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      style={{
                        background: 'none',
                        border: '1px solid #d8e2ef',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        color: '#e6832a',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      title="Editar"
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8a8d93', fontSize: '0.85rem' }}>
            Nenhum contrato encontrado.
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.72rem', color: '#8a8d93' }}>
        <span>Exibindo {filtered.length} de {contratosEmpresarial.length} contratos</span>
        <span>Total de vidas: <strong style={{ color: '#344050' }}>{filtered.reduce((acc, c) => acc + c.vidas, 0).toLocaleString('pt-BR')}</strong></span>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent style={{ maxWidth: '650px' }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: '1rem' }}>Detalhes do Contrato Empresarial</DialogTitle>
          </DialogHeader>
          {selectedContrato && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Número</label>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2C7BE5', margin: '2px 0' }}>{selectedContrato.numero}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Status</label>
                  <p style={{ margin: '2px 0' }}><span className={getStatusBadge(selectedContrato.status)}>{selectedContrato.status}</span></p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Empresa</label>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', margin: '2px 0' }}>{selectedContrato.empresa}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>CNPJ</label>
                  <p style={{ fontSize: '0.85rem', color: '#344050', margin: '2px 0' }}>{selectedContrato.cnpj}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Seguradora</label>
                  <p style={{ fontSize: '0.85rem', color: '#344050', margin: '2px 0' }}>{selectedContrato.seguradora}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Produto</label>
                  <p style={{ fontSize: '0.85rem', color: '#344050', margin: '2px 0' }}>{selectedContrato.produto}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Vigência</label>
                  <p style={{ fontSize: '0.85rem', color: '#344050', margin: '2px 0' }}>{selectedContrato.vigencia}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Vencimento</label>
                  <p style={{ fontSize: '0.85rem', color: '#344050', margin: '2px 0' }}>{selectedContrato.vencimento}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Vidas</label>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#344050', margin: '2px 0' }}>{selectedContrato.vidas}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: '#8a8d93', textTransform: 'uppercase', fontWeight: 600 }}>Valor Mensal</label>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#27ae60', margin: '2px 0' }}>{selectedContrato.valorMensal}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Empresarial;
