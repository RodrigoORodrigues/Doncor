import React, { useState, useEffect, useCallback } from 'react';
import { fetchInclusoes, createInclusao, updateInclusao, fetchContratosEmpresarial, fetchContratosAdesao, fetchProdutos } from '../services/api';
import { UserPlus, Search, Filter, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

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
  estadoCivil: '',
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

  // Estados para Implantação
  const [showDeploy, setShowDeploy] = useState(false);
  const [deployItem, setDeployItem] = useState(null);
  const [contratosList, setContratosList] = useState([]);
  const [produtosList, setProdutosList] = useState([]);
  const [selectedContrato, setSelectedContrato] = useState('');
  const [selectedProduto, setSelectedProduto] = useState('');
  const [loadingDeployData, setLoadingDeployData] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

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
    try { setData(await fetchInclusoes(search, statusFilter)); } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createInclusao(formData);
      setShowNew(false);
      setFormData(initialFormData);
      loadData();
    } catch(e) {
      console.error(e);
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
            <tbody>{data.map((item,i)=>(<tr key={i}>
              <td style={{fontWeight:600,color:'#27ae60'}}>{item.protocolo}</td>
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
                {item.status !== 'Concluído' && item.status !== 'Aprovado' ? (
                  <Button 
                    onClick={() => handleOpenDeploy(item)} 
                    style={{ background: '#27ae60', color: '#fff', fontSize: '0.72rem', padding: '4px 8px', height: 'auto', fontWeight: 600 }}
                  >
                    🚀 Implantar
                  </Button>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#27ae60', fontWeight: 600 }}>Implantado</span>
                )}
              </td>
            </tr>))}</tbody>
          </table>
        )}
        {!loading && data.length===0 && <div style={{padding:'40px',textAlign:'center',color:'#8a8d93'}}>Nenhuma inclusão encontrada.</div>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',fontSize:'0.72rem',color:'#8a8d93'}}><span>Exibindo {data.length} registros</span></div>

      <Dialog open={showNew} onOpenChange={setShowNew}><DialogContent style={{maxWidth:'720px'}}><DialogHeader><DialogTitle>Nova Inclusão</DialogTitle></DialogHeader>
        <div style={{display:'flex',flexDirection:'column',gap:'12px',padding:'8px 0'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Contrato</label><Input placeholder="EMP-2024-001" value={formData.contrato} onChange={e=>updateField('contrato', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Empresa</label><Input placeholder="Nome da empresa" value={formData.empresa} onChange={e=>updateField('empresa', e.target.value)}/></div>
          </div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome do Beneficiário</label><Input placeholder="Nome completo" value={formData.beneficiario} onChange={e=>updateField('beneficiario', e.target.value)}/></div>
          <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Nome da Mãe</label><Input placeholder="Nome completo da mãe" value={formData.nomeMae} onChange={e=>updateField('nomeMae', e.target.value)}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>CPF</label><Input placeholder="000.000.000-00" value={formData.cpf} onChange={e=>updateField('cpf', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Data de nascimento</label><Input type="date" value={formData.dataNascimento} onChange={e=>updateField('dataNascimento', e.target.value)}/></div>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Parentesco</label>
              <select value={formData.parentesco} onChange={e=>updateField('parentesco', e.target.value)} style={{width:'100%',border:'1px solid #d8e2ef',borderRadius:'6px',padding:'8px 12px',fontSize:'0.85rem'}}>
                <option>Titular</option><option>Cônjuge</option><option>Filho(a)</option><option>Dependente</option>
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
            <div><label style={{fontSize:'0.72rem',color:'#8a8d93',fontWeight:600}}>Telefone</label><Input placeholder="(00) 00000-0000" value={formData.telefone} onChange={e=>updateField('telefone', e.target.value)}/></div>
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
    </div>
  );
};

export default Inclusao;
