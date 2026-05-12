import React, { useState, useEffect, useCallback } from 'react';
import { fetchExclusoes, createExclusao } from '../services/api';
import { UserMinus, Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const Exclusao = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({ contrato:'', beneficiario:'', cpf:'', motivo:'Solicitação do titular' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchExclusoes(search)); } catch(e){console.error(e);}
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createExclusao(formData); setShowNew(false); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const getStatusBadge = (s) => ({'Aprovado':'badge-aprovado','Pendente':'badge-pendente','Em Análise':'badge-analise'}[s]||'badge-pendente');

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#e6375715', display:'flex', alignItems:'center', justifyContent:'center' }}><UserMinus size={18} color="#e63757" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Exclusão de Beneficiários</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Gerencie solicitações de exclusão</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#e63757', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><UserMinus size={14}/>Nova Exclusão</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#bf0000'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#e63757',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Protocolo</th><th>Contrato</th><th>Beneficiário</th><th>CPF</th><th>Motivo</th><th>Solicitação</th><th>Status</th></tr></thead>
            <tbody>{data.map((item,i)=>(<tr key={i}>
              <td style={{fontWeight:600,color:'#e63757'}}>{item.protocolo}</td>
              <td style={{color:'#2C7BE5',fontWeight:500}}>{item.contrato}</td>
              <td style={{fontWeight:500}}>{item.beneficiario}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.cpf}</td><td>{item.motivo}</td><td>{item.dataSolicitacao}</td>
              <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
            </tr>))}</tbody>
          </table>
        )}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',fontSize:'0.72rem',color:'#8a8d93'}}><span>Exibindo {data.length} registros</span></div>

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'500px'}}><DialogHeader><DialogTitle>Nova Exclusão</DialogTitle></DialogHeader>
        <div style={{display:'flex',flexDirection:'column',gap:'12px',padding:'8px 0'}}>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Contrato</label><Input value={formData.contrato} onChange={e=>setFormData({...formData,contrato:e.target.value})}/></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Beneficiário</label><Input value={formData.beneficiario} onChange={e=>setFormData({...formData,beneficiario:e.target.value})}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CPF</label><Input value={formData.cpf} onChange={e=>setFormData({...formData,cpf:e.target.value})}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Motivo</label>
              <select value={formData.motivo} onChange={e=>setFormData({...formData,motivo:e.target.value})} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}>
                <option>Solicitação do titular</option><option>Desligamento</option><option>Portabilidade</option><option>Óbito</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#e63757',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Solicitar Exclusão'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default Exclusao;
