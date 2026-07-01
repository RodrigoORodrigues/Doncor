import React, { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Loader2, FileText, CheckCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { fetchPortalDonCorSolicitacoes, updatePortalDonCorSolicitacao } from '../services/api';

const PortalSolicitacoes = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchPortalDonCorSolicitacoes({ search, status: statusFilter, tipo: tipoFilter });
      setData(response || []);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar as solicitações.');
    }
    setLoading(false);
  }, [search, statusFilter, tipoFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleComplete = async (item) => {
    try {
      await updatePortalDonCorSolicitacao(item.id, { status: 'Concluído' });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao concluir solicitação.');
    }
  };

  return (
    <div className="page-container fadeIn">
      <div className="page-header">
        <div>
          <h2>Solicitações (Portal do Cliente)</h2>
          <p className="page-subtitle">Acompanhe as solicitações de movimentação dos clientes</p>
        </div>
      </div>

      <div className="card filters-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a5568', marginBottom: 6, display: 'block' }}>Buscar solicitação</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#a0aec0' }} />
              <Input
                placeholder="Protocolo, empresa, CPF, beneficiário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>
          <div style={{ width: 180 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a5568', marginBottom: 6, display: 'block' }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: '0.9rem', color: '#1a202c', backgroundColor: '#fff' }}
            >
              <option value="todos">Todos os status</option>
              <option value="Recebido">Recebido</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Concluído">Concluído</option>
            </select>
          </div>
          <div style={{ width: 180 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a5568', marginBottom: 6, display: 'block' }}>Tipo</label>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: '0.9rem', color: '#1a202c', backgroundColor: '#fff' }}
            >
              <option value="todos">Todos os tipos</option>
              <option value="inclusao">Inclusão</option>
              <option value="exclusao">Exclusão</option>
              <option value="alteracao">Alteração</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div style={{ padding: 16, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 20 }}>{error}</div>}

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#a0aec0' }}>
            <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <span>Carregando solicitações...</span>
          </div>
        ) : data.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#a0aec0' }}>
            <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4a5568' }}>Nenhuma solicitação encontrada</span>
            <span style={{ fontSize: '0.9rem', marginTop: 4 }}>Ajuste os filtros ou tente outra busca.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Empresa</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Beneficiário</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td><strong style={{ color: '#2a5fcf' }}>{item.protocolo}</strong></td>
                    <td>{item.empresa}<br/><span style={{ fontSize: '0.75rem', color: '#718096' }}>{item.documento}</span></td>
                    <td>{item.criadoEm}</td>
                    <td>{item.tipoLabel}</td>
                    <td>{item.beneficiario}<br/><span style={{ fontSize: '0.75rem', color: '#718096' }}>{item.cpf}</span></td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: item.status === 'Concluído' ? '#dcfce7' : item.status === 'Em andamento' ? '#fef08a' : '#e0f2fe',
                        color: item.status === 'Concluído' ? '#166534' : item.status === 'Em andamento' ? '#854d0e' : '#0369a1'
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.status !== 'Concluído' && (
                        <Button variant="outline" size="sm" onClick={() => handleComplete(item)} style={{ fontSize: '0.75rem', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <CheckCircle size={14} /> Concluir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalSolicitacoes;
