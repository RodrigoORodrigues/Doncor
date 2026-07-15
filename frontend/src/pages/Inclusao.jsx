import React, { useState, useEffect, useCallback } from 'react';
import { fetchInclusoes, createInclusao, updateInclusao, fetchContratosEmpresarial, fetchContratosAdesao, fetchProdutos } from '../services/api';
import { UserPlus, Search, Filter, Loader2, Eye, Download, Paperclip, Pencil, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { formatCPF, formatPhone, validateCPF } from '../lib/utils';

const initialFormData = {
  contrato: '',
  empresa: '',
  beneficiario: '',
  nomeMae: '',
  cpf: '',
  dataNascimento: '',
  telefone: '',
  email: '',
  parentesco: 'Titular',
  genero: '',
  estadoCivil: '',
  plano: '',
  valorMensal: 'R$ 0,00',
};

const Inclusao = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [previewAtt, setPreviewAtt] = useState(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const handleEditSave = async () => {
    if (!editFormData.beneficiario?.trim()) {
      setEditErrorMsg('O preenchimento do Beneficiário é obrigatório.');
      return;
    }
    if (!editFormData.cpf?.trim()) {
      setEditErrorMsg('O preenchimento do CPF é obrigatório.');
      return;
    }
    if (!validateCPF(editFormData.cpf)) {
      setEditErrorMsg('CPF inválido. Verifique o número digitado.');
      return;
    }
    setEditSaving(true);
    setEditErrorMsg('');
    try {
      const updated = await updateInclusao(editFormData.id, editFormData);
      setData(prev => prev.map(item => item.id === editFormData.id ? updated : item));
      setSelectedProtocol(updated);
      setIsEditing(false);
      setEditFormData(null);
    } catch (e) {
      console.error(e);
      setEditErrorMsg('Erro ao salvar as alterações.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDownloadAttachment = (att) => {
    if (!att || !att.base64) return;
    const link = document.createElement('a');
    link.href = att.base64.startsWith('data:') ? att.base64 : `data:${att.type || 'application/octet-stream'};base64,${att.base64}`;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewAttachment = (att) => {
    setPreviewAtt(att);
  };

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
  const [planos, setPlanos] = useState([]);

  // Estados para Implantação
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployItem, setDeployItem] = useState(null);
  const [contratosList, setContratosList] = useState([]);
  const [produtosList, setProdutosList] = useState([]);
  const [selectedContrato, setSelectedContrato] = useState('');
  const [selectedProduto, setSelectedProduto] = useState('');
  const [loadingDeployData, setLoadingDeployData] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const updateField = (field, value) => {
    setErrorMsg('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenDeploy = async (item) => {
    setDeployItem(item);
    setShowDeploy(true);
    setLoadingDeployData(true);
    setSelectedContrato(item.contrato || '');
    setSelectedProduto(item.plano || '');
    try {
      const [emp, ade, prod] = await Promise.all([
        fetchContratosEmpresarial(),
        fetchContratosAdesao(),
        fetchProdutos()
      ]);
      const combinedContratos = [
        ...emp.map(c => ({ id: c.id, numero: c.numero, empresa: c.empresa, tipo: 'Empresarial' })),
        ...ade.map(c => ({ id: c.id, numero: c.numero, empresa: c.administradora || 'Adesão', tipo: 'Adesão' }))
      ];
      setContratosList(combinedContratos);
      setProdutosList(prod);

      // Pré-selecionar contrato se a empresa corresponder
      if (item.empresa) {
        const matchingContrato = combinedContratos.find(
          c => c.empresa && c.empresa.toLowerCase().trim() === item.empresa.toLowerCase().trim()
        );
        if (matchingContrato) {
          setSelectedContrato(matchingContrato.numero);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar dados de implantação:", e);
    }
    setLoadingDeployData(false);
  };

  const handleDeploy = async () => {
    if (!deployItem) return;
    setDeploying(true);
    try {
      await updateInclusao(deployItem.id, {
        ...deployItem,
        contrato: selectedContrato,
        plano: selectedProduto,
        status: 'Concluído'
      });
      setShowDeploy(false);
      loadData();
    } catch (e) {
      console.error("Erro ao implantar beneficiário:", e);
    }
    setDeploying(false);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try { 
      setData(await fetchInclusoes(search, statusFilter)); 
      const registeredPlanos = await fetchProdutos();
      setPlanos(registeredPlanos || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!showNew) {
      setErrorMsg('');
      setPlanosInput([createEmptyPlan()]);
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
    if (!formData.genero) {
      setErrorMsg('O preenchimento do Gênero é obrigatório.');
      return;
    }
    if (formData.telefone?.trim()) {
      const cleanPhone = formData.telefone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        setErrorMsg('Telefone inválido (mínimo de 10 ou 11 dígitos).');
        return;
      }
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

      await createInclusao({
        ...formData,
        plano: planoString,
        valorMensal: valorMensalString
      });
      setShowNew(false);
      setFormData(initialFormData);
      setErrorMsg('');
      loadData();
    } catch(e) {
      console.error(e);
      setErrorMsg('Erro ao salvar inclusão.');
    }
    setSaving(false);
  };

  const getStatusBadge = (s) => ({'Aprovado':'badge-aprovado','Concluído':'badge-aprovado','Pendente':'badge-pendente','Em Análise':'badge-analise','Recusado':'badge-cancelado'}[s]||'badge-pendente');

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#27ae6015', display:'flex', alignItems:'center', justifyContent:'center' }}><UserPlus size={18} color="#27ae60" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Inclusão de Beneficiários</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Gerencie solicitações de inclusão</p></div>
        </div>
        <Button onClick={()=>setShowNew(true)} style={{ background:'#27ae60', color:'#fff', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><UserPlus size={14}/>Nova Inclusão</Button>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#27ae60'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <div style={{ flex:1, position:'relative' }}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar por contrato, empresa, beneficiário, CPF, telefone ou e-mail..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.8rem',color:'#344050',background:'#fff',cursor:'pointer'}}>
            <option value="todos">Todos</option><option value="aprovado">Aprovado</option><option value="pendente">Pendente</option><option value="recusado">Recusado</option>
          </select>
        </div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'auto', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#27ae60',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Protocolo</th><th>Contrato</th><th>Empresa</th><th>Beneficiário</th><th>Nome da Mãe</th><th>CPF</th><th>Nascimento</th><th>Telefone</th><th>E-mail</th><th>Parentesco</th><th>Estado Civil</th><th>Solicitação</th><th>Status</th><th style={{ textAlign: 'center' }}>Ações</th></tr></thead>
            <tbody>{(data || []).map((item,i)=>(<tr key={i}>
              <td style={{fontWeight:600,color:'#27ae60'}}>
                <button
                  type="button"
                  onClick={() => setSelectedProtocol(item)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#27ae60',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textAlign: 'left'
                  }}
                >
                  {item.protocolo}
                </button>
              </td>
              <td style={{color:'#2C7BE5',fontWeight:500}}>{item.contrato || '-'}</td>
              <td>{item.empresa}</td><td style={{fontWeight:500}}>{item.beneficiario}</td>
              <td>{item.nomeMae || '-'}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.cpf}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.dataNascimento || '-'}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.telefone || '-'}</td>
              <td style={{fontSize:'0.75rem',color:'#5E6E82'}}>{item.email || '-'}</td>
              <td>{item.parentesco}</td>
              <td>{item.estadoCivil || '-'}</td>
              <td>{item.dataSolicitacao}</td>
              <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                  {item.status !== 'Concluído' && item.status !== 'Aprovado' ? (
                    <Button 
                      onClick={() => handleOpenDeploy(item)} 
                      style={{ background: '#27ae60', color: '#fff', fontSize: '0.72rem', padding: '4px 8px', height: '28px', fontWeight: 600 }}
                    >
                      🚀 Implantar
                    </Button>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#27ae60', fontWeight: 600 }}>Implantado</span>
                  )}
                  <Button
                    onClick={() => {
                      setSelectedProtocol(item);
                      setEditFormData({ ...item });
                      setIsEditing(true);
                    }}
                    variant="outline"
                    style={{ fontSize: '0.72rem', padding: '4px 8px', height: '28px', color: '#344050', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Pencil size={12} /> Editar
                  </Button>
                </div>
              </td>
            </tr>))}</tbody>
          </table>
        )}
        {!loading && data.length===0 && <div style={{padding:'40px',textAlign:'center',color:'#8a8d93'}}>Nenhuma inclusão encontrada.</div>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',fontSize:'0.72rem',color:'#8a8d93'}}><span>Exibindo {data.length} registros</span></div>

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'720px'}}><DialogHeader><DialogTitle>Nova Inclusão</DialogTitle></DialogHeader>
        {errorMsg && <div style={{ padding: '8px 12px', background: '#ffe2e2', color: '#991b1b', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ {errorMsg}</div>}
        <div style={{display:'flex',flexDirection:'column',gap:'12px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Contrato</label><Input placeholder="EMP-2024-001" value={formData.contrato} onChange={e=>updateField('contrato', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Empresa</label><Input placeholder="Nome da empresa" value={formData.empresa} onChange={e=>updateField('empresa', e.target.value)}/></div>
          </div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome do Beneficiário</label><Input placeholder="Nome completo" value={formData.beneficiario} onChange={e=>updateField('beneficiario', e.target.value)}/></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome da Mãe</label><Input placeholder="Nome completo da mãe" value={formData.nomeMae} onChange={e=>updateField('nomeMae', e.target.value)}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CPF</label><Input placeholder="000.000.000-00" value={formData.cpf} onChange={e=>updateField('cpf', formatCPF(e.target.value))}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Data de nascimento</label><Input type="date" value={formData.dataNascimento} onChange={e=>updateField('dataNascimento', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Parentesco</label>
              <select value={formData.parentesco} onChange={e=>updateField('parentesco', e.target.value)} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}>
                <option>Titular</option><option>Cônjuge</option><option>Filho(a)</option><option>Entiado</option><option>Dependente</option>
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Telefone</label><Input placeholder="(00) 00000-0000" value={formData.telefone} onChange={e=>updateField('telefone', formatPhone(e.target.value))}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>E-mail</label><Input type="email" placeholder="E-mail do beneficiário" value={formData.email} onChange={e=>updateField('email', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Estado Civil</label>
              <select value={formData.estadoCivil} onChange={e=>updateField('estadoCivil', e.target.value)} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}>
                <option value="">Selecione</option>
                <option>Solteiro(a)</option>
                <option>Casado(a)</option>
                <option>Divorciado(a)</option>
                <option>Viúvo(a)</option>
              </select>
            </div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Gênero</label>
              <select value={formData.genero || ''} onChange={e=>updateField('genero', e.target.value)} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}>
                <option value="">Selecione</option>
                <option>Masculino</option>
                <option>Feminino</option>
              </select>
            </div>
          </div>

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
                        style={{ padding: '0 12px', background: '#27ae60', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', height: '38px' }}
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
                        name={`pricingModeInclusao-${idx}`} 
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
                        name={`pricingModeInclusao-${idx}`} 
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
        </div>
        <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancelar</Button><Button style={{background:'#27ae60',color:'#fff'}} onClick={handleCreate} disabled={saving}>{saving?'Salvando...':'Solicitar Inclusão'}</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Popout de Implantação */}
      <Dialog open={showDeploy} onOpenChange={setShowDeploy}>
        <DialogContent style={{ maxWidth: '500px' }}>
          <DialogHeader>
            <DialogTitle>🚀 Implantar Beneficiário</DialogTitle>
          </DialogHeader>
          {loadingDeployData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 size={24} style={{ color: '#27ae60', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#8a8d93', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Beneficiário</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#344050' }}>{deployItem?.beneficiario}</div>
                </div>
                {deployItem?.nomeMae && (
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#8a8d93', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Nome da Mãe</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#344050' }}>{deployItem?.nomeMae}</div>
                  </div>
                )}
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#8a8d93', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Empresa da Inclusão</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#344050' }}>{deployItem?.empresa || '-'}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#8a8d93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Selecione o Contrato Vinculado *</label>
                <select 
                  value={selectedContrato} 
                  onChange={e => setSelectedContrato(e.target.value)} 
                  style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '10px 12px', fontSize: '0.85rem', color: '#344050', background: '#fff' }}
                >
                  <option value="">Selecione o Contrato</option>
                  {contratosList.map((c, idx) => (
                    <option key={idx} value={c.numero}>
                      {c.numero} - {c.empresa} ({c.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#8a8d93', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Selecione o Plano *</label>
                <select 
                  value={selectedProduto} 
                  onChange={e => setSelectedProduto(e.target.value)} 
                  style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '10px 12px', fontSize: '0.85rem', color: '#344050', background: '#fff' }}
                >
                  <option value="">Selecione o Plano</option>
                  {produtosList.map((p, idx) => (
                    <option key={idx} value={p.nome}>
                      {p.nome} - {p.seguradora}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeploy(false)}>Cancelar</Button>
            <Button 
              style={{ background: '#27ae60', color: '#fff', fontWeight: 'bold' }} 
              onClick={handleDeploy} 
              disabled={deploying || !selectedContrato || !selectedProduto || loadingDeployData}
            >
              {deploying ? 'Implantando...' : 'Confirmar Implantação 🚀'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalhes do Protocolo */}
      <Dialog open={!!selectedProtocol} onOpenChange={(open) => {
        if (!open) {
          setSelectedProtocol(null);
          setIsEditing(false);
          setEditFormData(null);
          setEditErrorMsg('');
        }
      }}>
        <DialogContent style={{ maxWidth: '600px' }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a3a52', fontSize: '1.25rem' }}>
              📄 Detalhes da Solicitação ({selectedProtocol?.protocolo})
            </DialogTitle>
          </DialogHeader>

          {isEditing && editErrorMsg && (
            <div style={{ padding: '8px 12px', background: '#ffe2e2', color: '#991b1b', border: '1px solid #fecdd3', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              ⚠️ {editErrorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '12px 0', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Protocolo</span>
              <span style={{ fontWeight: 700, color: '#1a3a52', fontSize: '0.95rem' }}>{selectedProtocol?.protocolo}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</span>
              {isEditing ? (
                <select
                  value={editFormData?.status || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Análise">Em Análise</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Recusado">Recusado</option>
                </select>
              ) : (
                <span>
                  <span className={selectedProtocol ? getStatusBadge(selectedProtocol.status) : ''} style={{ display: 'inline-block' }}>
                    {selectedProtocol?.status}
                  </span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Tipo</span>
              <span style={{ fontWeight: 500, color: '#344050' }}>Inclusão de Beneficiário</span>
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
              {isEditing ? (
                <Input
                  value={editFormData?.beneficiario || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, beneficiario: e.target.value })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 600, color: '#1a3a52' }}>{selectedProtocol?.beneficiario}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>CPF</span>
              {isEditing ? (
                <Input
                  value={editFormData?.cpf || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, cpf: formatCPF(e.target.value) })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.cpf}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Nome da Mãe</span>
              {isEditing ? (
                <Input
                  value={editFormData?.nomeMae || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, nomeMae: e.target.value })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.nomeMae || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Data de Nascimento</span>
              {isEditing ? (
                <Input
                  value={editFormData?.dataNascimento || ''}
                  placeholder="DD/MM/AAAA"
                  onChange={(e) => setEditFormData({ ...editFormData, dataNascimento: e.target.value })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.dataNascimento || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Parentesco</span>
              {isEditing ? (
                <select
                  value={editFormData?.parentesco || 'Titular'}
                  onChange={(e) => setEditFormData({ ...editFormData, parentesco: e.target.value })}
                  style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="Titular">Titular</option>
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Filho(a)">Filho(a)</option>
                  <option value="Outro">Outro</option>
                </select>
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.parentesco || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Gênero</span>
              {isEditing ? (
                <select
                  value={editFormData?.genero || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, genero: e.target.value })}
                  style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.genero || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Estado Civil</span>
              {isEditing ? (
                <select
                  value={editFormData?.estadoCivil || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, estadoCivil: e.target.value })}
                  style={{ width: '100%', border: '1px solid #d8e2ef', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="">Selecione...</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.estadoCivil || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Telefone</span>
              {isEditing ? (
                <Input
                  value={editFormData?.telefone || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, telefone: formatPhone(e.target.value) })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.telefone || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>E-mail</span>
              {isEditing ? (
                <Input
                  value={editFormData?.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.email || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Contrato Relacionado</span>
              {isEditing ? (
                <Input
                  value={editFormData?.contrato || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contrato: e.target.value })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 600, color: '#2C7BE5' }}>{selectedProtocol?.contrato || '-'}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Empresa</span>
              {isEditing ? (
                <Input
                  value={editFormData?.empresa || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, empresa: e.target.value })}
                  style={{ height: '34px', fontSize: '0.85rem' }}
                />
              ) : (
                <span style={{ fontWeight: 500, color: '#344050' }}>{selectedProtocol?.empresa || '-'}</span>
              )}
            </div>

            {/* Seção de Anexos */}
            {!isEditing && (selectedProtocol?.anexos || selectedProtocol?.attachments || [])?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2', marginTop: '8px' }}>
                <span style={{ color: '#8a8d93', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Anexos / Documentos</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(selectedProtocol?.anexos || selectedProtocol?.attachments || []).map((att, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 10px', background: '#f8f9fa', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <Paperclip size={14} color="#2C7BE5" />
                        <span style={{ fontWeight: 600, color: '#344050', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                        {att.size ? <span style={{ color: '#8a8d93', fontSize: '0.72rem', marginLeft: '6px' }}>({(att.size / 1024).toFixed(0)} KB)</span> : null}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewAttachment(att)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', height: '28px', cursor: 'pointer' }}
                        >
                          <Eye size={12} /> Visualizar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadAttachment(att)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', height: '28px', background: '#2C7BE5', color: '#fff', cursor: 'pointer' }}
                        >
                          <Download size={12} /> Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter style={{ display: 'flex', gap: '8px', width: '100%' }}>
            {isEditing ? (
              <>
                <Button 
                  onClick={() => {
                    setIsEditing(false);
                    setEditFormData(null);
                    setEditErrorMsg('');
                  }} 
                  variant="outline" 
                  style={{ flex: 1 }}
                  disabled={editSaving}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleEditSave} 
                  style={{ background: '#27ae60', color: '#fff', flex: 1 }}
                  disabled={editSaving}
                >
                  {editSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => {
                    setEditFormData({ ...selectedProtocol });
                    setIsEditing(true);
                  }} 
                  variant="outline" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px', borderColor: '#2C7BE5', color: '#2C7BE5' }}
                >
                  <Pencil size={14} /> Editar
                </Button>
                <Button 
                  onClick={() => setSelectedProtocol(null)} 
                  style={{ background: '#1a3a52', color: '#fff', flex: 1 }}
                >
                  Fechar Detalhes
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Visualização de Anexo */}
      <Dialog open={!!previewAtt} onOpenChange={(open) => !open && setPreviewAtt(null)}>
        <DialogContent style={{ maxWidth: '800px', width: '90%' }}>
          <DialogHeader>
            <DialogTitle>👁️ Visualizar Anexo: {previewAtt?.name}</DialogTitle>
          </DialogHeader>
          <div style={{ margin: '14px 0', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px' }}>
            {previewAtt ? (
              previewAtt.name.toLowerCase().endsWith('.pdf') || previewAtt.type?.includes('pdf') ? (
                <iframe
                  src={previewAtt.base64?.startsWith('data:') ? previewAtt.base64 : `data:application/pdf;base64,${previewAtt.base64}`}
                  style={{ width: '100%', height: '550px', border: 'none', borderRadius: '4px' }}
                  title="PDF Preview"
                />
              ) : previewAtt.name.toLowerCase().endsWith('.png') || previewAtt.name.toLowerCase().endsWith('.jpg') || previewAtt.name.toLowerCase().endsWith('.jpeg') || previewAtt.name.toLowerCase().endsWith('.gif') || previewAtt.type?.includes('image') ? (
                <img
                  src={previewAtt.base64?.startsWith('data:') ? previewAtt.base64 : `data:${previewAtt.type || 'image/png'};base64,${previewAtt.base64}`}
                  alt={previewAtt.name}
                  style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '4px' }}
                />
              ) : previewAtt.name.toLowerCase().endsWith('.txt') || previewAtt.type?.includes('text') ? (
                <pre style={{ width: '100%', maxHeight: '500px', overflow: 'auto', padding: '12px', background: '#fff', border: '1px solid #d8e2ef', borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {atob(previewAtt.base64.split(',')[1] || previewAtt.base64)}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Paperclip size={48} color="#8a8d93" style={{ marginBottom: '14px' }} />
                  <p style={{ fontWeight: 600, color: '#344050' }}>Visualização não suportada para este tipo de arquivo.</p>
                  <p style={{ fontSize: '0.78rem', color: '#8a8d93', marginTop: '4px' }}>Por favor, faça o download utilizando o botão abaixo para abrir em seu dispositivo.</p>
                  <Button onClick={() => handleDownloadAttachment(previewAtt)} style={{ marginTop: '16px', background: '#2C7BE5', color: '#fff' }}>
                    <Download size={14} style={{ marginRight: '6px' }} /> Baixar Arquivo
                  </Button>
                </div>
              )
            ) : null}
          </div>
          <DialogFooter style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {previewAtt && (
              <Button onClick={() => handleDownloadAttachment(previewAtt)} variant="outline">
                <Download size={14} style={{ marginRight: '6px' }} /> Baixar
              </Button>
            )}
            <Button onClick={() => setPreviewAtt(null)} style={{ background: '#2C7BE5', color: '#fff' }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inclusao;
