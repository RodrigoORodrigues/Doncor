import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Filter, Loader2, Pencil, Plus, Search, Trash2, UploadCloud, BarChart2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import {
  createPortalSinistralidade,
  deletePortalSinistralidade,
  fetchPortalSinistralidade,
  getPortalSinistralidadeDownloadUrl,
  updatePortalSinistralidade,
} from '../services/api';

const initialFormData = {
  documento: '',
  empresa: '',
  titulo: '',
  descricao: '',
  arquivoNome: '',
  arquivoUrl: '',
  arquivoBase64: '',
  contentType: '',
  tamanhoBytes: 0,
  status: 'Ativo',
  observacoes: '',
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || '').split(',', 2)[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const formatSize = (value) => {
  const bytes = Number(value || 0);
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PortalSinistralidade = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedFileLabel, setSelectedFileLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPortalSinistralidade(search, statusFilter));
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os documentos de Sinistralidade e BI.');
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => ({
    total: data.length,
    ativos: data.filter((item) => String(item.status || '').toLowerCase() === 'ativo').length,
  }), [data]);

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditing(null);
    setSelectedFileLabel('');
    setFormData(initialFormData);
    setError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setSelectedFileLabel(item.arquivoNome || '');
    setFormData({
      documento: item.documento || '',
      empresa: item.empresa || '',
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      arquivoNome: item.arquivoNome || '',
      arquivoUrl: item.arquivoUrl || '',
      arquivoBase64: '',
      contentType: item.contentType || '',
      tamanhoBytes: item.tamanhoBytes || 0,
      status: item.status || 'Ativo',
      observacoes: item.observacoes || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setSelectedFileLabel(file.name);
      setFormData((prev) => ({
        ...prev,
        arquivoNome: file.name,
        contentType: file.type,
        tamanhoBytes: file.size,
        arquivoBase64: b64,
        arquivoUrl: '',
      }));
    } catch (err) {
      console.error('Erro ao ler arquivo', err);
      alert('Não foi possível processar o arquivo.');
    }
  };

  const save = async () => {
    if (!formData.titulo) return setError('Informe o título do documento.');
    if (!formData.documento) return setError('Informe o CNPJ/CPF do cliente.');
    if (!formData.empresa) return setError('Informe o nome da empresa.');
    if (!formData.arquivoBase64 && !formData.arquivoUrl && !editing?.id) return setError('Anexe um arquivo ou informe a URL.');
    
    setSaving(true);
    setError('');
    try {
      if (editing?.id) {
        await updatePortalSinistralidade(editing.id, formData);
      } else {
        await createPortalSinistralidade(formData);
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Erro ao salvar o documento.');
    }
    setSaving(false);
  };

  const remove = async (item) => {
    if (!window.confirm(`Excluir documento "${item.titulo}"?`)) return;
    try {
      await deletePortalSinistralidade(item.id);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir documento.');
    }
  };

  return (
    <div className="page-container fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#2C7BE515', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={18} color="#2C7BE5" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Sinistralidade e BI</h2>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>Gerencie relatórios de sinistralidade e BI para os clientes no Portal do Cliente.</p>
        </div>
        <Button onClick={openCreate} style={{ background: '#2C7BE5', color: '#fff', display: 'flex', gap: 8 }}>
          <Plus size={16} /> Novo Documento
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 200, padding: 16, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total de Relatórios</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>{stats.total}</span>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 200, padding: 16, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Relatórios Ativos</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>{stats.ativos}</span>
        </div>
      </div>

      <div className="card filters-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showFilters ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={16} color="#64748b" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Filtros de busca</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} style={{ height: 30, fontSize: '0.8rem' }}>
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
        </div>
        
        {showFilters && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a5568', marginBottom: 6, display: 'block' }}>Buscar documento</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#a0aec0' }} />
                <Input placeholder="Título, descrição, empresa..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
              </div>
            </div>
            <div style={{ width: 160 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4a5568', marginBottom: 6, display: 'block' }}>Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: '0.9rem' }}>
                <option value="todos">Todos</option>
                <option value="Ativo">Ativos</option>
                <option value="Inativo">Inativos</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {error && !showForm && (
        <div style={{ padding: 16, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 20, fontSize: '0.9rem' }}>{error}</div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#a0aec0' }}>
            <Loader2 size={32} className="animate-spin" style={{ marginBottom: 16 }} />
            <span>Carregando relatórios...</span>
          </div>
        ) : data.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#a0aec0' }}>
            <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#4a5568' }}>Nenhum relatório encontrado</span>
            <span style={{ fontSize: '0.9rem', marginTop: 4 }}>Adicione um novo documento ou ajuste os filtros.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Documento / Empresa</th>
                  <th>Título / Arquivo</th>
                  <th>Tamanho</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.empresa}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{item.documento}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.titulo}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{item.arquivoNome || 'Link externo'}</div>
                    </td>
                    <td><span style={{ fontSize: '0.85rem', color: '#475569' }}>{formatSize(item.tamanhoBytes)}</span></td>
                    <td><span style={{ fontSize: '0.85rem', color: '#475569' }}>{item.createdAt}</span></td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: String(item.status).toLowerCase() === 'ativo' ? '#dcfce7' : '#f1f5f9',
                        color: String(item.status).toLowerCase() === 'ativo' ? '#166534' : '#64748b'
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {(item.arquivoUrl || item.arquivoNome) && (
                          <a href={getPortalSinistralidadeDownloadUrl(item)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, backgroundColor: '#f1f5f9', color: '#475569' }}>
                            <Download size={16} />
                          </a>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)} style={{ width: 32, height: 32, padding: 0 }}><Pencil size={16} color="#64748b" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(item)} style={{ width: 32, height: 32, padding: 0 }}><Trash2 size={16} color="#ef4444" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Documento' : 'Novo Documento de Sinistralidade'}</DialogTitle>
            <DialogDescription>Preencha os dados do relatório para o Portal do Cliente.</DialogDescription>
          </DialogHeader>

          {error && <div style={{ padding: 12, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.85rem', marginBottom: 16 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>CNPJ/CPF do Cliente *</label>
              <Input placeholder="Apenas números..." value={formData.documento} onChange={(e) => updateField('documento', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Nome da Empresa *</label>
              <Input placeholder="Razão social..." value={formData.empresa} onChange={(e) => updateField('empresa', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Título do Documento *</label>
              <Input placeholder="Ex: Relatório Sinistralidade 2026..." value={formData.titulo} onChange={(e) => updateField('titulo', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Descrição (opcional)</label>
              <Input placeholder="Breve resumo..." value={formData.descricao} onChange={(e) => updateField('descricao', e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Arquivo ou Link</label>
            <div style={{ border: '2px dashed #e2e8f0', borderRadius: 8, padding: 20, textAlign: 'center', backgroundColor: '#f8fafc', position: 'relative' }}>
              <UploadCloud size={32} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500, marginBottom: 4 }}>
                {selectedFileLabel ? selectedFileLabel : 'Clique para selecionar um arquivo PDF ou Imagem'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tamanho máximo: 10MB</div>
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleFileSelect} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 16, color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>OU</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Link Externo (URL)</label>
            <Input placeholder="https://..." value={formData.arquivoUrl} onChange={(e) => updateField('arquivoUrl', e.target.value)} disabled={!!formData.arquivoBase64} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Status</label>
              <select value={formData.status} onChange={(e) => updateField('status', e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: '0.9rem' }}>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Observações</label>
              <Input placeholder="Opcional..." value={formData.observacoes} onChange={(e) => updateField('observacoes', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving} style={{ background: '#2C7BE5', color: '#fff' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalSinistralidade;
