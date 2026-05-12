import React, { useState, useEffect } from 'react';
import { fetchRelatorioResumo } from '../services/api';
import { BarChart3, Loader2, FileText, Users, Handshake, UserPlus, UserMinus, ArrowLeftRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4979bb', '#e6832a', '#27ae60', '#e63757', '#8e44ad', '#3498db'];

const Relatorios = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatorioResumo().then(d => { setData(d); setLoading(false); }).catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'50vh'}}><Loader2 size={32} style={{color:'#4979bb',animation:'spin 1s linear infinite'}}/></div>;
  if (!data) return <div style={{textAlign:'center',padding:'40px',color:'#8a8d93'}}>Erro ao carregar relatórios.</div>;

  const segData = data.porSeguradora || [];
  const pieData = segData.map(s => ({ name: s.seguradora, value: s.vidas }));
  const barData = segData.map(s => ({ name: s.seguradora, contratos: s.contratos, vidas: s.vidas }));

  const summaryCards = [
    { label: 'Contratos Adesão', value: data.totalContratosAdesao, icon: FileText, color: '#4979bb' },
    { label: 'Contratos Empresarial', value: data.totalContratosEmpresarial, icon: Handshake, color: '#e6832a' },
    { label: 'Total Inclusões', value: data.totalInclusoes, icon: UserPlus, color: '#27ae60' },
    { label: 'Total Exclusões', value: data.totalExclusoes, icon: UserMinus, color: '#e63757' },
    { label: 'Total Transferências', value: data.totalTransferencias, icon: ArrowLeftRight, color: '#8e44ad' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
        <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#4979bb15', display:'flex', alignItems:'center', justifyContent:'center' }}><BarChart3 size={18} color="#4979bb" /></div>
        <div><h2 style={{ fontSize:'1.1rem', fontWeight:600, color:'#344050', margin:0 }}>Relatórios</h2><p style={{ fontSize:'0.72rem', color:'#8a8d93', margin:0 }}>Visão consolidada de dados da corretora</p></div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'12px', marginBottom:'20px' }}>
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="stat-card">
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:`${card.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={16} color={card.color} /></div>
              </div>
              <div style={{ fontSize:'1.4rem', fontWeight:700, color:'#344050' }}>{card.value}</div>
              <div style={{ fontSize:'0.68rem', color:'#8a8d93', marginTop:'2px' }}>{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
        <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize:'0.85rem', fontWeight:600, color:'#344050', marginBottom:'16px' }}>Contratos e Vidas por Seguradora</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8a8d93' }} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: '#8a8d93' }} />
              <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} />
              <Bar dataKey="vidas" name="Vidas" fill="#4979bb" radius={[3,3,0,0]} />
              <Bar dataKey="contratos" name="Contratos" fill="#e6832a" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize:'0.85rem', fontWeight:600, color:'#344050', marginBottom:'16px' }}>Distribuição de Vidas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={85} paddingAngle={2} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{fontSize:'0.6rem'}}>
              {pieData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]}/>))}
            </Pie><Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e3e6f0' }} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Tables */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
        <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize:'0.85rem', fontWeight:600, color:'#344050', marginBottom:'12px' }}>Status - Contratos Adesão</h3>
          <table className="data-table"><thead><tr><th>Status</th><th>Quantidade</th></tr></thead>
            <tbody>{Object.entries(data.statusAdesao||{}).map(([st, qt]) => (
              <tr key={st}><td><span className={({'Ativo':'badge-ativo','Cancelado':'badge-cancelado','Suspenso':'badge-suspenso'})[st]||'badge-pendente'}>{st}</span></td><td style={{fontWeight:600}}>{qt}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ background:'#fff', borderRadius:'8px', padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize:'0.85rem', fontWeight:600, color:'#344050', marginBottom:'12px' }}>Status - Contratos Empresarial</h3>
          <table className="data-table"><thead><tr><th>Status</th><th>Quantidade</th></tr></thead>
            <tbody>{Object.entries(data.statusEmpresarial||{}).map(([st, qt]) => (
              <tr key={st}><td><span className={({'Ativo':'badge-ativo','Cancelado':'badge-cancelado','Vencido':'badge-vencido','Suspenso':'badge-suspenso'})[st]||'badge-pendente'}>{st}</span></td><td style={{fontWeight:600}}>{qt}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
