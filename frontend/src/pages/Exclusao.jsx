import React, { useState, useEffect, useCallback } from 'react';
import { fetchExclusoes, createExclusao, updateExclusao } from '../services/api';
import { UserMinus, Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { formatCPF, validateCPF } from '../lib/utils';

const initialFormData = { contrato:'', beneficiario:'', cpf:'', dataFim:'', motivo:'Solicitação do titular' };

const Exclusao = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState(null);

  // Confirmar Efetivação
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchExclusoes(search)); } catch(e){console.error(e);}
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!showNew) {
      setErrorMsg('');
    }
  }, [showNew]);

  const handleCreate = async () => {
    if (!formData.cpf?.trim()) {
      setErrorMsg('O preenchimento do CPF é obrigatório.');
      return;
    }
    if (!validateCPF(formData.cpf)) {
      setErrorMsg('CPF inválido. Verifique o número digitado.');
      return;
    }
    setSaving(true);
    try {
      await createExclusao(formData);
      setShowNew(false);
      setFormData(initialFormData);
      setErrorMsg('');
      loadData();
    } catch(e){
      console.error(e);
      setErrorMsg('Erro ao salvar exclusão.');
    }
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
      await updateExclusao(selectedItem.id, {
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
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#e6375715', display:'flex', alignItems:'center', justifyContent:'center' }}><UserMinus size={18} color="#e63757" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Exclusão de Beneficiários</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Gerencie solicitações de exclusão</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#e63757', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><UserMinus size={14}/>Nova Exclusão</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#bf0000'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'auto', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#e63757',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Protocolo</th><th>Contrato</th><th>Beneficiário</th><th>CPF</th><th>Data Fim</th><th>Motivo</th><th>Solicitação</th><th>Status</th><th style={{ textAlign: 'center' }}>Ações</th></tr></thead>
            <tbody>{data.map((item,i)=>(<tr key={i}>
              <td style={{fontWeight:600,color:'#e63757'}}>
                <button
                  type="button"
                  onClick={() => setSelectedProtocol(item)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#e63757',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textAlign: 'left'
                  }}
                >
                  {item.protocolo}
                </button>
              </td>
              <td style={{color:'#2C7BE5',fontWeight:500}}>{item.contrato}</td>
              <td style={{fontWeight:500}}>{item.beneficiario}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.cpf}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.dataFim || '-'}</td>
              <td>{item.motivo}</td><td>{item.dataSolicitacao}</td>
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

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'500px'}}><DialogHeader><DialogTitle>Nova Exclusão</DialogTitle></DialogHeader>
        {errorMsg && <div style={{ padding: '8px 12px', background: '#ffe2e2', color: '#991b1b', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ {errorMsg}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:'12px',padding:'8px 0'}}>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Contrato</label><Input value={formData.contrato} onChange={e=>{ setErrorMsg(''); setFormData({...formData,contrato:e.target.value}); }}/></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Beneficiário</label><Input value={formData.beneficiario} onChange={e=>{ setErrorMsg(''); setFormData({...formData,beneficiario:e.target.value}); }}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CPF</label><Input value={formData.cpf} onChange={e=>{ setErrorMsg(''); setFormData({...formData,cpf:formatCPF(e.target.value)}); }}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Data Fim</label><Input type="date" value={formData.dataFim} onChange={e=>setFormData({...formData,dataFim:e.target.value})}/></div>
          </div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Motivo</label>
            <select value={formData.motivo} onChange={e=>setFormData({...formData,motivo:e.target.value})} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}>
              <option>Solicitação do titular</option><option>Desligamento</option><option>Portabilidade</option><option>Óbito</option>
            </select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#e63757',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Solicitar Exclusão'}</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Dialog de Confirmação para Efetivar */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader>
            <DialogTitle>⚠️ Confirmar Efetivação</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0', fontSize: '0.9rem', color: '#344050' }}>
            Tem certeza de que deseja efetivar a exclusão do beneficiário <strong>{selectedItem?.beneficiario}</strong>?
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

      {/* Dialog Detalhes do Protocolo */}
      <Dialog open={!!selectedProtocol} onOpenChange={(open) => !open && setSelectedProtocol(null)}>
        <DialogContent style={{ maxWidth: '600px' }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a52', fontSize: '1.25rem' }}>
              📄 Detalhes da Solicitação ({selectedProtocol?.protocolo})
            </DialogTitle>
          </DialogHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '12px 0', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Protocolo</span>
              <span style={{ fontWeight: 700, color: '#1a3a52', fontSize: '0.95rem' }}>{selectedProtocol?.protocolo}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</span>
              <span>
                <span className={selectedProtocol ? getStatusBadge(selectedProtocol.status) : ''} style={{ display: 'inline-block' }}>
                  {selectedProtocol?.status}
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Tipo</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>Exclusão de Beneficiário</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Data de Solicitação</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.dataSolicitacao}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Beneficiário</span>
              <span style={{ fontWeight: 600, color: '#1a3a52' }}>{selectedProtocol?.beneficiario}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>CPF</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.cpf}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Data de Fim (Vigência)</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.dataFim || '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Motivo da Exclusão</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.motivo || '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Contrato Relacionado</span>
              <span style={{ fontWeight: 600, color: '#2C7BE5' }}>{selectedProtocol?.contrato || '-'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedProtocol(null)} style={{ background: '#1a3a52', color: '#fff', width: '100%' }}>
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exclusao;
