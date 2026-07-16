import React, { useState, useEffect, useCallback } from 'react';
import { fetchContratosEmpresarial, createContratoEmpresarial, updateContratoEmpresarial, deleteContratoEmpresarial, fetchProdutos } from '../services/api';
import { Search, Filter, Plus, Eye, Handshake, Trash2, Edit, Save, X, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import Pagination from '../components/Pagination';
import { formatCNPJ, validateCNPJ } from '../lib/utils';

const PAGE_SIZE = 8;
const emptyForm = { numero:'', empresa:'', cnpj:'', seguradora:'', plano:'', vigencia:'', vencimento:'', vidas:0, status:'Ativo', valorMensal:'R$ 0,00' };

const Empresarial = ({ tabId }) => {
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
  const [planos, setPlanos] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const standardFaixas = [
    '0 a 18 anos',
    '19 a 23 anos',
    '24 a 28 anos',
    '29 a 33 anos',
    '34 a 38 anos',
    '39 a 43 anos',
    '44 a 48 anos',
    '49 a 53 anos',
    '54 a 58 anos',
    '59 anos ou mais'
  ];

  const createEmptyPlan = () => ({
    nome: '',
    isManual: false,
    pricingMode: 'custo_medio',
    valorMensal: 'R$ 0,00',
    faixasValues: {
      '0 a 18 anos': '',
      '19 a 23 anos': '',
      '24 a 28 anos': '',
      '29 a 33 anos': '',
      '34 a 38 anos': '',
      '39 a 43 anos': '',
      '44 a 48 anos': '',
      '49 a 53 anos': '',
      '54 a 58 anos': '',
      '59 anos ou mais': ''
    }
  });

  const [planosInput, setPlanosInput] = useState([createEmptyPlan()]);

  const isPme = tabId === 'pme';
  const displayLabel = isPme ? 'PME' : 'Empresarial';

  const loadData = useCallback(async () => {
    setLoading(true);
    try { 
      setData(await fetchContratosEmpresarial(searchTerm, filterStatus, displayLabel));
      const registeredPlanos = await fetchProdutos();
      setPlanos(registeredPlanos || []);
    } catch(e){console.error(e);}
    setLoading(false);
  }, [searchTerm, filterStatus, displayLabel]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!showNew) {
      setErrorMsg('');
      setPlanosInput([createEmptyPlan()]);
    }
  }, [showNew]);

  const handleCreate = async () => {
    if (!formData.cnpj?.trim()) {
      setErrorMsg('O preenchimento do CNPJ é obrigatório.');
      return;
    }
    if (!validateCNPJ(formData.cnpj)) {
      setErrorMsg('CNPJ inválido. Verifique o número digitado.');
      return;
    }
    setSaving(true);
    try { 
      const planoString = planosInput.map(p => p.nome).filter(Boolean).join(', ');
      
      let valorMensalString = '';
      if (planosInput.length === 1) {
        const p = planosInput[0];
        if (p.pricingMode === 'custo_medio') {
          valorMensalString = p.valorMensal || 'R$ 0,00';
        } else {
          valorMensalString = Object.entries(p.faixasValues)
            .filter(([_, val]) => val.trim())
            .map(([faixa, val]) => `${faixa}: R$ ${val}`)
            .join(' | ');
        }
      } else {
        const parts = planosInput.map(p => {
          if (!p.nome?.trim()) return null;
          if (p.pricingMode === 'custo_medio') {
            return `${p.nome}: ${p.valorMensal || 'R$ 0,00'}`;
          } else {
            const faixasStr = Object.entries(p.faixasValues)
              .filter(([_, val]) => val.trim())
              .map(([faixa, val]) => `${faixa}: R$ ${val}`)
              .join(', ');
            return `${p.nome} [Faixas]: ${faixasStr || 'Não definido'}`;
          }
        }).filter(Boolean);
        valorMensalString = parts.join(' | ');
      }

      await createContratoEmpresarial({
        ...formData, 
        plano: planoString,
        valorMensal: valorMensalString,
        vidas: parseInt(formData.vidas) || 0, 
        tipo: displayLabel
      }); 
      setShowNew(false); 
      setFormData(emptyForm); 
      setErrorMsg('');
      loadData(); 
    } catch(e){
      console.error(e);
      setErrorMsg('Erro ao salvar contrato.');
    }
    setSaving(false);
  };

  const handleSaveEdit = async (id) => {
    console.log('Tentando salvar edição para ID:', id, 'com dados:', editData);
    if (!editData.cnpj?.trim()) {
      alert('O preenchimento do CNPJ é obrigatório.');
      return;
    }
    if (!validateCNPJ(editData.cnpj)) {
      alert('CNPJ inválido. Verifique o número digitado.');
      return;
    }
    setSaving(true);
    try { 
      await updateContratoEmpresarial(id, {...editData, vidas:parseInt(editData.vidas)||0, tipo: editData.tipo || displayLabel}); 
      console.log('Edição salva com sucesso!');
      setEditingId(null); 
      loadData(); 
    } catch(e){
      console.error('Erro ao salvar edição:', e);
      alert('Erro ao salvar alterações. Verifique o console.');
    }
    setSaving(false);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ numero:item.numero, empresa:item.empresa, cnpj:item.cnpj, seguradora:item.seguradora, plano:item.plano || '', vigencia:item.vigencia, vencimento:item.vencimento, vidas:item.vidas, status:item.status, valorMensal:item.valorMensal, tipo: item.tipo || displayLabel });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir contrato?')) return;
    try { await deleteContratoEmpresarial(id); loadData(); } catch(e){console.error(e);}
  };

  const getStatusBadge = (s) => ({'Ativo':'badge-ativo','Cancelado':'badge-cancelado','Suspenso':'badge-suspenso','Vencido':'badge-vencido'}[s]||'badge-pendente');
  const totalPages = Math.ceil((data || []).length / PAGE_SIZE);
  const paged = (data || []).slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const inlineInput = (field, w) => {
    const handleChange = (e) => {
      let val = e.target.value;
      if (field === 'cnpj') {
        val = formatCNPJ(val);
      }
      setEditData({...editData, [field]: val});
    };
    return <Input value={editData[field]||''} onChange={handleChange} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px',minWidth:w||'60px'}} />;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#4979bb15', display:'flex', alignItems:'center', justifyContent:'center' }}><Handshake size={18} color="#4979bb" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Contratos {isPme ? 'PME' : 'Empresariais'}</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Categoria {isPme ? 'PME' : 'empresarial'} isolada</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#4979bb', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={14}/>Novo {isPme ? 'PME' : 'Empresarial'}</Button>
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
          <table className="data-table"><thead><tr><th>Número</th><th>Empresa</th><th>CNPJ</th><th>Seguradora</th><th>Plano</th><th>Vigência</th><th>Vencimento</th><th>Vidas</th><th>Valor</th><th>Status</th><th style={{width:'110px'}}>Ações</th></tr></thead>
            <tbody>{paged.map(c=>(<tr key={c.id}>{editingId===c.id ? (<>
              <td>{inlineInput('numero','75px')}</td><td>{inlineInput('empresa')}</td><td>{inlineInput('cnpj','100px')}</td><td>{inlineInput('seguradora')}</td>
              <td>
                {planos.length > 0 ? (
                  <select
                    value={editData.plano || ''}
                    onChange={e => setEditData({...editData, plano: e.target.value})}
                    style={{ fontSize: '0.75rem', padding: '4px 6px', border: '1px solid #d8e2ef', borderRadius: '4px', width: '100%', background: '#fff' }}
                  >
                    <option value="">Selecione...</option>
                    {planos.map(p => (
                      <option key={p.id} value={p.nome}>{p.nome}</option>
                    ))}
                  </select>
                ) : (
                  inlineInput('plano')
                )}
              </td>
              <td>{inlineInput('vigencia','75px')}</td><td>{inlineInput('vencimento','75px')}</td>
              <td><Input type="number" value={editData.vidas} onChange={e=>setEditData({...editData,vidas:e.target.value})} style={{fontSize:'0.78rem',padding:'4px 8px',height:'30px',width:'55px'}}/></td><td>{inlineInput('valorMensal','85px')}</td>
              <td><select value={editData.status} onChange={e=>setEditData({...editData,status:e.target.value})} style={{fontSize:'0.75rem',padding:'4px 6px',border:'1px solid #d8e2ef',borderRadius:'4px'}}><option>Ativo</option><option>Cancelado</option><option>Vencido</option></select></td>
              <td><div style={{display:'flex',gap:'4px'}}><button onClick={()=>handleSaveEdit(c.id)} style={{background:'none',border:'1px solid #27ae60',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#27ae60'}}><Save size={13}/></button><button onClick={()=>setEditingId(null)} style={{background:'none',border:'1px solid #e63757',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><X size={13}/></button></div></td>
            </>) : (<>
              <td style={{fontWeight:600,color:'#2C7BE5'}}>{c.numero}</td><td style={{fontWeight:500}}>{c.empresa}</td><td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{c.cnpj}</td><td>{c.seguradora}</td><td>{c.plano || '-'}</td><td>{c.vigencia}</td><td>{c.vencimento}</td><td style={{fontWeight:600}}>{c.vidas}</td><td style={{fontWeight:500}}>{c.valorMensal}</td>
              <td><span className={getStatusBadge(c.status)}>{c.status}</span></td><td><div style={{display:'flex',gap:'4px'}}><button onClick={()=>{setSelectedContrato(c);setShowDetail(true);}} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#2C7BE5'}}><Eye size={13}/></button><button onClick={()=>startEdit(c)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e6832a'}}><Edit size={13}/></button><button onClick={()=>handleDelete(c.id)} style={{background:'none',border:'1px solid #d8e2ef',borderRadius:'4px',padding:'4px 6px',cursor:'pointer',color:'#e63757'}}><Trash2 size={13}/></button></div></td>
            </>)}</tr>))}</tbody></table>
        )}
        {!loading && data.length===0 && <div style={{padding:'40px',textAlign:'center',color:'#8a8d93'}}>Nenhum contrato encontrado.</div>}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={data.length} pageSize={PAGE_SIZE} />

      <Dialog open={showDetail} onOpenChange={setShowDetail}><DialogContent style={{maxWidth:'650px'}}><DialogHeader><DialogTitle>Detalhes do Contrato {isPme ? 'PME' : 'Empresarial'}</DialogTitle></DialogHeader>
        {selectedContrato && (<div style={{padding:'8px 0'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>{[['Número',selectedContrato.numero,'#2C7BE5'],['Status',null],['Empresa',selectedContrato.empresa],['CNPJ',selectedContrato.cnpj],['Seguradora',selectedContrato.seguradora],['Plano',selectedContrato.plano || '-'],['Vigência',selectedContrato.vigencia],['Vencimento',selectedContrato.vencimento],['Vidas',selectedContrato.vidas],['Valor Mensal',selectedContrato.valorMensal,'#27ae60']].map(([lbl,val,clr],i)=><div key={i}><label style={{fontSize:'0.68rem',color:'#8a8d93',textTransform:'uppercase',fontWeight:600}}>{lbl}</label>{lbl==='Status'?<p style={{margin:'2px 0'}}><span className={getStatusBadge(selectedContrato.status)}>{selectedContrato.status}</span></p>:<p style={{fontSize:'0.85rem',fontWeight:600,color:clr||'#344050',margin:'2px 0'}}>{val}</p>}</div>)}</div></div>)}
      </DialogContent></Dialog>

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'600px'}}><DialogHeader><DialogTitle>Novo Contrato {isPme ? 'PME' : 'Empresarial'}</DialogTitle></DialogHeader>
        {errorMsg && <div style={{ padding: '8px 12px', background: '#ffe2e2', color: '#991b1b', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>⚠️ {errorMsg}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Número</label><Input value={formData.numero} onChange={e=>setFormData({...formData,numero:e.target.value})} placeholder={isPme ? "PME-2024-XXX" : "EMP-2024-XXX"}/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Empresa</label><Input value={formData.empresa} onChange={e=>setFormData({...formData,empresa:e.target.value})}/></div></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CNPJ</label><Input value={formData.cnpj} onChange={e=>{ setErrorMsg(''); setFormData({...formData,cnpj:formatCNPJ(e.target.value)}); }} placeholder="00.000.000/0000-00"/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Seguradora</label><Input value={formData.seguradora} onChange={e=>setFormData({...formData,seguradora:e.target.value})}/></div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
            {planosInput.map((plObj, idx) => (
              <div 
                key={idx} 
                style={{ 
                  background: '#f8f9fa', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  position: 'relative' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#495057', textTransform: 'uppercase' }}>
                    Plano #{idx + 1}
                  </span>
                  {idx > 0 && (
                    <Button 
                      type="button" 
                      onClick={() => {
                        const newList = planosInput.filter((_, i) => i !== idx);
                        setPlanosInput(newList);
                      }} 
                      variant="outline" 
                      style={{ padding: '4px 8px', color: '#e63757', border: '1px solid #e63757', fontSize: '0.72rem', height: '24px' }}
                    >
                      Remover Plano
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', color: '#8a8d93', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Nome do Plano</label>
                    {planos.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <select 
                          value={plObj.isManual ? "__manual__" : plObj.nome} 
                          onChange={e => {
                            const val = e.target.value;
                            const newList = [...planosInput];
                            if (val === '__manual__') {
                              newList[idx] = { ...newList[idx], isManual: true, nome: '' };
                            } else {
                              newList[idx] = { ...newList[idx], isManual: false, nome: val };
                            }
                            setPlanosInput(newList);
                          }}
                          style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '8px 12px', fontSize: '0.85rem', background: '#fff' }}
                        >
                          <option value="">Selecione um plano...</option>
                          <option value="__manual__" style={{ fontWeight: 'bold', color: '#2C7BE5' }}>+ Digitar manualmente (Novo Plano)...</option>
                          {planos.map(p => (
                            <option key={p.id} value={p.nome}>{p.nome} ({p.seguradora})</option>
                          ))}
                        </select>
                        {(plObj.isManual || !planos.some(p => p.nome === plObj.nome)) && (
                          <Input 
                            value={plObj.nome} 
                            onChange={e => {
                              const newList = [...planosInput];
                              newList[idx] = { ...newList[idx], nome: e.target.value, isManual: true };
                              setPlanosInput(newList);
                            }} 
                            placeholder="Digite o nome do plano" 
                          />
                        )}
                      </div>
                    ) : (
                      <Input 
                        value={plObj.nome} 
                        onChange={e => {
                          const newList = [...planosInput];
                          newList[idx] = { ...newList[idx], nome: e.target.value, isManual: true };
                          setPlanosInput(newList);
                        }} 
                        placeholder="Digite o nome do plano" 
                      />
                    )}
                  </div>
                  {idx === 0 && (
                    <div style={{ alignSelf: 'flex-end' }}>
                      <Button 
                        type="button" 
                        onClick={() => setPlanosInput([...planosInput, createEmptyPlan()])} 
                        style={{ padding: '0 12px', background: '#4979bb', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', height: '38px' }}
                      >
                        +
                      </Button>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#8a8d93', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Valor Mensal para este Plano</label>
                  <div style={{ display: 'flex', gap: '16px', margin: '4px 0 8px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: '#495057' }}>
                      <input 
                        type="radio" 
                        name={`pricingMode-${idx}`} 
                        value="custo_medio" 
                        checked={plObj.pricingMode === 'custo_medio'} 
                        onChange={() => {
                          const newList = [...planosInput];
                          newList[idx] = { ...newList[idx], pricingMode: 'custo_medio' };
                          setPlanosInput(newList);
                        }} 
                      />
                      Custo Médio Único
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer', color: '#495057' }}>
                      <input 
                        type="radio" 
                        name={`pricingMode-${idx}`} 
                        aria-label="Por Faixa Etária"
                        value="faixa_etaria" 
                        checked={plObj.pricingMode === 'faixa_etaria'} 
                        onChange={() => {
                          const newList = [...planosInput];
                          newList[idx] = { ...newList[idx], pricingMode: 'faixa_etaria' };
                          setPlanosInput(newList);
                        }} 
                      />
                      Por Faixa Etária
                    </label>
                  </div>

                  {plObj.pricingMode === 'custo_medio' ? (
                    <Input 
                      value={plObj.valorMensal} 
                      onChange={e => {
                        const newList = [...planosInput];
                        newList[idx] = { ...newList[idx], valorMensal: e.target.value };
                        setPlanosInput(newList);
                      }} 
                      placeholder="R$ 0,00" 
                      style={{ height: '34px', fontSize: '0.8rem' }}
                    />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '8px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      {standardFaixas.map(faixa => (
                        <div key={faixa} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#495057', fontWeight: 600 }}>{faixa}</span>
                          <Input 
                            value={plObj.faixasValues[faixa] || ''} 
                            onChange={e => {
                              const newList = [...planosInput];
                              const newFaixas = { ...newList[idx].faixasValues, [faixa]: e.target.value };
                              newList[idx] = { ...newList[idx], faixasValues: newFaixas };
                              setPlanosInput(newList);
                            }} 
                            placeholder="R$ 0,00" 
                            style={{ height: '30px', fontSize: '0.75rem', padding: '4px 8px' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vigência</label><Input value={formData.vigencia} onChange={e=>setFormData({...formData,vigencia:e.target.value})} placeholder="01/01/2024"/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vencimento</label><Input value={formData.vencimento} onChange={e=>setFormData({...formData,vencimento:e.target.value})} placeholder="01/01/2025"/></div><div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Vidas</label><Input type="number" value={formData.vidas} onChange={e=>setFormData({...formData,vidas:e.target.value})}/></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#4979bb',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Criar'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default Empresarial;
