import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Bell, Building2, Download, Eye, FileText, FolderOpen, HelpCircle, Home, LifeBuoy, LogOut, MessageCircle, Paperclip, Receipt, RefreshCw, Search, Send, Shield, UploadCloud, UserMinus, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { loginPortalDonCor, fetchPortalDonCorResumo, fetchPortalDonCorChat, sendPortalDonCorChat, alterarSenhaPortalDonCor } from '../services/api';

const STORAGE_KEY = 'doncor_portal_cliente_session';
const readSession = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };

const theme = {
  navy: '#0F172A',
  primary: '#002d69',
  blue: '#2C7BE5',
  bg: '#f5f7fb',
  card: '#ffffff',
  border: '#d8e2ef',
  muted: '#64748B',
  text: '#1E293B',
  ok: '#10B981',
  warning: '#F59E0B',
};

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'contratos', label: 'Contratos', icon: FolderOpen },
  { id: 'faturas', label: 'Faturas e Boletos', icon: Receipt },
  { id: 'bi', label: 'Sinistralidade e BI', icon: BarChart3 },
  { id: 'movimentacao', label: 'Movimentação', icon: RefreshCw },
  { id: 'solicitacoes', label: 'Solicitações', icon: FileText },
  { id: 'formularios', label: 'Formulários e Manuais', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

const card = { background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 18, boxShadow: '0 10px 28px rgba(15,23,42,0.05)' };
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const StatusPill = ({ status }) => {
  const normalized = String(status || '').toLowerCase();
  const ok = normalized.includes('pago') || normalized.includes('ativo') || normalized.includes('baixado') || normalized.includes('concl');
  const warn = normalized.includes('pend') || normalized.includes('abert') || normalized.includes('andamento');
  const color = ok ? theme.ok : warn ? theme.warning : theme.muted;
  const bg = ok ? '#ECFDF5' : warn ? '#FFFBEB' : '#F1F5F9';
  return <span style={{ color, background: bg, borderRadius: 999, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800 }}>{status || 'Em análise'}</span>;
};

const StatCard = ({ title, value, subtitle, icon: Icon, tone = theme.blue }) => (
  <div style={{ ...card, padding: 18 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ color: theme.muted, fontSize: '0.78rem', fontWeight: 700 }}>{title}</div>
        <div style={{ color: theme.text, fontSize: '1.45rem', fontWeight: 900, marginTop: 8 }}>{value}</div>
        {subtitle && <div style={{ color: theme.muted, fontSize: '0.75rem', marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 14, background: `${tone}18`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} /></div>
    </div>
  </div>
);

const SectionTitle = ({ title, subtitle, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
    <div>
      <h2 style={{ margin: 0, color: theme.text, fontSize: '1.22rem', fontWeight: 900 }}>{title}</h2>
      {subtitle && <p style={{ margin: '5px 0 0', color: theme.muted, fontSize: '0.86rem' }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const EmptyState = ({ children = 'Nenhum registro encontrado.' }) => <div style={{ padding: 28, textAlign: 'center', color: theme.muted }}>{children}</div>;

const PortalDonCor = () => {
  const [session, setSession] = useState(readSession);
  const [documento, setDocumento] = useState('');
  const [senha, setSenha] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeMovementTab, setActiveMovementTab] = useState('inclusao');
  const [showForgot, setShowForgot] = useState(false);
  const [showPassBox, setShowPassBox] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);

  const empresa = session?.empresa || session?.nome || 'Cliente';

  const loadPortal = useCallback(async (currentSession = session) => {
    if (!currentSession?.documento) return;
    setLoading(true);
    try {
      const resumo = await fetchPortalDonCorResumo(currentSession.documento);
      const chat = await fetchPortalDonCorChat({ documento: currentSession.documento, empresa: currentSession.empresa });
      setPayload(resumo);
      setMessages(chat || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Não foi possível carregar o Portal do Cliente.');
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { loadPortal(); }, [loadPortal]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginPortalDonCor({ documento, senha });
      setSession(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSenha('');
      if (data.primeiroAcesso) {
        setShowPassBox(true);
        setPassMsg('Primeiro acesso confirmado. Você pode trocar sua senha agora.');
      }
      await loadPortal(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'CPF/CNPJ ou senha inválidos.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setPayload(null);
    setMessages([]);
    setDocumento('');
    setSenha('');
    setShowPassBox(false);
  };

  const handleChangePass = async () => {
    setError('');
    setPassMsg('');
    if (!senhaAtual || !novaSenha) return setError('Informe a senha atual e a nova senha.');
    if (novaSenha.length < 6) return setError('A nova senha deve ter pelo menos 6 caracteres.');
    if (novaSenha !== confirmaSenha) return setError('A confirmação da nova senha não confere.');
    try {
      await alterarSenhaPortalDonCor({ documento: session.documento, senhaAtual, novaSenha });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmaSenha('');
      setShowPassBox(false);
      setPassMsg('Senha alterada com sucesso.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Não foi possível alterar a senha.');
    }
  };

  const sendMessage = async () => {
    if (!session || (!message.trim() && !attachment)) return;
    const saved = await sendPortalDonCorChat({ documento: session.documento, empresa, text: message.trim(), attachmentName: attachment?.name || '', attachmentSize: attachment?.size || 0, sender: empresa, senderRole: 'portal' });
    setMessages((items) => [...items, saved]);
    setMessage('');
    setAttachment(null);
  };

  const faturas = useMemo(() => payload?.faturas || [], [payload]);
  const boletos = useMemo(() => payload?.boletos || [], [payload]);
  const analitico = useMemo(() => payload?.analitico || [], [payload]);
  const totalAnalitico = useMemo(() => analitico.reduce((sum, item) => sum + (Number(item.valorNumerico) || 0), 0), [analitico]);
  const maxAnalitico = useMemo(() => Math.max(...analitico.map((item) => Number(item.valorNumerico) || 0), 1), [analitico]);
  const contratos = useMemo(() => {
    const map = new Map();
    faturas.forEach((item) => {
      const key = item.contrato || item.numero || 'Contrato';
      if (!map.has(key)) map.set(key, { contrato: key, plano: item.seguradora || 'Plano empresarial', seguradora: item.seguradora || '-', status: 'Ativo', vigencia: item.competencia || '-', vidas: item.vidas || '-' });
    });
    if (map.size === 0 && payload?.resumo?.contratos) map.set('Contrato Principal', { contrato: 'Contrato Principal', plano: 'Plano empresarial', seguradora: 'DonCor', status: 'Ativo', vigencia: '-', vidas: '-' });
    return Array.from(map.values());
  }, [faturas, payload]);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 460px)', background: theme.bg }}>
        <div style={{ background: `linear-gradient(135deg, ${theme.navy} 0%, ${theme.primary} 100%)`, color: '#fff', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}><div style={{ width: 48, height: 48, borderRadius: 16, background: '#ffffff1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={26} /></div><div><div style={{ fontSize: '1.1rem', fontWeight: 900 }}>Portal do Cliente</div><div style={{ opacity: 0.78, fontSize: '0.82rem' }}>Gestão de apólices e benefícios</div></div></div>
            <h1 style={{ fontSize: '2.4rem', lineHeight: 1.08, margin: '0 0 18px', maxWidth: 620 }}>Acompanhe contratos, faturas, movimentações e atendimento em um só lugar.</h1>
            <p style={{ maxWidth: 540, opacity: 0.82, fontSize: '1rem', lineHeight: 1.6 }}>Área exclusiva para empresas e parceiros cadastrados consultarem boletos, histórico financeiro, relatórios e abrirem solicitações com a equipe.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 720 }}>{[['Contratos', FolderOpen], ['Faturas', Receipt], ['Chat', MessageCircle]].map(([label, Icon]) => <div key={label} style={{ border: '1px solid #ffffff25', borderRadius: 16, padding: 14, background: '#ffffff12' }}><Icon size={18}/><div style={{ marginTop: 8, fontWeight: 800 }}>{label}</div></div>)}</div>
        </div>
        <div style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleLogin} style={{ width: '100%', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 22, padding: 30, boxShadow: '0 24px 70px rgba(15,23,42,0.12)' }}>
            <div style={{ marginBottom: 24 }}><div style={{ width: 58, height: 58, borderRadius: 18, background: theme.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, marginBottom: 14 }}>PC</div><h2 style={{ margin: 0, fontSize: '1.55rem', color: theme.text }}>Entrar no Portal do Cliente</h2><p style={{ margin: '8px 0 0', color: theme.muted, fontSize: '0.9rem' }}>Use o CNPJ/CPF vinculado e sua senha de acesso.</p></div>
            {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{error}</div>}
            {showForgot && <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', color:'#9a3412', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.82rem' }}>Se esqueceu sua senha, entre em contato com a DonCor para redefinir o acesso.</div>}
            <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>CNPJ ou CPF vinculado</label><Input value={documento} onChange={(event) => setDocumento(event.target.value)} placeholder="Digite o CNPJ da empresa ou CPF" style={{ marginBottom:12 }} />
            <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>Senha</label><Input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" style={{ marginBottom:10 }} />
            <button type="button" onClick={() => setShowForgot(true)} style={{ border:0, background:'transparent', color:theme.blue, cursor:'pointer', fontSize:'0.78rem', marginBottom:14, padding:0 }}>Esqueci minha senha</button>
            <Button type="submit" disabled={loading} style={{ width:'100%', background:theme.blue, color:'#fff', fontWeight:900 }}>{loading ? 'Validando...' : 'Entrar no Portal do Cliente'}</Button>
          </form>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <>
      <SectionTitle title={`Bem-vindo ao seu Portal, ${empresa}`} subtitle="Resumo das suas informações e operações ativas hoje." action={<Button onClick={() => setActiveSection('solicitacoes')} style={{ background: theme.blue, color: '#fff', display: 'flex', gap: 8 }}><FileText size={15}/>Novo chamado</Button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:14, marginBottom:16 }}><StatCard title="Contratos vigentes" value={payload?.resumo?.contratos || contratos.length || 0} subtitle="Ativos" icon={FolderOpen}/><StatCard title="Faturas em aberto" value={payload?.resumo?.faturas || faturas.length || 0} subtitle="Vencimentos próximos" icon={Receipt} tone={theme.warning}/><StatCard title="Boletos disponíveis" value={payload?.resumo?.boletos || boletos.length || 0} subtitle="PDFs no sistema" icon={Download} tone={theme.ok}/><StatCard title="Total faturado" value={payload?.resumo?.totalFaturado || money(totalAnalitico)} subtitle="Base analítica" icon={BarChart3} tone={theme.primary}/></div>
      <div style={{ display:'grid', gridTemplateColumns:'1.35fr 0.65fr', gap:16 }}><section style={{ ...card, padding:18 }}><SectionTitle title="Resumo Operacional" subtitle="Evolução financeira por competência." />{analitico.length === 0 ? <EmptyState>Os dados analíticos serão exibidos assim que houver faturamento vinculado.</EmptyState> : analitico.map((item) => <div key={item.competencia} style={{ marginBottom:12 }}><div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.84rem', color:theme.text, fontWeight:800 }}><span>{item.competencia}</span><span>{item.valor}</span></div><div style={{ height:10, background:'#edf2f7', borderRadius:999, overflow:'hidden', marginTop:6 }}><div style={{ width:`${Math.max((item.valorNumerico / maxAnalitico) * 100, 4)}%`, height:'100%', background:`linear-gradient(90deg, ${theme.blue}, ${theme.primary})` }} /></div></div>)}</section><section style={{ ...card, padding:18 }}><SectionTitle title="Precisa de ajuda?" subtitle="Fale com um especialista da equipe." /><div style={{ display:'flex', alignItems:'center', gap:12, padding:14, borderRadius:14, background:'#eff6ff' }}><LifeBuoy color={theme.blue}/><div><strong style={{ color:theme.text }}>Atendimento online</strong><div style={{ color:theme.muted, fontSize:'0.8rem' }}>Envie mensagens e documentos pelo chat.</div></div></div><Button onClick={() => setActiveSection('chat')} style={{ width:'100%', marginTop:14, background:theme.primary, color:'#fff', display:'flex', gap:8 }}><MessageCircle size={15}/>Fale com seu especialista</Button></section></div>
    </>
  );

  const renderContratos = () => (
    <div>
      <SectionTitle 
        title="Contratos Vigentes" 
        subtitle="Gerencie suas apólices, vigência e status de todos os contratos."
        action={<Button style={{ background: theme.blue, color: '#fff' }}><FileText size={14}/> Novo Chamado</Button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
        {contratos.map((item, idx) => (
          <div key={item.contrato} style={{ ...card, padding: 20, borderTop: `4px solid ${[theme.primary, theme.warning, theme.ok][idx % 3]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ color: theme.muted, fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>CONTRATO</div>
                <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{item.contrato}</h3>
              </div>
              <StatusPill status={item.status} />
            </div>
            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.8rem' }}>
                <span style={{ color: theme.muted }}>Plano:</span>
                <strong style={{ color: theme.text }}>{item.plano}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.8rem' }}>
                <span style={{ color: theme.muted }}>Vigência:</span>
                <strong style={{ color: theme.text }}>{item.vigencia}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: theme.muted }}>Vidas:</span>
                <strong style={{ color: theme.text, fontSize: '1.25rem' }}>{item.vidas}</strong>
              </div>
            </div>
            <Button variant="outline" style={{ width: '100%', marginTop: 14, fontSize: '0.8rem' }}><Eye size={14}/> Visualizar</Button>
          </div>
        ))}
      </div>
      
      <section style={{ ...card, padding: 18 }}>
        <SectionTitle title="Detalhes dos Contratos" subtitle="Visualize informações completas com filtros avançados." />
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
            <Input placeholder="Filtrar por número ou plano..." style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
          </div>
          <select style={{ ...selectStyle, maxWidth: 200 }}>
            <option>Status: Todos</option>
            <option>Ativo</option>
            <option>Vencido</option>
          </select>
          <select style={{ ...selectStyle, maxWidth: 200 }}>
            <option>Vigência: Todas</option>
            <option>Próximos 30 dias</option>
            <option>Próximos 90 dias</option>
          </select>
        </div>
        <table className="data-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
              <th style={{ textAlign: 'left' }}>Número do Contrato</th>
              <th style={{ textAlign: 'left' }}>Plano</th>
              <th style={{ textAlign: 'left' }}>Vigência</th>
              <th style={{ textAlign: 'left' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((item) => (
              <tr key={item.contrato} style={{ borderBottom: `1px solid ${theme.border}`, hover: { background: '#f8fafc' } }}>
                <td style={{ fontWeight: 600, color: theme.primary }}>{item.contrato}</td>
                <td>{item.plano}</td>
                <td>{item.vigencia}</td>
                <td><StatusPill status={item.status}/></td>
                <td style={{ textAlign: 'center' }}>
                  <button style={{ border: 0, background: 'transparent', color: theme.blue, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderFaturas = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <SectionTitle 
        title="Gestão de Faturas e Boletos" 
        subtitle="Acompanhe pagamentos, competências, vencimentos e downloads de boletos."
        action={<Button style={{ background: theme.blue, color: '#fff' }}><Download size={14}/> Segunda via agrupada</Button>}
      />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <div style={{ ...card, padding: 16, borderLeft: `4px solid ${theme.primary}` }}>
          <div style={{ color: theme.muted, fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>FATURAS ABERTAS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.primary, marginBottom: 4 }}>R$ 14.520,00</div>
          <div style={{ color: theme.muted, fontSize: '0.75rem' }}>Total faturado neste mês</div>
        </div>
        <div style={{ ...card, padding: 16, borderLeft: `4px solid ${theme.warning}` }}>
          <div style={{ color: theme.muted, fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>PRÓXIMOS VENCIMENTOS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.warning, marginBottom: 4 }}>R$ 15 NOS</div>
          <div style={{ color: theme.muted, fontSize: '0.75rem' }}>Valor dos documentos próximos a vencer</div>
        </div>
        <div style={{ ...card, padding: 16, borderLeft: `4px solid ${theme.ok}` }}>
          <div style={{ color: theme.muted, fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>TOTAL ANUAL</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.ok, marginBottom: 4 }}>R$ 158.400,00</div>
          <div style={{ color: theme.muted, fontSize: '0.75rem' }}>Projeção para o exercício</div>
        </div>
      </div>

      <section style={{ ...card, padding: 18 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: '0.95rem', fontWeight: 700 }}>Histórico de Faturas</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
              <Input placeholder="Buscar por contrato ou competência..." style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
            </div>
            <select style={{ ...selectStyle, maxWidth: 150 }}>
              <option>Status: Todos</option>
              <option>Aberta</option>
              <option>Paga</option>
              <option>Vencida</option>
            </select>
          </div>
        </div>
        <table className="data-table" style={{ fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
              <th style={{ textAlign: 'left' }}>Número</th>
              <th style={{ textAlign: 'left' }}>Contrato</th>
              <th style={{ textAlign: 'left' }}>Seguradora</th>
              <th style={{ textAlign: 'left' }}>Competência</th>
              <th style={{ textAlign: 'left' }}>Vencimento</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th style={{ textAlign: 'left' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {faturas.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ fontWeight: 600, color: theme.primary }}>{item.numero}</td>
                <td>{item.contrato}</td>
                <td>{item.seguradora}</td>
                <td>{item.competencia}</td>
                <td>{item.vencimento}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.valor}</td>
                <td><StatusPill status={item.status}/></td>
                <td style={{ textAlign: 'center' }}>
                  <button style={{ border: 0, background: 'transparent', color: theme.blue, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>
                    <Download size={14} /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {faturas.length === 0 && <EmptyState>Nenhuma fatura encontrada.</EmptyState>}
      </section>

      <section style={{ ...card, padding: 18 }}>
        <h3 style={{ margin: '0 0 12px', color: theme.text, fontSize: '0.95rem', fontWeight: 700 }}>Boletos Disponíveis</h3>
        <table className="data-table" style={{ fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
              <th style={{ textAlign: 'left' }}>Operadora</th>
              <th style={{ textAlign: 'left' }}>Competência</th>
              <th style={{ textAlign: 'left' }}>Arquivo</th>
              <th style={{ textAlign: 'left' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Download</th>
            </tr>
          </thead>
          <tbody>
            {boletos.map((item, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td>{item.operadora}</td>
                <td>{item.competencia}</td>
                <td style={{ color: theme.blue, fontWeight: 600 }}>{item.arquivo_nome || item.nome_arquivo}</td>
                <td><StatusPill status={item.status}/></td>
                <td style={{ textAlign: 'center' }}>
                  {item.arquivo_url ? (
                    <a href={item.arquivo_url} target="_blank" rel="noreferrer" style={{ color: theme.blue, fontWeight: 700, textDecoration: 'none', fontSize: '0.8rem' }}>
                      <Download size={14} style={{ display: 'inline-block' }} /> Abrir PDF
                    </a>
                  ) : (
                    <span style={{ color: theme.muted, fontSize: '0.8rem' }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {boletos.length === 0 && <EmptyState>Nenhum boleto disponível.</EmptyState>}
      </section>
    </div>
  );

  const renderBi = () => (
    <div>
      <SectionTitle 
        title="Sinistralidade e BI" 
        subtitle="Área para relatórios estratégicos, análises e acompanhamento analítico de sua carteira."
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={{ ...card, padding: 18 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ margin: '0 0 6px', color: theme.text, fontSize: '0.95rem', fontWeight: 700 }}>Upload de Relatórios BI</h3>
            <p style={{ margin: 0, color: theme.muted, fontSize: '0.8rem' }}>Formatos aceitos: PDF, XLSX, CSV</p>
          </div>
          <div style={{ border: `2px dashed ${theme.border}`, borderRadius: 16, padding: 28, textAlign: 'center', background: '#f8fafc' }}>
            <UploadCloud size={36} color={theme.blue} />
            <h4 style={{ margin: '12px 0 4px', color: theme.text }}>Arraste ou selecione arquivo</h4>
            <p style={{ margin: '0 0 16px', color: theme.muted, fontSize: '0.8rem' }}>Clique para abrir o explorador de arquivos do seu computador</p>
            <label style={{ display: 'inline-block' }}>
              <Button style={{ background: theme.blue, color: '#fff', cursor: 'pointer' }}>
                <UploadCloud size={14} /> Selecionar arquivo
              </Button>
              <Input type="file" onChange={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  console.log('Arquivo selecionado:', file.name);
                }
              }} style={{ display: 'none' }} />
            </label>
          </div>
        </section>

        <section style={{ ...card, padding: 18 }}>
          <h3 style={{ margin: '0 0 14px', color: theme.text, fontSize: '0.95rem', fontWeight: 700 }}>Histórico de Relatórios</h3>
          <p style={{ margin: '0 0 14px', color: theme.muted, fontSize: '0.8rem' }}>Últimos documentos processados pelo BI</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { name: 'Relatório de Sinistralidade Q2 2023.pdf', size: '3,2 MB', date: '15/01/2023' },
              { name: 'Base_Sinistro_Carência_Final.xlsx', size: '1,1 MB', date: '15/01/2023' },
              { name: 'Base_Histórico_jan_e_Jun_2023.csv', size: '0,8 MB', date: '15/01/2023' },
              { name: 'Relatório_Sinistralidade_Q2_2023.pdf', size: '2,2 MB', date: '15/01/2023' }
            ].map((file, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: `1px solid ${theme.border}`, borderRadius: 10, background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText color={theme.blue} size={16} />
                  <div>
                    <div style={{ color: theme.text, fontWeight: 600, fontSize: '0.85rem' }}>{file.name}</div>
                    <div style={{ color: theme.muted, fontSize: '0.7rem' }}>{file.size} • {file.date}</div>
                  </div>
                </div>
                <Download size={16} color={theme.muted} style={{ cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ ...card, padding: 22, marginTop: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px', color: theme.text, fontSize: '0.95rem', fontWeight: 700 }}>
            <Activity size={16} style={{ display: 'inline-block', marginRight: 8 }} />
            Novo Relatório
          </h3>
          <p style={{ margin: 0, color: theme.muted, fontSize: '0.8rem' }}>Solicite um novo relatório customizado para sua análise</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
          <div>
            <label style={{ ...fieldLabel }}>Tipo de Relatório</label>
            <select style={selectStyle}>
              <option>Selecione o tipo de relatório</option>
              <option>Sinistralidade</option>
              <option>Faturamento</option>
              <option>Utilização</option>
              <option>Análise Estatística</option>
            </select>
          </div>
          <div>
            <label style={{ ...fieldLabel }}>Período</label>
            <Input type="month" />
          </div>
          <Button style={{ background: theme.primary, color: '#fff', height: '40px' }}>Solicitar</Button>
        </div>
      </section>
    </div>
  );

  const fieldLabel = { display:'block', color:theme.text, fontWeight:800, fontSize:'0.74rem', marginBottom:6, letterSpacing:'0.02em' };
  const selectStyle = { width:'100%', border:`1px solid ${theme.border}`, borderRadius:9, padding:'11px 12px', background:'#fff', color:theme.text, fontSize:'0.92rem' };
  const checkboxRow = { display:'flex', alignItems:'center', gap:8, color:theme.text, fontSize:'0.92rem' };
  const radioCard = { border:`1px solid ${theme.border}`, borderRadius:10, padding:14, background:'#fff', display:'flex', gap:10, alignItems:'flex-start' };
  const uploadBox = <div style={{ border:'2px dashed #d5dcec', borderRadius:12, background:'#f8faff', padding:28, textAlign:'center', color:theme.text }}><UploadCloud size={26} color={theme.muted}/><div style={{ marginTop:8, fontWeight:800 }}>Arraste e solte os arquivos aqui</div><div style={{ color:theme.muted, fontSize:'0.82rem', marginTop:4 }}>ou clique para selecionar no computador</div><Button variant="outline" style={{ marginTop:12 }}>Selecionar Arquivos</Button></div>;

  const renderInclusao = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.95fr', gap: 22 }}>
      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={fieldLabel}>Operadora *</label>
              <select style={selectStyle}>
                <option>Selecione a Operadora</option>
                <option>Assim Saúde</option>
                <option>Amil</option>
                <option>SulAmérica</option>
                <option>Bradesco Saúde</option>
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Plano *</label>
              <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
                <label style={checkboxRow}><input type="checkbox" defaultChecked /> Saúde</label>
                <label style={checkboxRow}><input type="checkbox" /> Dental</label>
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={20}/> Dados do Beneficiário
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>Nome Completo *</label>
              <Input placeholder="Ex: João da Silva" />
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input placeholder="000.000.000-00" />
            </div>
            <div>
              <label style={fieldLabel}>Data de Nascimento *</label>
              <Input type="date" />
            </div>
            <div>
              <label style={fieldLabel}>Estado Civil *</label>
              <select style={selectStyle}>
                <option>Selecione</option>
                <option>Solteiro(a)</option>
                <option>Casado(a)</option>
                <option>Divorciado(a)</option>
                <option>Viúvo(a)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>E-mail *</label>
              <Input placeholder="email@exemplo.com" type="email" />
            </div>
            <div>
              <label style={fieldLabel}>Telefone *</label>
              <Input placeholder="(11) 90000-0000" />
            </div>
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gap: 22, alignContent: 'start' }}>
        <section style={{ ...card, padding: 24, background: '#eef4ff', border: `1px solid #bad3ff` }}>
          <h3 style={{ color: theme.primary, margin: '0 0 18px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={20}/> Tipo de Inclusão
          </h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ ...radioCard, alignItems: 'flex-start' }}>
              <input type="radio" name="tipo-inclusao" defaultChecked />
              <div>
                <strong style={{ color: theme.text }}>No vencimento</strong>
                <div style={{ color: theme.muted, marginTop: 4, fontSize: '0.82rem' }}>Inclusão programada para a próxima fatura.</div>
              </div>
            </label>
            <label style={{ ...radioCard, alignItems: 'flex-start', background: '#fff' }}>
              <input type="radio" name="tipo-inclusao"/>
              <div>
                <strong style={{ color: theme.text }}>Imediato</strong>
                <div style={{ color: theme.muted, marginTop: 6 }}>
                  <span style={{ background: '#fed7aa', color: '#9a3412', fontSize: '0.7rem', fontWeight: 900, borderRadius: 6, padding: '3px 7px' }}>⚠️ ATENÇÃO</span>
                </div>
                <div style={{ color: theme.text, marginTop: 8, fontSize: '0.84rem' }}>Sujeito a regras de pró-rata conforme a operadora.</div>
              </div>
            </label>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Paperclip size={20}/> Anexos Necessários
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, display: 'grid', gap: 12 }}>
            {['RG / CPF', 'Comprovante de Residência', 'CTPS / eSocial', 'Formulário Assinado'].map((doc) => (
              <label key={doc} style={{ ...checkboxRow, border: `1px solid ${theme.border}`, padding: '12px 14px', borderRadius: 10, justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>
                  <input type="checkbox" style={{ marginRight: 10 }} />
                  {doc}
                </span>
                <UploadCloud size={18} color={theme.muted} />
              </label>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" style={{ flex: 1 }}>Cancelar</Button>
          <Button style={{ flex: 1, background: theme.primary, color: '#fff' }}>Enviar Solicitação</Button>
        </div>
      </div>
    </div>
  );

  const renderExclusao = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.95fr', gap: 22 }}>
      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={fieldLabel}>Operadora *</label>
              <select style={selectStyle}>
                <option>Selecione a operadora</option>
                <option>Assim Saúde</option>
                <option>Amil</option>
                <option>SulAmérica</option>
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Plano *</label>
              <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
                <label style={checkboxRow}><input type="checkbox" defaultChecked /> Dental</label>
                <label style={checkboxRow}><input type="checkbox" /> Saúde</label>
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserMinus size={20}/> Dados do Beneficiário
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>Nome Completo *</label>
              <Input placeholder="Nome do beneficiário" />
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input placeholder="000.000.000-00" />
            </div>
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gap: 22, alignContent: 'start' }}>
        <section style={{ ...card, padding: 24, background: '#eef4ff', border: `1px solid #bad3ff` }}>
          <h3 style={{ color: theme.primary, margin: '0 0 18px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={20}/> Tipo de Exclusão
          </h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ ...radioCard, alignItems: 'flex-start' }}>
              <input type="radio" name="tipo-exclusao" defaultChecked />
              <div>
                <strong style={{ color: theme.text }}>No vencimento</strong>
                <div style={{ color: theme.muted, marginTop: 4, fontSize: '0.82rem' }}>A exclusão ocorrerá na data de aniversário do contrato.</div>
              </div>
            </label>
            <label style={{ ...radioCard, alignItems: 'flex-start', background: '#fff' }}>
              <input type="radio" name="tipo-exclusao"/>
              <div>
                <strong style={{ color: theme.text }}>Imediato</strong>
                <div style={{ color: theme.muted, marginTop: 6 }}>
                  <span style={{ background: '#fed7aa', color: '#9a3412', fontSize: '0.7rem', fontWeight: 900, borderRadius: 6, padding: '3px 7px' }}>ATENÇÃO</span>
                </div>
                <div style={{ color: theme.text, marginTop: 8, fontSize: '0.84rem' }}>Pode estar sujeita a multas ou restrições contratuais.</div>
              </div>
            </label>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Paperclip size={20}/> Anexos Necessários
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, display: 'grid', gap: 12 }}>
            {['Termo de Rescisão', 'Formulário de Exclusão Assinado'].map((doc) => (
              <label key={doc} style={{ ...checkboxRow, border: `1px solid ${theme.border}`, padding: '12px 14px', borderRadius: 10, justifyContent: 'space-between', cursor: 'pointer' }}>
                <span>
                  <input type="checkbox" style={{ marginRight: 10 }} />
                  {doc}
                </span>
                <UploadCloud size={18} color={theme.muted} />
              </label>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" style={{ flex: 1 }}>Cancelar</Button>
          <Button style={{ flex: 1, background: theme.primary, color: '#fff' }}>Enviar Solicitação</Button>
        </div>
      </div>
    </div>
  );

  const renderAlteracao = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.95fr', gap: 22 }}>
      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <label style={{ ...radioCard, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked/>
              <div>
                <strong style={{ color: theme.text }}>Saúde</strong>
                <div style={{ color: theme.muted, fontSize: '0.82rem' }}>Apólice nº 987654321</div>
              </div>
            </label>
            <label style={{ ...radioCard, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox"/>
              <div>
                <strong style={{ color: theme.text }}>Dental</strong>
                <div style={{ color: theme.muted, fontSize: '0.82rem' }}>Apólice nº 123456789</div>
              </div>
            </label>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20}/> Detalhes da Alteração
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18 }}>
            <label style={fieldLabel}>Descreva a alteração *</label>
            <textarea
              placeholder="Descreva os dados que precisam ser alterados ou as especificações do upgrade/downgrade..."
              style={{
                width: '100%',
                minHeight: 128,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: 14,
                fontFamily: 'inherit',
                fontSize: '0.92rem',
                color: theme.text,
                resize: 'vertical'
              }}
            />
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gap: 22, alignContent: 'start' }}>
        <section style={{ ...card, padding: 24, background: '#eef4ff', border: `1px solid #bad3ff` }}>
          <h3 style={{ color: theme.primary, margin: '0 0 18px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={20}/> Tipo de Solicitação
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {['Alteração Cadastral', 'Upgrade', 'Downgrade', 'Outros'].map((tipo, index) => (
              <label key={tipo} style={{ ...radioCard, alignItems: 'center', cursor: 'pointer', background: index === 0 ? '#fff' : '#f8faff' }}>
                <input type="checkbox" defaultChecked={index === 0} />
                <span style={{ fontWeight: 700, color: theme.text, fontSize: '0.88rem' }}>{tipo}</span>
              </label>
            ))}
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Paperclip size={20}/> Anexos
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
            {uploadBox}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${theme.border}`, borderRadius: 10, padding: '12px 14px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={20} color={theme.muted}/>
                <div>
                  <strong style={{ color: theme.text, fontSize: '0.86rem' }}>comprovante_residencia.pdf</strong>
                  <div style={{ color: theme.muted, fontSize: '0.75rem' }}>1.2 MB</div>
                </div>
              </div>
              <button style={{ border: 0, background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 900 }}>Remover</button>
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" style={{ flex: 1 }}>Cancelar</Button>
          <Button style={{ flex: 1, background: theme.primary, color: '#fff' }}>Enviar Solicitação</Button>
        </div>
      </div>
    </div>
  );

  const renderMovimentacao = () => <div><SectionTitle title="Movimentação" subtitle="Gerencie inclusões, exclusões e alterações de beneficiários." /><div style={{ display:'flex', gap:34, borderBottom:`1px solid ${theme.border}`, marginBottom:26 }}>{[['inclusao','Inclusão'], ['exclusao','Exclusão'], ['alteracao','Alteração']].map(([id, label]) => <button key={id} onClick={() => setActiveMovementTab(id)} style={{ border:0, background:'transparent', cursor:'pointer', padding:'0 0 14px', color:activeMovementTab === id ? theme.primary : theme.text, borderBottom:activeMovementTab === id ? `2px solid ${theme.blue}` : '2px solid transparent', fontWeight:activeMovementTab === id ? 900 : 500, fontSize:'1rem' }}>{label}</button>)}</div>{activeMovementTab === 'inclusao' && renderInclusao()}{activeMovementTab === 'exclusao' && renderExclusao()}{activeMovementTab === 'alteracao' && renderAlteracao()}<button onClick={() => setActiveSection('chat')} style={{ position:'fixed', right:28, bottom:28, width:54, height:54, borderRadius:14, border:0, background:theme.primary, color:'#fff', boxShadow:'0 10px 25px rgba(0,45,105,.25)', cursor:'pointer' }}><MessageCircle size={22}/></button></div>;

  const renderSolicitacoes = () => (
    <div>
      <SectionTitle 
        title="Solicitações" 
        subtitle="Acompanhe o histórico e status de todas as suas demandas."
        action={<Button style={{ background: theme.blue, color: '#fff' }}><FileText size={14}/> Nova Solicitação</Button>}
      />
      <section style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
            <Input placeholder="Buscar por protocolo, CPF ou descrição..." style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
          </div>
          <select style={{ ...selectStyle, maxWidth: 150 }}>
            <option>Tipo: Todos</option>
            <option>Inclusão</option>
            <option>Exclusão</option>
            <option>Alteração</option>
          </select>
          <select style={{ ...selectStyle, maxWidth: 150 }}>
            <option>Status: Todos</option>
            <option>Aberto</option>
            <option>Em Andamento</option>
            <option>Concluído</option>
          </select>
        </div>
        <table className="data-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
              <th style={{ textAlign: 'left' }}>Tipo</th>
              <th style={{ textAlign: 'left' }}>Protocolo</th>
              <th style={{ textAlign: 'left' }}>Descrição</th>
              <th style={{ textAlign: 'left' }}>CPF</th>
              <th style={{ textAlign: 'left' }}>Data Reativação</th>
              <th style={{ textAlign: 'left' }}>Data Conclusão</th>
              <th style={{ textAlign: 'left' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {['Inclusão', 'Alteração', 'Exclusão'].map((tipo, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ fontWeight: 600 }}>{tipo}</td>
                <td style={{ color: theme.primary, fontWeight: 700 }}>#CLI-{String(idx + 1).padStart(4, '0')}</td>
                <td>{tipo === 'Inclusão' ? 'Novo beneficiário' : tipo === 'Exclusão' ? 'Remoção de dependente' : 'Atualização cadastral'}</td>
                <td>000.000.000-00</td>
                <td>{new Date().toLocaleDateString('pt-BR')}</td>
                <td style={{ color: theme.muted }}>-</td>
                <td><StatusPill status={idx === 0 ? 'Aberto' : 'Em andamento'}/></td>
                <td style={{ textAlign: 'center' }}>
                  <Button variant="outline" size="sm" onClick={() => setActiveSection('chat')} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    <MessageCircle size={13}/> Chat
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderFormularios = () => (
    <div>
      <SectionTitle 
        title="Formulários e Manuais" 
        subtitle="Documentos operacionais, regras e materiais de apoio para gestão do seu plano."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { title: 'Formulários de Movimentação', icon: '📋', docs: ['Guia de Inclusão - Tabela A', 'Guia de Inclusão - Tabela B'] },
          { title: 'Tabelas de Reembolso', icon: '📊', docs: ['Tabela de Reembolso', 'Valores de Carência'] },
          { title: 'Informações de Carência', icon: '⏱️', docs: ['Tabela de Carência 2024', 'Aviso Carencial']},
          { title: 'Regras de Coparticipação', icon: '⚖️', docs: ['Comunicado Regras', 'Tabela Atualizada'] },
          { title: 'Coberturas e Exclusões', icon: '📄', docs: ['Cobertura Completa', 'Itens Excluídos'] },
          { title: 'Manuais Operacionais', icon: '📘', docs: ['Manual do Participante', 'Guia Prático'] }
        ].map((section, idx) => (
          <section key={idx} style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{section.icon}</div>
            <h3 style={{ margin: '0 0 12px', color: theme.text, fontWeight: 700, fontSize: '0.95rem' }}>{section.title}</h3>
            <p style={{ margin: '0 0 12px', color: theme.muted, fontSize: '0.75rem' }}>Documentos necessários para atendimento.</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {section.docs.map((doc, docIdx) => (
                <div key={docIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: docIdx === 0 ? `1px solid ${theme.border}` : 'none', paddingTop: docIdx === 0 ? 8 : 0 }}>
                  <span style={{ color: theme.text, fontSize: '0.8rem', fontWeight: 600 }}>
                    <FileText size={12} style={{ display: 'inline', marginRight: 6 }} /> {doc}
                  </span>
                  <Download size={14} color={theme.blue} style={{ cursor: 'pointer' }} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section style={{ ...card, padding: 22 }}>
        <div style={{ borderBottom: `2px solid ${theme.border}`, paddingBottom: 16, marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: theme.text, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={20} color={theme.primary} />
            Regras de Coparticipação
          </h3>
          <p style={{ margin: '8px 0 0', color: theme.muted, fontSize: '0.85rem' }}>As regras de franquia e coparticipação valem para procedimentos clínicos e cirúrgicos em redes credenciadas.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: theme.muted, fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>EXEMPLO DE COPARTICIPAÇÃO</div>
              <div style={{ fontSize: '0.9rem', color: theme.text, lineHeight: 1.6 }}>
                <strong>Consulta:</strong> R$ 35,00 ou 10% do valor (o que for menor)<br/>
                <strong>Exames:</strong> R$ 50,00 ou 20% do valor (o que for menor)<br/>
                <strong>Internação:</strong> R$ 200,00 por dia
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline">Visualizar Detalhes</Button>
            <Button style={{ background: theme.primary, color: '#fff' }}>Baixar Documento</Button>
          </div>
        </div>
      </section>
    </div>
  );

  const renderChat = () => <section style={{ ...card, minHeight:560, display:'flex', flexDirection:'column', overflow:'hidden' }}><div style={{ padding:'16px 18px', borderBottom:`1px solid ${theme.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}><div style={{ display:'flex', alignItems:'center', gap:10, color:theme.text, fontWeight:900 }}><MessageCircle size={18}/>Atendimento ao Cliente</div><StatusPill status="Online agora" /></div><div style={{ flex:1, padding:18, background:'#f8fafc', overflowY:'auto' }}>{messages.length === 0 ? <EmptyState>Nenhuma mensagem ainda. Envie sua primeira solicitação para a equipe.</EmptyState> : messages.map((item) => <div key={item.id} style={{ display:'flex', justifyContent:item.direction === 'incoming' ? 'flex-end' : 'flex-start', marginBottom:10 }}><div style={{ maxWidth:'72%', background:item.direction === 'incoming' ? theme.blue : '#fff', color:item.direction === 'incoming' ? '#fff' : theme.text, border:`1px solid ${theme.border}`, borderRadius:14, padding:'10px 12px' }}><div style={{ fontSize:'0.68rem', opacity:0.82, marginBottom:4 }}>{item.sender}</div>{item.text && <div style={{ fontSize:'0.88rem' }}>{item.text}</div>}{item.attachmentName && <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', fontWeight:800 }}><Paperclip size={13}/>{item.attachmentName}</div>}</div></div>)}</div><div style={{ padding:16, borderTop:`1px solid ${theme.border}` }}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Digite sua mensagem para o atendimento..." style={{ width:'100%', minHeight:86, border:`1px solid ${theme.border}`, borderRadius:12, padding:'10px 12px', resize:'vertical', fontFamily:'inherit', fontSize:'0.86rem' }} /><div style={{ display:'flex', justifyContent:'space-between', gap:10, marginTop:10 }}><label style={{ border:`1px solid ${theme.border}`, borderRadius:10, padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:theme.text, fontSize:'0.8rem' }}><Paperclip size={14}/> {attachment ? attachment.name : 'Anexar documento'}<Input type="file" onChange={(event) => setAttachment(event.target.files?.[0] || null)} style={{ display:'none' }} /></label><Button onClick={sendMessage} style={{ background:theme.blue, color:'#fff', display:'flex', gap:6 }}><Send size={14}/>Enviar</Button></div></div></section>;

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'contratos': return renderContratos();
      case 'faturas': return renderFaturas();
      case 'bi': return renderBi();
      case 'movimentacao': return renderMovimentacao();
      case 'solicitacoes': return renderSolicitacoes();
      case 'formularios': return renderFormularios();
      case 'chat': return renderChat();
      default: return renderDashboard();
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:theme.bg, display:'grid', gridTemplateColumns:'278px 1fr' }}>
      <aside style={{ background:theme.navy, color:'#fff', padding:20, display:'flex', flexDirection:'column', gap:18 }}><div style={{ display:'flex', alignItems:'center', gap:12, padding:'6px 4px 18px', borderBottom:'1px solid #ffffff1f' }}><div style={{ width:44, height:44, borderRadius:15, background:'#ffffff1f', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={24}/></div><div><div style={{ fontWeight:900, fontSize:'1.04rem' }}>{empresa}</div><div style={{ color:'#cbd5e1', fontSize:'0.75rem' }}>Portal do Cliente</div></div></div><Button onClick={() => setActiveSection('solicitacoes')} style={{ background:theme.blue, color:'#fff', justifyContent:'flex-start', gap:8 }}><FileText size={15}/>Novo chamado</Button><nav style={{ display:'grid', gap:6 }}>{menuItems.map((item) => <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ border:0, borderRadius:12, padding:'10px 12px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, background:activeSection === item.id ? '#ffffff18' : 'transparent', color:activeSection === item.id ? '#fff' : '#cbd5e1', fontWeight:activeSection === item.id ? 900 : 700 }}><item.icon size={17}/>{item.label}</button>)}</nav><div style={{ marginTop:'auto', borderTop:'1px solid #ffffff1f', paddingTop:14 }}><button onClick={handleLogout} style={{ width:'100%', border:0, background:'transparent', color:'#cbd5e1', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer', fontWeight:800 }}><LogOut size={17}/>Sair</button></div></aside>
      <div style={{ minWidth:0 }}><header style={{ background:'#fff', borderBottom:`1px solid ${theme.border}`, padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:5 }}><div style={{ display:'flex', alignItems:'center', gap:14 }}><div style={{ width:40, height:40, borderRadius:14, background:'#eff6ff', color:theme.blue, display:'flex', alignItems:'center', justifyContent:'center' }}><Building2 size={19}/></div><div><strong style={{ color:theme.text, fontSize:'1rem' }}>{empresa}</strong><div style={{ color:theme.muted, fontSize:'0.78rem' }}>{session.documento}</div></div></div><div style={{ width:420 }}><Input placeholder="Buscar..." /></div><div style={{ display:'flex', alignItems:'center', gap:8 }}><button style={{ border:`1px solid ${theme.border}`, background:'#fff', borderRadius:12, padding:9, color:theme.muted }}><Bell size={16}/></button><button style={{ border:`1px solid ${theme.border}`, background:'#fff', borderRadius:12, padding:9, color:theme.muted }}><HelpCircle size={16}/></button><Button variant="outline" onClick={() => setShowPassBox(!showPassBox)}>Alterar senha</Button></div></header><main style={{ padding:24, maxWidth:1320, margin:'0 auto' }}>{error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>{error}</div>}{passMsg && <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#047857', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{passMsg}</div>}{showPassBox && <section style={{ ...card, padding:16, marginBottom:16 }}><h2 style={{ fontSize:'1rem', color:theme.text, margin:'0 0 12px' }}>Alterar senha de acesso</h2><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, alignItems:'end' }}><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Senha atual</label><Input type="password" value={senhaAtual} onChange={(e)=>setSenhaAtual(e.target.value)} placeholder="Senha atual" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Nova senha</label><Input type="password" value={novaSenha} onChange={(e)=>setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Confirmar nova senha</label><Input type="password" value={confirmaSenha} onChange={(e)=>setConfirmaSenha(e.target.value)} placeholder="Repita a nova senha" /></div><Button onClick={handleChangePass} style={{ background:theme.blue, color:'#fff' }}>Salvar senha</Button></div></section>}{loading && <div style={{ marginBottom:14, color:theme.muted, display:'flex', alignItems:'center', gap:8 }}><Activity size={16}/>Atualizando informações do cliente...</div>}{renderActiveSection()}</main></div>
    </div>
  );
};

export default PortalDonCor;
