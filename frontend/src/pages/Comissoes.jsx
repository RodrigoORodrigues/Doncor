import React, { useState, useEffect, useCallback } from 'react';
import { fetchComissoes, fetchComissoesEvolucao } from '../services/api';
import { DollarSign, Search, Filter, Eye, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Comissoes = () => {
  const [data, setData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [comissoes, evolucao] = await Promise.all([fetchComissoes(search), fetchComissoesEvolucao()]);
      setData(comissoes); setChartData(evolucao);
    } catch(e){console.error(e);}
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);

  const getStatusBadge = (s) => ({'Paga':'badge-aprovado','Prevista':'badge-analise','Pendente':'badge-pendente'}[s]||'badge-pendente');

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#e6832a15', display:'flex', alignItems:'center', justifyContent:'center' }}><DollarSign size={18} color="#e6832a" /></div>
          <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Comissões</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Acompanhe suas comissões por seguradora</p></div>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'0.85rem', fontWeight:600, color:'#344050', marginBottom:'12px' }}>Evolução de Comissões (R$)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#8a8d93' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8a8d93' }} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} formatter={v=>[`R$ ${v.toLocaleString('pt-BR')}`, 'Comissão']} />
            <Bar dataKey="valor" fill="#e6832a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="filters-toggle" onClick={()=>setShowFilters(!showFilters)} style={{background:'#e6832a'}}><Filter size={11} style={{marginRight:'4px'}}/>Filtros</div>
      {showFilters && (<div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'16px', marginBottom:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{flex:1,position:'relative'}}><Search size={14} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#8a8d93'}}/><Input placeholder="Buscar seguradora..." value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:'32px',fontSize:'0.8rem'}}/></div>
      </div>)}

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden', marginTop:showFilters?'0':'12px' }}>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:'40px'}}><Loader2 size={24} style={{color:'#e6832a',animation:'spin 1s linear infinite'}}/></div> : (
          <table className="data-table"><thead><tr><th>Seguradora</th><th>Competência</th><th>Contratos</th><th>Vidas Base</th><th>Percentual</th><th>Valor Estimado</th><th>Status</th></tr></thead>
            <tbody>{data.map((item,i)=>(<tr key={i}>
              <td style={{fontWeight:600}}>{item.seguradora}</td><td>{item.competencia}</td>
              <td style={{textAlign:'center'}}>{item.contratos}</td><td style={{textAlign:'center'}}>{item.vidasBase}</td>
              <td style={{fontWeight:500,color:'#e6832a'}}>{item.percentual}</td>
              <td style={{fontWeight:600,color:'#27ae60'}}>{item.valorEstimado}</td>
              <td><span className={getStatusBadge(item.status)}>{item.status}</span></td>
            </tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Comissoes;
