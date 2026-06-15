import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Filter, Loader2, Pencil, Plus, Search, Trash2, UploadCloud } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  createPortalFormulario,
  deletePortalFormulario,
  fetchPortalFormularios,
  getPortalFormularioDownloadUrl,
  updatePortalFormulario,
} from '../services/api';

const categories = [
  { id: 'movimentacao', label: 'Formulários de Movimentação', icon: '📋' },
  { id: 'reembolso', label: 'Tabelas de Reembolso', icon: '📊' },
  { id: 'carencia', label: 'Informações de Carência', icon: '⏱️' },
  { id: 'coparticipacao', label: 'Regras de Coparticipação', icon: '⚖️' },
  { id: 'coberturas', label: 'Coberturas e Exclusões', icon: '📄' },
  { id: 'manuais', label: 'Manuais Operacionais', icon: '📘' },
];

const initialFormData = {
  categoria: 'movimentacao',
  titulo: '',
  descricao: '',
  arquivoNome: '',
  arquivoUrl: '',
  arquivoBase64: '',
  contentType: '',
  tamanhoBytes: 0,
  status: 'Ativo',
  ordem: 0,
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

const categoryLabel = (id) => categories.find((item) => item.id === id)?.label || id || '-';

const PortalFormularios = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
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
      setData(await fetchPortalFormularios(search, statusFilter, categoryFilter));
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os documentos do Portal do Cliente.');
    }
    setLoading(false);
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => ({
    total: data.length,
    ativos: data.filter((item) => String(item.status || '').toLowerCase() === 'ativo').length,
    categorias: new Set(data.map((item) => item.categoria)).size,
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
      categoria: item.categoria || 'movimentacao',
      titulo: item.titulo || '',
      descricao: item.descricao || '',
      arquivoNome: item.arquivoNome || '',
      arquivoUrl: item.arquivoUrl || '',
      arquivoBase64: '',
      contentType: item.contentType || '',
      tamanhoBytes: item.tamanhoBytes || 0,
      status: item.status || 'Ativo',
      ordem: item.ordem || 0,
      observacoes: item.observacoes || '',
    });
    setError('');
    setShowForm(true);
  };

  const handleFileChange = async (file) => {
    if (!file) return;
    const arquivoBase64 = await fileToBase64(file);
    setSelectedFileLabel(file.name);
    setFormData((prev) => ({
      ...prev,
      arquivoNome: file.name,
      arquivoBase64,
      contentType: file.type || 'application/octet-stream',
      tamanhoBytes: file.size || 0,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (!formData.titulo.trim()) throw new Error('Informe o nome do documento.');
      if (!editing && !formData.arquivoBase64 && !formData.arquivoUrl.trim()) {
        throw new Error('Anexe um arquivo ou informe um link do documento.');
      }

      const payload = {
        ...formData,
        ordem: Number(formData.ordem || 0),
        tamanhoBytes: Number(formData.tamanhoBytes || 0),
      };
      if (!payload.arquivoBase64) delete payload.arquivoBase64;

      if (editing?.id) await updatePortalFormulario(editing.id, payload);
      else await createPortalFormulario(payload);

      setShowForm(false);
      setEditing(null);
      setSelectedFileLabel('');
      setFormData(initialFormData);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || err.message || 'Não foi possível salvar o documento.');
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir o documento "${item.titulo}" do Portal do Cliente?`)) return;
    try {
      await deletePortalFormulario(item.id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Não foi possível excluir o documento.');
    }
  };

  const openDocument = (item) => {
    const url = getPortalFormularioDownloadUrl(item);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#2C7BE515', display:'flex', alignItems:'center', justifyContent:'center' }}><FileText size={18} color="#2C7BE5" /></div>
          <div>
            <h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Formulários e Manuais</h2>
            <p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Cadastre os documentos exibidos na seção Formulários e Manuais do Portal do Cliente.</p>
          </div>
        </div>
        <Button onClick={openCreate} style={{ background:'#2C7BE5', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Novo Documento</Button>
      </div>

      {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:'8px', padding:'10px 12px', marginBottom:'12px', fontSize:'0.86rem' }}>{error}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:'12px', marginBottom:'12px' }}>
        <div style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'10px', padding:'14px' }}><div style={{ color:'#8a8d93', fontSize:'0.72rem', fontWeight:700 }}>Documentos</div><strong style={{ fontSize:'1.4rem', color:'#344050' }}>{stats.total}</strong></div>
        <div style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'10px', padding:'14px' }}><div style={{ color:'#8a8d93', fontSize:'0.72rem', fontWeight:700 }}>Ativos no portal</div><strong style={{ fontSize:'1.4rem', color:'#27ae60' }}>{stats.ativos}</strong></div>
        <div style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'10px', padding:'14px' }}><div style={{ color:'#8a8d93', fontSize:'0.72rem', fontWeight:700 }}>Categorias usadas</div><strong style={{ fontSize:'1.4rem', color:'#2C7BE5' }}>{stats.categorias}</strong></div>
      </div>

      <div className="filters-toggle" onClick={() => setShowFilters(!showFilters)} style={{ background:'#2C7BE5' }}><Filter size={11} style={{ marginRight:'4px' }}/>Filtros</div>
      {showFilters && (
        <div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 180px 260px', gap:'12px', alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#8a8d93' }}/>
              <Input placeholder="Buscar por documento, descrição, categoria ou arquivo..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft:'32px', fontSize:'0.8rem' }}/>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px 12px', fontSize:'0.8rem', color:'#344050', background:'#fff' }}>
              <option value="todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px 12px', fontSize:'0.8rem', color:'#344050', background:'#fff' }}>
              <option value="todos">Todas as categorias</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'auto', marginTop:showFilters ? 0 : '12px' }}>
        {loading ? <div style={{ display:'flex', justifyContent:'center', padding:'40px' }}><Loader2 size={24} style={{ color:'#2C7BE5', animation:'spin 1s linear infinite' }}/></div> : (
          <table className="data-table">
            <thead><tr><th>Categoria</th><th>Documento</th><th>Descrição</th><th>Arquivo / Link</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>{data.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight:700, color:'#2C7BE5' }}>{item.categoriaIcone || '📄'} {item.categoriaLabel || categoryLabel(item.categoria)}</td>
                <td style={{ fontWeight:600 }}>{item.titulo}</td>
                <td style={{ maxWidth:'260px', whiteSpace:'normal' }}>{item.descricao || '-'}</td>
                <td>{item.arquivoNome || item.arquivoUrl || '-'}</td>
                <td>{item.ordem || 0}</td>
                <td><span className={String(item.status || '').toLowerCase() === 'ativo' ? 'badge-aprovado' : 'badge-cancelado'}>{item.status || 'Ativo'}</span></td>
                <td>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <Button variant="outline" onClick={() => openDocument(item)} style={{ padding:'6px 8px' }}><Download size={13}/></Button>
                    <Button variant="outline" onClick={() => openEdit(item)} style={{ padding:'6px 8px' }}><Pencil size={13}/></Button>
                    <Button variant="outline" onClick={() => handleDelete(item)} style={{ padding:'6px 8px', color:'#e63757' }}><Trash2 size={13}/></Button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {!loading && data.length === 0 && <div style={{ padding:'40px', textAlign:'center', color:'#8a8d93' }}>Nenhum documento cadastrado para o Portal do Cliente.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth:'780px' }}>
          <DialogHeader><DialogTitle>{editing ? 'Editar Documento' : 'Novo Documento do Portal do Cliente'}</DialogTitle></DialogHeader>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', padding:'8px 0' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 160px 140px', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Categoria</label>
                <select value={formData.categoria} onChange={(e) => updateField('categoria', e.target.value)} style={{ width:'100%', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px 12px', fontSize:'0.85rem' }}>
                  {categories.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Status</label>
                <select value={formData.status} onChange={(e) => updateField('status', e.target.value)} style={{ width:'100%', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px 12px', fontSize:'0.85rem' }}>
                  <option>Ativo</option>
                  <option>Inativo</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Ordem</label>
                <Input type="number" value={formData.ordem} onChange={(e) => updateField('ordem', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Nome do documento</label>
              <Input placeholder="Ex.: Guia de Inclusão - Tabela A" value={formData.titulo} onChange={(e) => updateField('titulo', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Descrição</label>
              <Input placeholder="Texto de apoio exibido no portal" value={formData.descricao} onChange={(e) => updateField('descricao', e.target.value)} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <label style={{ border:'1px dashed #b7c7dc', borderRadius:'10px', padding:'16px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', color:'#344050' }}>
                <UploadCloud size={22} color="#2C7BE5"/>
                <span>
                  <strong style={{ display:'block', fontSize:'0.86rem' }}>{selectedFileLabel || 'Selecionar arquivo'}</strong>
                  <span style={{ color:'#8a8d93', fontSize:'0.72rem' }}>PDF, XLSX, DOCX, CSV ou imagem</span>
                </span>
                <Input type="file" onChange={(e) => handleFileChange(e.target.files?.[0])} style={{ display:'none' }} />
              </label>
              <div>
                <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Link externo do documento</label>
                <Input placeholder="https://..." value={formData.arquivoUrl} onChange={(e) => updateField('arquivoUrl', e.target.value)} />
                <div style={{ color:'#8a8d93', fontSize:'0.68rem', marginTop:'5px' }}>Use link quando o arquivo estiver hospedado fora do sistema.</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 120px', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Nome do arquivo</label>
                <Input placeholder="Nome usado no download" value={formData.arquivoNome} onChange={(e) => updateField('arquivoNome', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Tamanho</label>
                <Input value={formatSize(formData.tamanhoBytes)} disabled />
              </div>
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', color:'#8a8d93', fontWeight:600 }}>Observações internas</label>
              <textarea value={formData.observacoes} onChange={(e) => updateField('observacoes', e.target.value)} placeholder="Notas internas para a equipe" style={{ width:'100%', minHeight:'76px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px 12px', fontSize:'0.85rem', fontFamily:'inherit' }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button style={{ background:'#2C7BE5', color:'#fff' }} onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Documento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalFormularios;
