import React, { useState, useEffect, useCallback } from 'react';
import { fetchContratosAdesao, createContratoAdesao, updateContratoAdesao, deleteContratoAdesao } from '../services/api';
import { Search, Filter, Plus, Eye, FileText, Trash2, Edit, Save, X, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 8;

const Adesao = () => {
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
  const [formData, setFormData] = useState({ numero:'', seguradora:'', produto:'', administradora:'', vigencia:'', vidas:0, status:'Ativo', valorMensal:'R$ 0,00' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchContratosAdesao(searchTerm, filterStatus)); } catch(e){console.error(e);}
    setLoading(false);
  }, [searchTerm, filterStatus]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createContratoAdesao({...formData, vidas: parseInt(formData.vidas)||0}); setShowNew(false); setFormData({ numero:'', seguradora:'', produto:'', administradora:'', vigencia:'', vidas:0, status:'Ativo', valorMensal:'R$ 0,00' }); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try { await updateContratoAdesao(id, {...editData, vidas: parseInt(editData.vidas)||0}); setEditingId(null); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ numero:item.numero, seguradora:item.seguradora, produto:item.produto, administradora:item.administradora, vigencia:item.vigencia, vidas:item.vidas, status:item.status, valorMensal:item.valorMensal });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir contrato?')) return;
    try { await deleteContratoAdesao(id); loadData(); } catch(e){console.error(e);}
  };

  const getStatusBadge = (s) => ({'Ativo':'badge-ativo','Cancelado':'badge-cancelado','Suspenso':'badge-suspenso'}[s]||'badge-pendente');
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const inlineInput = (field, w) => <Input value={editData[field]||''} onChange={e=>setEditData({...editData,[field]:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px',minWidth:w||'60px'}} />;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#4979bb15', display:'flex', alignItems:'center', justifyContent:'center' }}><FileText size={18} color="#4979bb" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Contratos por Adesão</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Gerencie seus contratos de adesão</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#4979bb', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Novo Contrato</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (
        <div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
            <div style={{ flex:1, position:'relative' }}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar por número, seguradora, produto..." value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);setPage(1);}} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
            <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}} style={{border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.8rem',color:'#344050',background:'#fff',cursor:'pointer'}}>
              <option value="todos">Todos os Status</option><option value="ativo">Ativo</option><option value="cancelado">Cancelado</option><option value="suspenso">Suspenso</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#4979bb',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Número</th><th>Seguradora</th><th>Produto</th><th>Administradora</th><th>Vigência</th><th>Vidas</th><th>Valor Mensal</th><th>Status</th><th style={{width:'110px'}}>Ações</th></tr></thead>
            <tbody>{paged.map(c => (
              <tr key={c.id}>
                {editingId===c.id ? (<>
                  <td>{inlineInput('numero','80px')}</td><td>{inlineInput('seguradora')}</td><td>{inlineInput('produto')}</td><td>{inlineInput('administradora')}</td><td>{inlineInput('vigencia','80px')}</td>
                  <td><Input type="number" value={editData.vidas} onChange={e=>setEditData({...editData,vidas:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px',width:'60px'}}/></td>
                  <td>{inlineInput('valorMensal','90px')}</td>
                  <td><select value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} style={{fontSize:'0.75rem',padding:'4px 6px',border:'1px solid #d8e2ef',borderRadius:'4px'}}><option>Ativo</option><option>Cancelado</option><option>Suspenso</option></select></td>
                  <td><div style={{display:'flex',gap:'4px'}}>
                    <button onClick={()=>handleSaveEdit(c.id)} style={{background:'none',border:'1px solid #27ae60',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#27ae60'}} title="Salvar"><Save size={13}/></button>
                    <button onClick={()=>setEditingId(null)} style={{background:'none',border:'1px solid #e63757',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}} title="Cancelar"><X size={13}/></button>
                  </div></td>
                </>) : (<>
                  <td style={{fontWeight:600,color:'#2C7BE5'}}>{c.numero}</td><td>{c.seguradora}</td><td>{c.produto}</td><td>{c.administradora}</td><td>{c.vigencia}</td><td style={{fontWeight:600}}>{c.vidas}</td><td style={{fontWeight:500}}>{c.valorMensal}</td>
                  <td><span className={getStatusBadge(c.status)}>{c.status}</span></td>
                  <td><div style={{display:'flex',gap:'4px'}}>
                    <button onClick={()=>{setSelectedContrato(c);setShowDetail(true);}} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#2C7BE5'}} title="Visualizar"><Eye size={13}/></button>
                    <button onClick={()=>startEdit(c)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e6832a'}} title="Editar"><Edit size={13}/></button>
                    <button onClick={()=>handleDelete(c.id)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}} title="Excluir"><Trash2 size={13}/></button>
                  </div></td>
                </>)}
              </tr>
            ))}</tbody>
          </table>
        )}
        {!loading && data.length===0 && <div style={{padding:'40px',textAlign:'center',color:'#8a8d93',fontSize:'0.85rem'}}>Nenhum contrato encontrado.</div>}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.length} pageSize={PAGE_SIZE} />

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent style={{maxWidth:'600px'}}><DialogHeader><DialogTitle>Detalhes do Contrato</DialogTitle></DialogHeader>
          {selectedContrato && (<div style={{padding:'8px 0'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {[['Número',selectedContrato.numero,'#2C7BE5'],['Status',null],['Seguradora',selectedContrato.seguradora],['Produto',selectedContrato.produto],['Administradora',selectedContrato.administradora],['Vigência',selectedContrato.vigencia],['Vidas',selectedContrato.vidas],['Valor Mensal',selectedContrato.valorMensal,'#27ae60']].map(([lbl,val,clr],i)=>(
              <div key={i}><label style={{fontSize:'0.68rem',color:'#8a8d93',textTransform:'uppercase',fontWeight:600}}>{lbl}</label>
                {lbl==='Status'?<p style={{margin:'2px 0'}}><span className={getStatusBadge(selectedContrato.status)}>{selectedContrato.status}</span></p>:
                <p style={{fontSize:'0.85rem',fontWeight:600,color:clr||'#344050',margin:'2px 0'}}>{val}</p>}
              </div>
            ))}
          </div></div>)}
        </DialogContent>
      </Dialog>

      {/* New Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent style={{maxWidth:'550px'}}><DialogHeader><DialogTitle>Novo Contrato Adesão</DialogTitle></DialogHeader>
          <div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'8px 0'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Número</label><Input value={formData.numero} onChange={e=>setFormData({...formData,numero:e.target.value})} placeholder="ADH-2024-XXX"/></div>
              <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Seguradora</label><Input value={formData.seguradora} onChange={e=>setFormData({...formData,seguradora:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Produto</label><Input value={formData.produto} onChange={e=>setFormData({...formData,produto:e.target.value})}/></div>
              <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Administradora</label><Input value={formData.administradora} onChange={e=>setFormData({...formData,administradora:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
              <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vigência</label><Input value={formData.vigencia} onChange={e=>setFormData({...formData,vigencia:e.target.value})} placeholder="01/01/2024"/></div>
              <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vidas</label><Input type="number" value={formData.vidas} onChange={e=>setFormData({...formData,vidas:e.target.value})}/></div>
              <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Valor Mensal</label><Input value={formData.valorMensal} onChange={e=>setFormData({...formData,valorMensal:e.target.value})} placeholder="R$ 0,00"/></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#4979bb',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Criar Contrato'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Adesao;
