import React, { useState, useEffect, useCallback } from 'react';
import { fetchContratosEmpresarial, createContratoEmpresarial, updateContratoEmpresarial, deleteContratoEmpresarial } from '../services/api';
import { Search, Filter, Plus, Eye, Handshake, Trash2, Edit, Save, X, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 8;
const emptyForm = { numero:'', empresa:'', cnpj:'', seguradora:'', produto:'', plano:'', vigencia:'', vencimento:'', vidas:0, status:'Ativo', valorMensal:'R$ 0,00' };

const Empresarial = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [page, setPage] = useState(1);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchContratosEmpresarial(searchTerm, filterStatus)); } catch(e){console.error(e);}
    setLoading(false);
  }, [searchTerm, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createContratoEmpresarial({...formData, vidas:parseInt(formData.vidas)||0}); setShowNew(false); setFormData(emptyForm); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try { await updateContratoEmpresarial(id, {...editData, vidas:parseInt(editData.vidas)||0}); setEditingId(null); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ numero:item.numero, empresa:item.empresa, cnpj:item.cnpj, seguradora:item.seguradora, produto:item.produto, plano:item.plano || '', vigencia:item.vigencia, vencimento:item.vencimento, vidas:item.vidas, status:item.status, valorMensal:item.valorMensal });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir contrato?')) return;
    try { await deleteContratoEmpresarial(id); loadData(); } catch(e){console.error(e);}
  };

  const getStatusBadge = (s) => ({'Ativo':'badge-ativo','Cancelado':'badge-cancelado','Suspenso':'badge-suspenso','Vencido':'badge-vencido'}[s]||'badge-pendente');
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const inlineInput = (field, w) => <Input value={editData[field]||''} onChange={e=>setEditData({...editData,[field]:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px',minWidth:w||'60px'}} />;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#4979bb15', display:'flex', alignItems:'center', justifyContent:'center' }}><Handshake size={18} color="#4979bb" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Contratos Empresariais</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Categoria empresarial isolada</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#4979bb', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Novo Empresarial</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <div style={{ flex:1, position:'relative' }}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar empresa, CNPJ, seguradora..." value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);setPage(1);}} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
          <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} style={{border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.8rem',color:'#344050',background:'#fff',cursor:'pointer'}}><option value="todos">Todos</option><option value="ativo">Ativo</option><option value="vencido">Vencido</option><option value="cancelado">Cancelado</option></select>
        </div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#4979bb',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Número</th><th>Empresa</th><th>CNPJ</th><th>Seguradora</th><th>Produto</th><th>Plano</th><th>Vigência</th><th>Vencimento</th><th>Vidas</th><th>Valor</th><th>Status</th><th style={{width:'110px'}}>Ações</th></tr></thead>
            <tbody>{paged.map(c=>(<tr key={c.id}>{editingId===c.id ? (<>
              <td>{inlineInput('numero','75px')}</td><td>{inlineInput('empresa')}</td><td>{inlineInput('cnpj','100px')}</td><td>{inlineInput('seguradora')}</td><td>{inlineInput('produto')}</td><td>{inlineInput('plano')}</td><td>{inlineInput('vigencia','75px')}</td><td>{inlineInput('vencimento','75px')}</td>
              <td><Input type="number" value={editData.vidas} onChange={e=>setEditData({...editData,vidas:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px',width:'55px'}}/></td><td>{inlineInput('valorMensal','85px')}</td>
              <td><select value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} style={{fontSize:'0.75rem',padding:'4px 6px',border:'1px solid #d8e2ef',borderRadius:'4px'}}><option>Ativo</option><option>Cancelado</option><option>Vencido</option></select></td>
              <td><div style={{display:'flex',gap:'4px'}}><button onClick={()=>handleSaveEdit(c.id)} style={{background:'none',border:'1px solid #27ae60',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#27ae60'}}><Save size={13}/></button><button onClick={()=>setEditingId(null)} style={{background:'none',border:'1px solid #e63757',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><X size={13}/></button></div></td>
            </>) : (<>
              <td style={{fontWeight:600,color:'#2C7BE5'}}>{c.numero}</td><td style={{fontWeight:500}}>{c.empresa}</td><td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{c.cnpj}</td><td>{c.seguradora}</td><td>{c.produto}</td><td>{c.plano || '-'}</td><td>{c.vigencia}</td><td>{c.vencimento}</td><td style={{fontWeight:600}}>{c.vidas}</td><td style={{fontWeight:500}}>{c.valorMensal}</td>
              <td><span className={getStatusBadge(c.status)}>{c.status}</span></td><td><div style={{display:'flex',gap:'4px'}}><button onClick={()=>{setSelectedContrato(c);setShowDetail(true);}} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#2C7BE5'}}><Eye size={13}/></button><button onClick={()=>startEdit(c)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e6832a'}}><Edit size={13}/></button><button onClick={()=>handleDelete(c.id)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><Trash2 size={13}/></button></div></td>
            </>)}</tr>))}</tbody></table>
        )}
        {!loading && data.length===0 && <div style={{padding:'40px',textAlign:'center',color:'#8a8d93'}}>Nenhum contrato encontrado.</div>}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.length} pageSize={PAGE_SIZE} />

      <Dialog open={showDetail} onOpenChange={setShowDetail}><DialogContent style={{maxWidth:'650px'}}><DialogHeader><DialogTitle>Detalhes do Contrato Empresarial</DialogTitle></DialogHeader>
        {selectedContrato && (<div style={{padding:'8px 0'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>{[['Número',selectedContrato.numero,'#2C7BE5'],['Status',null],['Empresa',selectedContrato.empresa],['CNPJ',selectedContrato.cnpj],['Seguradora',selectedContrato.seguradora],['Produto',selectedContrato.produto],['Plano',selectedContrato.plano || '-'],['Vigência',selectedContrato.vigencia],['Vencimento',selectedContrato.vencimento],['Vidas',selectedContrato.vidas],['Valor Mensal',selectedContrato.valorMensal,'#27ae60']].map(([lbl,val,clr],i)=><div key={i}><label style={{fontSize:'0.68rem',color:'#8a8d93',textTransform:'uppercase',fontWeight:600}}>{lbl}</label>{lbl==='Status'?<p style={{margin:'2px 0'}}><span className={getStatusBadge(selectedContrato.status)}>{selectedContrato.status}</span></p>:<p style={{fontSize:'0.85rem',fontWeight:600,color:clr||'#344050',margin:'2px 0'}}>{val}</p>}</div>)}</div></div>)}
      </DialogContent></Dialog>

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'600px'}}><DialogHeader><DialogTitle>Novo Contrato Empresarial</DialogTitle></DialogHeader>
        <div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Número</label><Input value={formData.numero} onChange={e=>setFormData({...formData,numero:e.target.value})} placeholder="EMP-2024-XXX"/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Empresa</label><Input value={formData.empresa} onChange={e=>setFormData({...formData,empresa:e.target.value})}/></div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CNPJ</label><Input value={formData.cnpj} onChange={e=>setFormData({...formData,cnpj:e.target.value})} placeholder="00.000.000/0000-00"/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Seguradora</label><Input value={formData.seguradora} onChange={e=>setFormData({...formData,seguradora:e.target.value})}/></div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Produto</label><Input value={formData.produto} onChange={e=>setFormData({...formData,produto:e.target.value})}/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Plano</label><Input value={formData.plano} onChange={e=>setFormData({...formData,plano:e.target.value})}/></div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vigência</label><Input value={formData.vigencia} onChange={e=>setFormData({...formData,vigencia:e.target.value})} placeholder="01/01/2024"/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vencimento</label><Input value={formData.vencimento} onChange={e=>setFormData({...formData,vencimento:e.target.value})} placeholder="01/01/2025"/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vidas</label><Input type="number" value={formData.vidas} onChange={e=>setFormData({...formData,vidas:e.target.value})}/></div></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Valor Mensal</label><Input value={formData.valorMensal} onChange={e=>setFormData({...formData,valorMensal:e.target.value})} placeholder="R$ 0,00"/></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#4979bb',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Criar'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default Empresarial;
