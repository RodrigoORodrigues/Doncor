import React, { useState, useEffect, useCallback } from 'react';
import { fetchTransferencias, createTransferencia, updateTransferencia } from '../services/api';
import { ArrowLeftRight, Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

const Transferencia = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState({ contratoOrigem:'', contratoDestino:'', beneficiario:'', cpf:'' });
  const [saving, setSaving] = useState(false);

  // Confirmar Efetivação
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchTransferencias(search)); } catch(e){console.error(e);}
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try { await createTransferencia(formData); setShowNew(false); loadData(); } catch(e){console.error(e);}
    setSaving(false);
  };

  const handleConfirmEfetivar = (item) => {
    setSelectedItem(item);
    setShowConfirm(true);
  };

  const handleEfetivar = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await updateTransferencia(selectedItem.id, {
        ...selectedItem,
        status: 'Concluído'
      });
      setShowConfirm(false);
      setSelectedItem(null);
      loadData();
    } catch (e) {
      console.error("Erro ao efetivar:", e);
    }
    setActionLoading(false);
  };

  const getStatusBadge = (s) => ({'Aprovado':'badge-aprovado','Efetivado':'badge-aprovado','Concluído':'badge-aprovado','Pendente':'badge-pendente','Em Análise':'badge-analise'}[s]||'badge-pendente');

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#8e44ad15', display:'flex', alignItems:'center', justifyContent:'center' }}><ArrowLeftRight size={18} color="#8e44ad" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Transferências</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Gerencie transferências entre contratos</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#8e44ad', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><ArrowLeftRight size={14}/>Nova Transferência</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#7c4ec3'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#8e44ad',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Protocolo</th><th>Contrato Origem</th><th>Contrato Destino</th><th>Beneficiário</th><th>CPF</th><th>Solicitação</th><th>Status</th><th style={{ textAlign: 'center' }}>Ações</th></tr></thead>
            <tbody>{data.map((item,i)=>(<tr key={i}>
              <td style={{fontWeight:600,color:'#8e44ad'}}>{item.protocolo}</td>
              <td style={{color:'#e63757',fontWeight:500}}>{item.contratoOrigem}</td>
              <td style={{color:'#27ae60',fontWeight:500}}>{item.contratoDestino}</td>
              <td style={{fontWeight:500}}>{item.beneficiario}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.cpf}</td><td>{item.dataSolicitacao}</td>
              <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
              <td style={{ textAlign: 'center' }}>
                {item.status !== 'Concluído' && item.status !== 'Aprovado' ? (
                  <Button 
                    onClick={() => handleConfirmEfetivar(item)} 
                    style={{ background: '#27ae60', color: '#fff', fontSize: '0.72rem', padding: '4px 8px', height: 'auto', fontWeight: 600 }}
                  >
                    ✅ Efetivar
                  </Button>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#27ae60', fontWeight: 600 }}>Concluído</span>
                )}
              </td>
            </tr>))}</tbody>
          </table>
        )}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',fontSize:'0.72rem',color:'#8a8d93'}}><span>Exibindo {data.length} registros</span></div>

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'500px'}}><DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
        <div style={{display:'flex',flexDirection:'column',gap:'12px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Contrato Origem</label><Input value={formData.contratoOrigem} onChange={e=>setFormData({...formData,contratoOrigem:e.target.value})}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Contrato Destino</label><Input value={formData.contratoDestino} onChange={e=>setFormData({...formData,contratoDestino:e.target.value})}/></div>
          </div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Beneficiário</label><Input value={formData.beneficiario} onChange={e=>setFormData({...formData,beneficiario:e.target.value})}/></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CPF</label><Input value={formData.cpf} onChange={e=>setFormData({...formData,cpf:e.target.value})}/></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#8e44ad',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Solicitar Transferência'}</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Dialog de Confirmação para Efetivar */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader>
            <DialogTitle>⚠️ Confirmar Efetivação</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0', fontSize: '0.9rem', color: '#344050' }}>
            Tem certeza de que deseja efetivar a transferência do beneficiário <strong>{selectedItem?.beneficiario}</strong>?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button 
              style={{ background: '#27ae60', color: '#fff', fontWeight: 'bold' }} 
              onClick={handleEfetivar} 
              disabled={actionLoading}
            >
              {actionLoading ? 'Processando...' : 'Confirmar Efetivação ✅'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transferencia;
