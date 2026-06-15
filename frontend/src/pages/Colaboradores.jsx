import React, { useState, useEffect, useCallback } from 'react';
import { fetchColaboradores, createColaborador, updateColaborador, deleteColaborador } from '../services/api';
import { UserCog, Search, Filter, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 8;
const FIXED_ROLES = ['Diretoria', 'Gerencia', 'Analista'];
const AVAILABLE_PAGES = ['dashboard','adesao','empresarial','inclusao','exclusao','transferencia','faturas','comissoes','seguradoras','produtos','colaboradores','portal-parceiros','portal-formularios','relatorios','robo','robo-config','perfil','configuracoes','suporte'];

const Colaboradores = ({ session, accessByRole, onAccessChange }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ nome:'', cargo:'', email:'', telefone:'', departamento:'Diretoria', status:'Ativo' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchColaboradores(search)); } catch(e){console.error(e);} setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createColaborador(form); setShowNew(false); setForm({ nome:'', cargo:'', email:'', telefone:'', departamento:'Diretoria', status:'Ativo' }); loadData(); } catch(e){console.error(e);} setSaving(false);
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try { await updateColaborador(id, editData); setEditingId(null); loadData(); } catch(e){console.error(e);} setSaving(false);
  };

  const handleDelete = async (id) => { if (!window.confirm('Excluir colaborador?')) return; try { await deleteColaborador(id); loadData(); } catch(e){console.error(e);} };

  const startEdit = (item) => { setEditingId(item.id); setEditData({ nome:item.nome, cargo:item.cargo, email:item.email, telefone:item.telefone, departamento:item.departamento, status:item.status }); };

  const updateRoleAccess = (role, pageKey, checked) => {
    const next = { ...accessByRole };
    const current = new Set(next[role] || []);
    if (checked) current.add(pageKey); else current.delete(pageKey);
    next[role] = Array.from(current);
    onAccessChange(next);
  };

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const paged = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const getStatusBadge = (s) => ({'Ativo':'badge-ativo','Inativo':'badge-cancelado'}[s]||'badge-pendente');
  const inlineInput = (field) => <Input value={editData[field]||''} onChange={e=>setEditData({...editData,[field]:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px'}} />;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#2C7BE515', display:'flex', alignItems:'center', justifyContent:'center' }}><UserCog size={18} color="#2C7BE5" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Colaboradores</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Gestão de equipe da corretora</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#2C7BE5', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Novo Colaborador</Button>
      </div>

      {session?.role === 'Master' && (
        <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:'16px', marginBottom:'16px' }}>
          <h3 style={{ margin: 0, color: '#344050', fontSize: '0.95rem' }}>Controle de Acesso dos Colaboradores</h3>
          <p style={{ fontSize: '0.76rem', color: '#8a8d93', margin: '4px 0 12px' }}>Perfis permitidos para cadastro: Diretoria, Gerencia e Analista.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {FIXED_ROLES.map((role) => (
              <div key={role} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: '#2c3e50' }}>{role}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(100px, 1fr))', gap: '8px' }}>
                  {AVAILABLE_PAGES.map((pageKey) => (
                    <label key={pageKey} style={{ fontSize: '0.75rem', color: '#5E6E82', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={(accessByRole?.[role] || []).includes(pageKey)} onChange={(e) => updateRoleAccess(role, pageKey, e.target.checked)} />
                      {pageKey}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#2C7BE5'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}><div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar nome, cargo, email..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div></div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#2C7BE5',animation:'spin 1s linear infinite'}}/></div> : (<table className="data-table"><thead><tr><th>Nome</th><th>Cargo</th><th>Email</th><th>Telefone</th><th>Perfil</th><th>Admissão</th><th>Status</th><th style={{width:'100px'}}>Ações</th></tr></thead><tbody>{paged.map(item=>(<tr key={item.id}>{editingId===item.id ? (<><td>{inlineInput('nome')}</td><td>{inlineInput('cargo')}</td><td>{inlineInput('email')}</td><td>{inlineInput('telefone')}</td><td><select value={editData.departamento} onChange={e=>setEditData({...editData,departamento:e.target.value})} style={{fontSize:'0.75rem',padding:'4px 6px',border:'1px solid #d8e2ef',borderRadius:'4px',width:'100%'}}>{FIXED_ROLES.map((r)=><option key={r}>{r}</option>)}</select></td><td>{item.dataAdmissao}</td><td><select value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} style={{fontSize:'0.75rem',padding:'4px 6px',border:'1px solid #d8e2ef',borderRadius:'4px'}}><option>Ativo</option><option>Inativo</option></select></td><td><div style={{display:'flex',gap:'4px'}}><button onClick={()=>handleSaveEdit(item.id)} style={{background:'none',border:'1px solid #27ae60',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#27ae60'}}><Save size={13}/></button><button onClick={()=>setEditingId(null)} style={{background:'none',border:'1px solid #e63757',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><X size={13}/></button></div></td></>) : (<><td style={{fontWeight:600}}>{item.nome}</td><td>{item.cargo}</td><td style={{fontSize:'0.75rem',color:'#2C7BE5'}}>{item.email}</td><td style={{fontSize:'0.75rem'}}>{item.telefone}</td><td><span style={{background:'#edf2f9',padding:'2px 8px',borderRadius:'10px',fontSize:'0.68rem',fontWeight:500}}>{FIXED_ROLES.includes(item.departamento) ? item.departamento : 'Analista'}</span></td><td style={{fontSize:'0.75rem'}}>{item.dataAdmissao}</td><td><span className={getStatusBadge(item.status)}>{item.status}</span></td><td><div style={{display:'flex',gap:'4px'}}><button onClick={()=>startEdit(item)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e6832a'}}><Edit size={13}/></button><button onClick={()=>handleDelete(item.id)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><Trash2 size={13}/></button></div></td></>)}</tr>))}</tbody></table>)}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.length} pageSize={PAGE_SIZE} />

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'550px'}}><DialogHeader><DialogTitle>Novo Colaborador</DialogTitle></DialogHeader><div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'8px 0'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome Completo</label><Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Cargo</label><Input value={form.cargo} onChange={e=>setForm({...form,cargo:e.target.value})}/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Perfil</label><select value={form.departamento} onChange={e=>setForm({...form,departamento:e.target.value})} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}>{FIXED_ROLES.map((r)=><option key={r}>{r}</option>)}</select></div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Email</label><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Telefone</label><Input value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/></div></div></div><DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#2C7BE5',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Criar'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

export default Colaboradores;
