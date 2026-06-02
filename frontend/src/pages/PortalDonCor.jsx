import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, FileText, Receipt, BarChart3, MessageCircle, Paperclip, Send, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { loginPortalDonCor, fetchPortalDonCorResumo, fetchPortalDonCorChat, sendPortalDonCorChat } from '../services/api';

const STORAGE_KEY = 'doncor_portal_session';
const readSession = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };

const StatCard = ({ title, value, icon: Icon }) => (
  <div style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'14px', padding:'16px' }}>
    <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'#2C7BE5', fontSize:'0.82rem', fontWeight:700, marginBottom:'8px' }}><Icon size={16}/>{title}</div>
    <div style={{ color:'#243447', fontSize:'1.3rem', fontWeight:800 }}>{value}</div>
  </div>
);

const PortalDonCor = () => {
  const [session, setSession] = useState(readSession);
  const [documento, setDocumento] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);

  const empresa = session?.empresa || session?.nome || 'Parceiro';

  const loadPortal = useCallback(async (currentSession = session) => {
    if (!currentSession?.documento) return;
    setLoading(true);
    try {
      const resumo = await fetchPortalDonCorResumo(currentSession.documento);
      const chat = await fetchPortalDonCorChat({ documento: currentSession.documento, empresa: currentSession.empresa });
      setPayload(resumo);
      setMessages(chat || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Não foi possível carregar o Portal DonCor.');
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { loadPortal(); }, [loadPortal]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginPortalDonCor(documento);
      setSession(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      await loadPortal(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'CPF/CNPJ não localizado.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setPayload(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!session || (!message.trim() && !attachment)) return;
    const saved = await sendPortalDonCorChat({
      documento: session.documento,
      empresa,
      text: message.trim(),
      attachmentName: attachment?.name || '',
      attachmentSize: attachment?.size || 0,
      sender: empresa,
      senderRole: 'portal',
    });
    setMessages((items) => [...items, saved]);
    setMessage('');
    setAttachment(null);
  };

  const totalAnalitico = useMemo(() => (payload?.analitico || []).reduce((sum, item) => sum + (Number(item.valorNumerico) || 0), 0), [payload]);
  const maxAnalitico = useMemo(() => Math.max(...(payload?.analitico || []).map((item) => Number(item.valorNumerico) || 0), 1), [payload]);

  if (!session) {
    return (
      <div style={{ minHeight:'100vh', background:'#eef4fb', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
        <form onSubmit={handleLogin} style={{ width:'100%', maxWidth:'460px', background:'#fff', border:'1px solid #e3e6f0', borderRadius:'18px', padding:'30px' }}>
          <div style={{ textAlign:'center', marginBottom:'24px' }}>
            <div style={{ width:'64px', height:'64px', borderRadius:'18px', background:'#2C7BE5', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'22px', marginBottom:'12px' }}>DC</div>
            <h1 style={{ margin:0, fontSize:'1.55rem', color:'#243447' }}>Portal DonCor</h1>
            <p style={{ margin:'8px 0 0', color:'#6b7280', fontSize:'0.9rem' }}>Acesso exclusivo para empresas e parceiros cadastrados.</p>
          </div>
          {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:'8px', padding:'10px 12px', marginBottom:'14px', fontSize:'0.86rem' }}>{error}</div>}
          <label style={{ display:'block', color:'#344050', fontWeight:700, fontSize:'0.84rem', marginBottom:'6px' }}>CNPJ ou CPF vinculado</label>
          <Input value={documento} onChange={(event) => setDocumento(event.target.value)} placeholder="Digite o CNPJ da empresa ou CPF" style={{ marginBottom:'16px' }} />
          <Button type="submit" disabled={loading} style={{ width:'100%', background:'#2C7BE5', color:'#fff', fontWeight:800 }}>{loading ? 'Validando...' : 'Entrar no Portal DonCor'}</Button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#eef4fb' }}>
      <header style={{ background:'#fff', borderBottom:'1px solid #d8e2ef', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div><strong style={{ color:'#243447', fontSize:'1.1rem' }}>Portal DonCor</strong><div style={{ color:'#6b7280', fontSize:'0.78rem' }}>{empresa} • {session.documento}</div></div>
        <Button variant="outline" onClick={handleLogout} style={{ display:'flex', gap:'6px' }}><LogOut size={14}/>Sair</Button>
      </header>

      <main style={{ padding:'22px', maxWidth:'1280px', margin:'0 auto' }}>
        {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:'8px', padding:'10px 12px', marginBottom:'14px' }}>{error}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:'14px', marginBottom:'16px' }}>
          <StatCard title="Contratos" value={payload?.resumo?.contratos || 0} icon={Building2}/>
          <StatCard title="Faturas" value={payload?.resumo?.faturas || 0} icon={FileText}/>
          <StatCard title="Boletos" value={payload?.resumo?.boletos || 0} icon={Receipt}/>
          <StatCard title="Total faturado" value={payload?.resumo?.totalFaturado || 'R$ 0,00'} icon={BarChart3}/>
        </div>

        <section style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'14px', padding:'16px', marginBottom:'16px' }}>
          <h2 style={{ fontSize:'1rem', color:'#243447', margin:'0 0 12px' }}>Analítico de Faturamento</h2>
          {(payload?.analitico || []).map((item) => (
            <div key={item.competencia} style={{ marginBottom:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem', color:'#344050', fontWeight:700 }}><span>{item.competencia}</span><span>{item.valor}</span></div>
              <div style={{ height:'8px', background:'#eef4fb', borderRadius:'999px', overflow:'hidden', marginTop:'5px' }}><div style={{ width:`${Math.max((item.valorNumerico / maxAnalitico) * 100, 4)}%`, height:'100%', background:'#2C7BE5' }} /></div>
            </div>
          ))}
          <div style={{ color:'#6b7280', fontSize:'0.78rem', marginTop:'8px' }}>Total: {new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL' }).format(totalAnalitico)}</div>
        </section>

        <section style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'14px', padding:'16px', marginBottom:'16px', overflow:'auto' }}>
          <h2 style={{ fontSize:'1rem', color:'#243447', margin:'0 0 12px' }}>Faturas</h2>
          <table className="data-table"><thead><tr><th>Número</th><th>Contrato</th><th>Seguradora</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>{(payload?.faturas || []).map((item) => <tr key={item.id || item.numero}><td>{item.numero}</td><td>{item.contrato}</td><td>{item.seguradora}</td><td>{item.competencia}</td><td>{item.vencimento}</td><td>{item.valor}</td><td>{item.status}</td></tr>)}</tbody>
          </table>
        </section>

        <section style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'14px', padding:'16px', marginBottom:'16px', overflow:'auto' }}>
          <h2 style={{ fontSize:'1rem', color:'#243447', margin:'0 0 12px' }}>Boletos baixados</h2>
          <table className="data-table"><thead><tr><th>Operadora</th><th>Competência</th><th>Arquivo</th><th>Status</th><th>Abrir</th></tr></thead>
            <tbody>{(payload?.boletos || []).map((item) => <tr key={item.id || item.storage_path}><td>{item.operadora}</td><td>{item.competencia}</td><td>{item.arquivo_nome || item.nome_arquivo}</td><td>{item.status}</td><td>{item.arquivo_url ? <a href={item.arquivo_url} target="_blank" rel="noreferrer">Abrir PDF</a> : '-'}</td></tr>)}</tbody>
          </table>
        </section>

        <section style={{ background:'#fff', border:'1px solid #e3e6f0', borderRadius:'14px', minHeight:'420px', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #e3e6f0', display:'flex', alignItems:'center', gap:'8px', color:'#243447', fontWeight:800 }}><MessageCircle size={17}/>Chat com DonCor</div>
          <div style={{ flex:1, padding:'16px', background:'#f7f9fc', overflowY:'auto' }}>
            {messages.length === 0 ? <div style={{ color:'#8a8d93', textAlign:'center', marginTop:'50px' }}>Nenhuma mensagem ainda.</div> : messages.map((item) => (
              <div key={item.id} style={{ display:'flex', justifyContent:item.direction === 'incoming' ? 'flex-end' : 'flex-start', marginBottom:'10px' }}>
                <div style={{ maxWidth:'72%', background:item.direction === 'incoming' ? '#2C7BE5' : '#fff', color:item.direction === 'incoming' ? '#fff' : '#344050', border:'1px solid #e3e6f0', borderRadius:'12px', padding:'10px 12px' }}>
                  <div style={{ fontSize:'0.68rem', opacity:0.82, marginBottom:'4px' }}>{item.sender}</div>
                  {item.text && <div style={{ fontSize:'0.88rem' }}>{item.text}</div>}
                  {item.attachmentName && <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'6px', fontSize:'0.78rem', fontWeight:700 }}><Paperclip size={13}/>{item.attachmentName}</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:'14px', borderTop:'1px solid #e3e6f0' }}>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Digite sua mensagem para a DonCor..." style={{ width:'100%', minHeight:'76px', border:'1px solid #d8e2ef', borderRadius:'8px', padding:'10px 12px', resize:'vertical', fontFamily:'inherit', fontSize:'0.86rem' }} />
            <div style={{ display:'flex', justifyContent:'space-between', gap:'10px', marginTop:'10px' }}>
              <label style={{ border:'1px solid #d8e2ef', borderRadius:'8px', padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', color:'#344050', fontSize:'0.8rem' }}>
                <Paperclip size={14}/> {attachment ? attachment.name : 'Anexar documento'}
                <Input type="file" onChange={(event) => setAttachment(event.target.files?.[0] || null)} style={{ display:'none' }} />
              </label>
              <Button onClick={sendMessage} style={{ background:'#2C7BE5', color:'#fff', display:'flex', gap:'6px' }}><Send size={14}/>Enviar</Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PortalDonCor;
