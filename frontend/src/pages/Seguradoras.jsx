import React, { useState, useEffect, useCallback } from 'react';
import { fetchSeguradoras as fetchSeguradorasApi, createSeguradora, updateSeguradora, deleteSeguradora } from '../services/api';
import { Building2, Search, Filter, Plus, Edit, Trash2, Save, X, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 8;

const Seguradoras = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ nome:'', codigo:'', cnpj:'', telefone:'', email:'', endereco:'', status:'Ativo' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchSeguradorasApi(search)); } catch(e){console.error(e);}
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createSeguradora(form); setShowNew(false); setForm({ nome:'', codigo:'', cnpj:'', telefone:'', email:'', endereco:'', status:'Ativo' }); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try { await updateSeguradora(id, editData); setEditingId(null); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir seguradora?')) return;
    try { await deleteSeguradora(id); loadData(); } catch(e){console.error(e);}
  };

  const startEdit = (item) => { setEditingId(item.id); setEditData({ nome: item.nome, codigo: item.codigo, cnpj: item.cnpj, telefone: item.telefone, email: item.email, endereco: item.endereco, status: item.status }); };

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const getStatusBadge = (s) => ({'Ativo':'badge-ativo','Inativo':'badge-cancelado'}[s]||'badge-pendente');

  const inlineInput = (field, placeholder='') => (
    <Input value={editData[field]||''} onChange={e=>setEditData({...editData,[field]:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px'}} placeholder={placeholder} />
  );

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#4979bb15', display:'flex', alignItems:'center', justifyContent:'center' }}><Building2 size={18} color="#4979bb" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Seguradoras</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Cadastro e gestão de seguradoras</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#4979bb', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Nova Seguradora</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar seguradora..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#4979bb',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Código</th><th>Nome</th><th>CNPJ</th><th>Telefone</th><th>Email</th><th>Contratos</th><th>Vidas</th><th>Status</th><th style={{width:'100px'}}>Ações</th></tr></thead>
            <tbody>{paged.map(item=>(<tr key={item.id}>
              {editingId===item.id ? (<>
                <td>{inlineInput('codigo')}</td><td>{inlineInput('nome')}</td><td>{inlineInput('cnpj')}</td><td>{inlineInput('telefone')}</td><td>{inlineInput('email')}</td>
                <td style={{textAlign:'center'}}>{item.contratos}</td><td style={{textAlign:'center'}}>{item.vidas}</td>
                <td><select value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} style={{fontSize:'0.75rem',padding:'4px 6px',border:'1px solid #d8e2ef',borderRadius:'4px'}}><option>Ativo</option><option>Inativo</option></select></td>
                <td><div style={{display:'flex',gap:'4px'}}>
                  <button onClick={()=>handleSaveEdit(item.id)} style={{background:'none',border:'1px solid #27ae60',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#27ae60'}}><Save size={13}/></button>
                  <button onClick={()=>setEditingId(null)} style={{background:'none',border:'1px solid #e63757',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><X size={13}/></button>
                </div></td>
              </>) : (<>
                <td style={{fontWeight:500,color:'#5E6E82'}}>{item.codigo}</td><td style={{fontWeight:600}}>{item.nome}</td><td style={{fontSize:'0.75rem'}}>{item.cnpj}</td><td style={{fontSize:'0.75rem'}}>{item.telefone}</td><td style={{fontSize:'0.75rem'}}>{item.email}</td>
                <td style={{textAlign:'center',fontWeight:600}}>{item.contratos}</td><td style={{textAlign:'center',fontWeight:600}}>{item.vidas}</td>
                <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                <td><div style={{display:'flex',gap:'4px'}}>
                  <button onClick={()=>startEdit(item)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e6832a'}}><Edit size={13}/></button>
                  <button onClick={()=>handleDelete(item.id)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><Trash2 size={13}/></button>
                </div></td>
              </>)}
            </tr>))}</tbody>
          </table>
        )}
        {!loading && data.length===0 && <div style={{padding:'40px',textAlign:'center',color:'#8a8d93'}}>Nenhuma seguradora encontrada.</div>}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.length} pageSize={PAGE_SIZE} />

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'550px'}}><DialogHeader><DialogTitle>Nova Seguradora</DialogTitle></DialogHeader>
        <div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome</label><Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Código</label><Input value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})} placeholder="SEG-XXX"/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CNPJ</label><Input value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Telefone</label><Input value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/></div>
          </div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Email</label><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Endereço</label><Input value={form.endereco} onChange={e=>setForm({...form,endereco:e.target.value})}/></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#4979bb',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Criar'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default Seguradoras;
