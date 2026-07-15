import React, { useCallback, useEffect, useState } from 'react';
import { Search, Filter, Loader2, UserCheck, Plus, Pencil, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { fetchPortalParceiros, createPortalParceiro, updatePortalParceiro, deletePortalParceiro } from '../services/api';

const initialFormData = {
  nome: '',
  empresa: '',
  documento: '',
  senha: '',
  confirmarSenha: '',
  email: '',
  telefone: '',
  contratos: '',
  status: 'Ativo',
  observacoes: '',
  acessoSinistralidade: false,
};

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const formatDocType = (doc) => onlyDigits(doc).length > 11 ? 'CNPJ' : 'CPF';
const formatContracts = (value) => Array.isArray(value) ? value.join(', ') : String(value || '');
const parseContracts = (value) => String(value || '').split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);

const PortalParceiros = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPortalParceiros(search, statusFilter));
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os cadastros do Portal do Cliente.');
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditing(null);
    setFormData(initialFormData);
    setError('');
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setFormData({
      nome: item.nome || '',
      empresa: item.empresa || '',
      documento: item.documento || '',
      senha: '',
      confirmarSenha: '',
      email: item.email || '',
      telefone: item.telefone || '',
      contratos: formatContracts(item.contratos),
      status: item.status || 'Ativo',
      observacoes: item.observacoes || '',
      acessoSinistralidade: !!item.acessoSinistralidade,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (!editing && !formData.senha) throw new Error('Cadastre uma senha inicial para este acesso.');
      if (formData.senha && formData.senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
      if (formData.senha !== formData.confirmarSenha) throw new Error('A confirmação da senha não confere.');

      const payload = { ...formData, contratos: parseContracts(formData.contratos) };
      delete payload.confirmarSenha;
      if (!payload.senha) delete payload.senha;
      if (editing?.id) await updatePortalParceiro(editing.id, payload);
      else await createPortalParceiro(payload);
      setShowForm(false);
      setEditing(null);
      setFormData(initialFormData);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || err.message || 'Não foi possível salvar o cadastro.');
    }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir o acesso do Portal do Cliente para ${item.nome || item.empresa || item.documento}?`)) return;
    try {
      await deletePortalParceiro(item.id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Não foi possível excluir o cadastro.');
    }
  };

  const statusBadge = (status) => String(status || '').toLowerCase() === 'ativo' ? 'badge-aprovado' : 'badge-cancelado';

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#2C7BE515', display:'flex', alignItems:'center', justifyContent:'center' }}><UserCheck size={18} color="#2C7BE5" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Acessos e Clientes (Portal do Cliente)</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Gerencie as contas dos clientes para o Portal do Cliente.</p></div>
        </div>
        <Button onClick={openCreate} style={{ background:'#2C7BE5', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Novo Acesso</Button>
      </div>

      {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:'8px', padding:'10px 12px', marginBottom:'12px', fontSize:'0.86rem' }}>{error}</div>}

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#2C7BE5'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <div style={{ flex:1, position:'relative' }}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar por nome, empresa, CPF, CNPJ, e-mail, telefone ou contrato..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.8rem',color:'#344050',background:'#fff',cursor:'pointer'}}>
            <option value="todos">Todos</option><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option><option value="Bloqueado">Bloqueado</option>
          </select>
        </div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'auto', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#2C7BE5',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Tipo</th><th>CPF/CNPJ</th><th>Nome</th><th>Empresa</th><th>E-mail</th><th>Telefone</th><th>Contratos</th><th>Sinistralidade & BI</th><th>Senha</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>{data.map((item)=>(<tr key={item.id || item.documento}>
              <td style={{fontWeight:700,color:'#2C7BE5'}}>{item.tipo || formatDocType(item.documento)}</td>
              <td style={{fontWeight:600}}>{item.documento}</td>
              <td>{item.nome || '-'}</td><td>{item.empresa || '-'}</td><td>{item.email || '-'}</td><td>{item.telefone || '-'}</td>
              <td style={{maxWidth:'220px',whiteSpace:'normal'}}>{formatContracts(item.contratos) || '-'}</td>
              <td>
                <span className={item.acessoSinistralidade ? 'badge-aprovado' : 'badge-cancelado'}>
                  {item.acessoSinistralidade ? 'Permitido' : 'Bloqueado'}
                </span>
              </td>
              <td><span className={item.senhaDefinida ? 'badge-aprovado' : 'badge-pendente'}>{item.senhaDefinida ? 'Definida' : 'Pendente'}</span></td>
              <td><span className={statusBadge(item.status)}>{item.status || 'Ativo'}</span></td>
              <td><div style={{display:'flex',gap:'6px'}}><Button variant="outline" onClick={()=>openEdit(item)} style={{padding:'6px 8px'}}><Pencil size={13}/></Button><Button variant="outline" onClick={()=>handleDelete(item)} style={{padding:'6px 8px',color:'#e63757'}}><Trash2 size={13}/></Button></div></td>
            </tr>))}</tbody>
          </table>
        )}
        {!loading && data.length===0 && <div style={{padding:'40px',textAlign:'center',color:'#8a8d93'}}>Nenhum CPF/CNPJ cadastrado para o Portal do Cliente.</div>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',fontSize:'0.72rem',color:'#8a8d93'}}><span>Exibindo {data.length} registros</span><span>Portal externo: /portal-doncor</span></div>

      <Dialog open={showForm} onOpenChange={setShowForm}><DialogContent style={{maxWidth:'760px'}}><DialogHeader><DialogTitle>{editing ? 'Editar Acesso do Portal' : 'Novo Acesso do Portal do Cliente'}</DialogTitle></DialogHeader>
        <div style={{display:'flex',flexDirection:'column',gap:'12px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome / Responsável</label><Input placeholder="Nome do responsável ou beneficiário" value={formData.nome} onChange={e=>updateField('nome', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Empresa</label><Input placeholder="Nome da empresa" value={formData.empresa} onChange={e=>updateField('empresa', e.target.value)}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CPF ou CNPJ</label><Input placeholder="Somente números ou formatado" value={formData.documento} onChange={e=>updateField('documento', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Telefone</label><Input placeholder="(00) 00000-0000" value={formData.telefone} onChange={e=>updateField('telefone', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Status</label><select value={formData.status} onChange={e=>updateField('status', e.target.value)} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}><option>Ativo</option><option>Inativo</option><option>Bloqueado</option></select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>{editing ? 'Nova senha do portal (opcional)' : 'Senha inicial do portal'}</label><Input type="password" placeholder={editing ? 'Preencha somente para trocar a senha' : 'Mínimo 6 caracteres'} value={formData.senha} onChange={e=>updateField('senha', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Confirmar senha</label><Input type="password" placeholder="Repita a senha" value={formData.confirmarSenha} onChange={e=>updateField('confirmarSenha', e.target.value)}/></div>
          </div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>E-mail</label><Input type="email" placeholder="email@empresa.com.br" value={formData.email} onChange={e=>updateField('email', e.target.value)}/></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Contratos vinculados</label><Input placeholder="Ex.: EMP-2024-001, EMP-2024-002" value={formData.contratos} onChange={e=>updateField('contratos', e.target.value)}/><div style={{fontSize:'0.68rem',color:'#8a8d93',marginTop:'4px'}}>Separe contratos por vírgula, ponto e vírgula ou quebra de linha. Se deixar vazio, o portal tentará localizar automaticamente pelo CPF/CNPJ nos contratos/movimentações.</div></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Observações</label><textarea placeholder="Observações internas sobre este acesso" value={formData.observacoes} onChange={e=>updateField('observacoes', e.target.value)} style={{width:'100%',minHeight:'78px',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem',fontFamily:'inherit'}} /></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px' }}>
            <input 
              type="checkbox" 
              id="acessoSinistralidade"
              checked={!!formData.acessoSinistralidade} 
              onChange={e => updateField('acessoSinistralidade', e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2C7BE5' }}
            />
            <label htmlFor="acessoSinistralidade" style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
              Liberar acesso à seção "Sinistralidade e BI" para este cliente
            </label>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowForm(false)}>Cancelar</Button><Button style={{background:'#2C7BE5',color:'#fff'}} onClick={handleSave} disabled={saving}>{saving?'Salvando...':'Salvar Acesso'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default PortalParceiros;
