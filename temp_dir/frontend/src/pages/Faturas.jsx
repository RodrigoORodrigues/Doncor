import React, { useState, useEffect, useCallback } from 'react';
import { fetchFaturas, fetchFaturasResumo } from '../services/api';
import { Receipt, Search, Filter, Eye, Download, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const Faturas = () => {
  const [data, setData] = useState([]);
  const [resumo, setResumo] = useState({ abertas: 0, vencidas: 0, pagas: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [faturas, res] = await Promise.all([fetchFaturas(search, statusFilter), fetchFaturasResumo()]);
      setData(faturas); setResumo(res);
    } catch(e){console.error(e);}
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const getStatusBadge = (s) => ({'Paga':'badge-aprovado','Aberta':'badge-analise','Vencida':'badge-cancelado'}[s]||'badge-pendente');

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'#2a5fcf15', display:'flex', alignItems:'center', justifyContent:'center' }}><Receipt size={22} color="#2a5fcf" /></div>
          <div><h2 style={{ fontSize:'1.2rem', fontWeight:600, color:'#1a3a52', margin:0 }}>Faturas</h2><p style={{ fontSize:'0.75rem', color:'#6c7680', margin:0 }}>Controle de faturas e pagamentos</p></div>
        </div>
        <Button variant="outline" style={{ fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'6px' }}><Download size={14}/>Exportar Relatório</Button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'16px', marginBottom:'20px' }}>
        <div className="stat-card" style={{borderLeft:'4px solid #2a5fcf'}}><div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}><AlertTriangle size={18} color="#2a5fcf"/><span style={{fontSize:'0.75rem',color:'#6c7680',fontWeight:500}}>Faturas Abertas</span></div><span style={{fontSize:'1.6rem',fontWeight:700,color:'#2a5fcf'}}>{resumo.abertas}</span></div>
        <div className="stat-card" style={{borderLeft:'4px solid #e63757'}}><div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}><XCircle size={18} color="#e63757"/><span style={{fontSize:'0.75rem',color:'#6c7680',fontWeight:500}}>Faturas Vencidas</span></div><span style={{fontSize:'1.6rem',fontWeight:700,color:'#e63757'}}>{resumo.vencidas}</span></div>
        <div className="stat-card" style={{borderLeft:'4px solid #27ae60'}}><div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}><CheckCircle size={18} color="#27ae60"/><span style={{fontSize:'0.75rem',color:'#6c7680',fontWeight:500}}>Faturas Pagas</span></div><span style={{fontSize:'1.6rem',fontWeight:700,color:'#27ae60'}}>{resumo.pagas}</span></div>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#6c7680'}}/><Input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{border:'1px solid #c9dff1',borderRadius:'6px',padding:'8px 12px',fontSize:'0.8rem',color:'#1a3a52',background:'#fff',cursor:'pointer'}}>
            <option value="todos">Todos</option><option value="aberta">Aberta</option><option value="paga">Paga</option><option value="vencida">Vencida</option>
          </select>
        </div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#2a5fcf',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Número</th><th>Contrato</th><th>Seguradora</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Valor Pago</th><th>Status</th></tr></thead>
            <tbody>{data.map((item,i)=>(<tr key={i}>
              <td style={{fontWeight:600,color:'#1a3a52'}}>{item.numero}</td>
              <td style={{color:'#2a5fcf',fontWeight:500}}>{item.contrato}</td>
              <td>{item.seguradora}</td><td>{item.competencia}</td><td>{item.vencimento}</td>
              <td style={{fontWeight:600}}>{item.valor}</td>
              <td style={{fontWeight:500,color:item.valorPago==='-'?'#6c7680':'#27ae60'}}>{item.valorPago}</td>
              <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
            </tr>))}</tbody>
          </table>
        )}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:'12px',fontSize:'0.75rem',color:'#6c7680'}}><span>Exibindo {data.length} faturas</span></div>
    </div>
  );
};

export default Faturas;
