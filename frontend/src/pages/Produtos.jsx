import React, { useState, useEffect, useCallback } from 'react';
import { fetchProdutos, createProduto, updateProduto, deleteProduto } from '../services/api';
import { Package, Search, Filter, Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

const Produtos = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ nome:'', seguradora:'', tipo:'Saúde', cobertura:'Nacional', acomodacao:'Enfermaria', reajuste:'', status:'Ativo' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchProdutos(search)); } catch(e){console.error(e);}
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createProduto(form); setShowNew(false); setForm({ nome:'', seguradora:'', tipo:'Saúde', cobertura:'Nacional', acomodacao:'Enfermaria', reajuste:'', status:'Ativo' }); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try { await updateProduto(id, editData); setEditingId(null); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir produto?')) return;
    try { await deleteProduto(id); loadData(); } catch(e){console.error(e);}
  };

  const startEdit = (item) => { setEditingId(item.id); setEditData({ nome:item.nome, seguradora:item.seguradora, tipo:item.tipo, cobertura:item.cobertura, acomodacao:item.acomodacao, reajuste:item.reajuste, status:item.status }); };

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const getStatusBadge = (s) => ({'Ativo':'badge-ativo','Cancelado':'badge-cancelado','Suspenso':'badge-suspenso'}[s]||'badge-pendente');
  const inlineInput = (field) => <Input value={editData[field]||''} onChange={e=>setEditData({...editData,[field]:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px'}} />;
  const inlineSelect = (field, options) => <select value={editData[field]||''} onChange={e=>setEditData({...editData,[field]:e.target.value})} style={{fontSize:'0.75rem',padding:'4px 6px',border:'1px solid #d8e2ef',borderRadius:'4px',width:'100%'}}>{options.map(o=><option key={o}>{o}</option>)}</select>;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#e6832a15', display:'flex', alignItems:'center', justifyContent:'center' }}><Package size={18} color="#e6832a" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Produtos</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Cadastro e gestão de produtos</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#e6832a', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Novo Produto</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#e6832a'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar produto ou seguradora..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#e6832a',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Produto</th><th>Seguradora</th><th>Tipo</th><th>Cobertura</th><th>Acomodação</th><th>Reajuste</th><th>Contratos</th><th>Status</th><th style={{width:'100px'}}>Ações</th></tr></thead>
            <tbody>{paged.map(item=>(<tr key={item.id}>
              {editingId===item.id ? (<>
                <td>{inlineInput('nome')}</td><td>{inlineInput('seguradora')}</td><td>{inlineSelect('tipo',['Saúde','Odonto','Vida'])}</td><td>{inlineSelect('cobertura',['Nacional','Regional','Municipal'])}</td><td>{inlineSelect('acomodacao',['Enfermaria','Apartamento'])}</td><td>{inlineInput('reajuste')}</td>
                <td style={{textAlign:'center'}}>{item.contratosVinculados}</td>
                <td>{inlineSelect('status',['Ativo','Cancelado','Suspenso'])}</td>
                <td><div style={{display:'flex',gap:'4px'}}>
                  <button onClick={()=>handleSaveEdit(item.id)} style={{background:'none',border:'1px solid #27ae60',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#27ae60'}}><Save size={13}/></button>
                  <button onClick={()=>setEditingId(null)} style={{background:'none',border:'1px solid #e63757',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><X size={13}/></button>
                </div></td>
              </>) : (<>
                <td style={{fontWeight:600}}>{item.nome}</td><td>{item.seguradora}</td><td>{item.tipo}</td><td>{item.cobertura}</td><td>{item.acomodacao}</td><td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.reajuste}</td>
                <td style={{textAlign:'center',fontWeight:600}}>{item.contratosVinculados}</td>
                <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
                <td><div style={{display:'flex',gap:'4px'}}>
                  <button onClick={()=>startEdit(item)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e6832a'}}><Edit size={13}/></button>
                  <button onClick={()=>handleDelete(item.id)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><Trash2 size={13}/></button>
                </div></td>
              </>)}
            </tr>))}</tbody>
          </table>
        )}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.length} pageSize={PAGE_SIZE} />

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'550px'}}><DialogHeader><DialogTitle>Novo Produto</DialogTitle></DialogHeader>
        <div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome</label><Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Seguradora</label><Input value={form.seguradora} onChange={e=>setForm({...form,seguradora:e.target.value})}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Cobertura</label><select value={form.cobertura} onChange={e=>setForm({...form,cobertura:e.target.value})} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}><option>Nacional</option><option>Regional</option><option>Municipal</option></select></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Acomodação</label><select value={form.acomodacao} onChange={e=>setForm({...form,acomodacao:e.target.value})} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}><option>Enfermaria</option><option>Apartamento</option></select></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Reajuste</label><Input value={form.reajuste} onChange={e=>setForm({...form,reajuste:e.target.value})} placeholder="ANS + X%"/></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#e6832a',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Criar'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default Produtos;
