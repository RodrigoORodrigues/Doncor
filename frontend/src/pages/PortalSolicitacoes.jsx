import React, { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Loader2, FileText, CheckCircle, Eye, Download, Paperclip } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { fetchPortalDonCorSolicitacoes, updatePortalDonCorSolicitacao } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const PortalSolicitacoes = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [error, setError] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [previewAtt, setPreviewAtt] = useState(null);

  const handleDownloadAttachment = (att) => {
    if (!att || !att.base64) return;
    const link = document.createElement('a');
    link.href = att.base64.startsWith('data:') ? att.base64 : `data:${att.type || 'application/octet-stream'};base64,${att.base64}`;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewAttachment = (att) => {
    setPreviewAtt(att);
  };

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

  const handleStatusChange = async (item, newStatus) => {
    try {
      await updatePortalDonCorSolicitacao(item.id, { status: newStatus });
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status da solicitação.');
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
              <option value="Enviado">Enviado</option>
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
          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: '100%' }}>
            <table className="table" style={{ fontSize: '0.8rem', minWidth: '1400px', borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Protocolo</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Contrato</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Empresa</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Beneficiário</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Nome da Mãe</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>CPF</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Nascimento</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Telefone</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>E-mail</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Parentesco</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Estado Civil</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Solicitação</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 10px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedProtocol(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#2a5fcf',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textAlign: 'left'
                        }}
                      >
                        {item.protocolo}
                      </button>
                    </td>
                    <td style={{ padding: '12px 10px' }}>{item.contrato || '-'}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 600 }}>{item.empresa || '-'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#718096' }}>{item.documento || '-'}</div>
                    </td>
                    <td style={{ fontWeight: 600, padding: '12px 10px' }}>{item.beneficiario || item.payload?.beneficiario || '-'}</td>
                    <td style={{ padding: '12px 10px' }}>{item.nomeMae || item.payload?.nomeMae || '-'}</td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>{item.cpf || item.payload?.cpf || '-'}</td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>{item.dataNascimento || item.payload?.dataNascimento || '-'}</td>
                    <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>{item.telefone || item.payload?.telefone || '-'}</td>
                    <td style={{ padding: '12px 10px' }}>{item.email || item.payload?.email || '-'}</td>
                    <td style={{ padding: '12px 10px' }}>{item.parentesco || item.payload?.parentesco || '-'}</td>
                    <td style={{ padding: '12px 10px' }}>{item.estadoCivil || item.payload?.estadoCivil || '-'}</td>
                    <td style={{ fontWeight: 600, padding: '12px 10px' }}>{item.tipoLabel || item.tipo || '-'}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <select
                        value={item.status === 'Recebido' ? 'Enviado' : (item.status || 'Enviado')}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        style={{
                          padding: '4px 22px 4px 8px',
                          borderRadius: 12,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1px solid transparent',
                          cursor: 'pointer',
                          outline: 'none',
                          backgroundColor: item.status === 'Concluído' ? '#dcfce7' : (item.status === 'Em andamento' ? '#fef08a' : '#e0f2fe'),
                          color: item.status === 'Concluído' ? '#166534' : (item.status === 'Em andamento' ? '#854d0e' : '#0369a1'),
                          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 6px center',
                          backgroundSize: '10px',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          transition: 'all 0.15s ease',
                          display: 'inline-block',
                          maxWidth: '135px'
                        }}
                      >
                        <option value="Enviado">Enviado</option>
                        <option value="Em andamento">Em andamento</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px' }}>
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
              <span style={{ fontWeight: 600, color: '#1a3a52' }}>{selectedProtocol?.status || 'Enviado'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Tipo de Solicitação</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.tipoLabel || selectedProtocol?.tipo || '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Data</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.criadoEm || '-'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Beneficiário</span>
              <span style={{ fontWeight: 600, color: '#1a3a52' }}>{selectedProtocol?.beneficiario || selectedProtocol?.payload?.beneficiario || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>CPF</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.cpf || selectedProtocol?.payload?.cpf || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Data Nascimento</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.dataNascimento || selectedProtocol?.payload?.dataNascimento || '-'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Nome da Mãe</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.nomeMae || selectedProtocol?.payload?.nomeMae || '-'}</span>
            </div>

            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Parentesco</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.parentesco || selectedProtocol?.payload?.parentesco || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Gênero</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.genero || selectedProtocol?.payload?.genero || '-'}</span>
            </div>

            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Estado Civil</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.estadoCivil || selectedProtocol?.payload?.estadoCivil || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Telefone</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.telefone || selectedProtocol?.payload?.telefone || '-'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>E-mail</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.email || selectedProtocol?.payload?.email || '-'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
            </div>

            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Contrato</span>
              <span style={{ fontWeight: 600, color: '#2a5fcf' }}>{selectedProtocol?.contrato || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Empresa</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.empresa || '-'}</span>
            </div>

            {/* Seção de Anexos */}
            {(selectedProtocol?.anexos || selectedProtocol?.attachments || [])?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2', marginTop: '8px' }}>
                <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Anexos / Documentos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(selectedProtocol?.anexos || selectedProtocol?.attachments || []).map((att, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 10px', background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <Paperclip size={14} color="#2C7BE5" />
                        <span style={{ fontWeight: 600, color: '#344050', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                        {att.size ? <span style={{ color: '#8a8d93', fontSize: '0.72rem', marginLeft: '6px' }}>({(att.size / 1024).toFixed(0)} KB)</span> : null}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewAttachment(att)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', height: '28px', cursor: 'pointer' }}
                        >
                          <Eye size={12} /> Visualizar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadAttachment(att)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', height: '28px', background: '#2C7BE5', color: '#fff', cursor: 'pointer' }}
                        >
                          <Download size={12} /> Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* Dialog para Visualização de Anexo */}
      <Dialog open={!!previewAtt} onOpenChange={(open) => !open && setPreviewAtt(null)}>
        <DialogContent style={{ maxWidth: '800px', width: '90%' }}>
          <DialogHeader>
            <DialogTitle>👁️ Visualizar Anexo: {previewAtt?.name}</DialogTitle>
          </DialogHeader>
          <div style={{ margin: '14px 0', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px' }}>
            {previewAtt ? (
              previewAtt.name.toLowerCase().endsWith('.pdf') || previewAtt.type?.includes('pdf') ? (
                <iframe
                  src={previewAtt.base64?.startsWith('data:') ? previewAtt.base64 : `data:application/pdf;base64,${previewAtt.base64}`}
                  style={{ width: '100%', height: '550px', border: 'none', borderRadius: '4px' }}
                  title="PDF Preview"
                />
              ) : previewAtt.name.toLowerCase().endsWith('.png') || previewAtt.name.toLowerCase().endsWith('.jpg') || previewAtt.name.toLowerCase().endsWith('.jpeg') || previewAtt.name.toLowerCase().endsWith('.gif') || previewAtt.type?.includes('image') ? (
                <img
                  src={previewAtt.base64?.startsWith('data:') ? previewAtt.base64 : `data:${previewAtt.type || 'image/png'};base64,${previewAtt.base64}`}
                  alt={previewAtt.name}
                  style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '4px' }}
                />
              ) : previewAtt.name.toLowerCase().endsWith('.txt') || previewAtt.type?.includes('text') ? (
                <pre style={{ width: '100%', maxHeight: '500px', overflow: 'auto', padding: '12px', background: '#fff', border: '1px solid #d8e2ef', borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {atob(previewAtt.base64.split(',')[1] || previewAtt.base64)}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Paperclip size={48} color="#8a8d93" style={{ marginBottom: '14px' }} />
                  <p style={{ fontWeight: 600, color: '#344050' }}>Visualização não suportada para este tipo de arquivo.</p>
                  <p style={{ fontSize: '0.78rem', color: '#8a8d93', marginTop: '4px' }}>Por favor, faça o download utilizando o botão abaixo para abrir em seu dispositivo.</p>
                  <Button onClick={() => handleDownloadAttachment(previewAtt)} style={{ marginTop: '16px', background: '#2C7BE5', color: '#fff' }}>
                    <Download size={14} style={{ marginRight: '6px' }} /> Baixar Arquivo
                  </Button>
                </div>
              )
            ) : null}
          </div>
          <DialogFooter style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {previewAtt && (
              <Button onClick={() => handleDownloadAttachment(previewAtt)} variant="outline">
                <Download size={14} style={{ marginRight: '6px' }} /> Baixar
              </Button>
            )}
            <Button onClick={() => setPreviewAtt(null)} style={{ background: '#2C7BE5', color: '#fff' }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalSolicitacoes;
