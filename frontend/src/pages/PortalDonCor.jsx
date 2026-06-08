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

  const faturas = payload?.faturas || [];
  const boletos = payload?.boletos || [];
  const analitico = payload?.analitico || [];
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

  const renderContratos = () => <section style={{ ...card, padding:18 }}><SectionTitle title="Meus Contratos" subtitle="Consulte contratos, planos, vigência e status." /><div style={{ display:'flex', gap:10, marginBottom:14 }}><Input placeholder="Buscar contrato, seguradora ou plano" /><Button variant="outline"><Search size={14}/></Button></div><table className="data-table"><thead><tr><th>Número do Contrato</th><th>Plano</th><th>Seguradora</th><th>Vigência</th><th>Vidas</th><th>Status</th><th>Ações</th></tr></thead><tbody>{contratos.map((item) => <tr key={item.contrato}><td>{item.contrato}</td><td>{item.plano}</td><td>{item.seguradora}</td><td>{item.vigencia}</td><td>{item.vidas}</td><td><StatusPill status={item.status}/></td><td><Button variant="outline" style={{ padding:'6px 10px' }}><Eye size={14}/> Ver</Button></td></tr>)}</tbody></table>{contratos.length === 0 && <EmptyState />}</section>;

  const renderFaturas = () => <div style={{ display:'grid', gap:16 }}><section style={{ ...card, padding:18 }}><SectionTitle title="Gestão de Faturas" subtitle="Gerencie pagamentos, competência e vencimento." action={<Button style={{ background:theme.blue, color:'#fff' }}><Download size={14}/> Segunda via agrupada</Button>} /><table className="data-table"><thead><tr><th>Número</th><th>Contrato</th><th>Seguradora</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>{faturas.map((item) => <tr key={item.id || item.numero}><td>{item.numero}</td><td>{item.contrato}</td><td>{item.seguradora}</td><td>{item.competencia}</td><td>{item.vencimento}</td><td>{item.valor}</td><td><StatusPill status={item.status}/></td></tr>)}</tbody></table>{faturas.length === 0 && <EmptyState>Nenhuma fatura encontrada para este acesso.</EmptyState>}</section><section style={{ ...card, padding:18 }}><SectionTitle title="Boletos baixados" subtitle="Arquivos PDF disponíveis para abertura e download." /><table className="data-table"><thead><tr><th>Operadora</th><th>Competência</th><th>Arquivo</th><th>Status</th><th>Abrir</th></tr></thead><tbody>{boletos.map((item) => <tr key={item.id || item.storage_path}><td>{item.operadora}</td><td>{item.competencia}</td><td>{item.arquivo_nome || item.nome_arquivo}</td><td><StatusPill status={item.status}/></td><td>{item.arquivo_url ? <a href={item.arquivo_url} target="_blank" rel="noreferrer" style={{ color:theme.blue, fontWeight:800 }}>Abrir PDF</a> : '-'}</td></tr>)}</tbody></table>{boletos.length === 0 && <EmptyState>Nenhum boleto disponível ainda.</EmptyState>}</section></div>;

  const renderBi = () => <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}><section style={{ ...card, padding:18 }}><SectionTitle title="Sinistralidade e BI" subtitle="Área para relatórios estratégicos e acompanhamento analítico." /><div style={{ border:'2px dashed #cbd5e1', borderRadius:18, padding:28, textAlign:'center', background:'#f8fafc' }}><UploadCloud size={34} color={theme.blue}/><h3 style={{ margin:'10px 0 4px', color:theme.text }}>Upload de Relatórios BI</h3><p style={{ margin:0, color:theme.muted, fontSize:'0.84rem' }}>Formatos aceitos: PDF, XLSX e CSV.</p><Button style={{ marginTop:14, background:theme.blue, color:'#fff' }}>Selecionar arquivo</Button></div></section><section style={{ ...card, padding:18 }}><SectionTitle title="Histórico de Relatórios" subtitle="Últimos documentos processados pelo BI." />{['Relatório de Sinistralidade', 'Base de Faturamento', 'Resumo de Utilização'].map((name) => <div key={name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:`1px solid ${theme.border}` }}><div style={{ display:'flex', alignItems:'center', gap:10 }}><FileText color={theme.blue}/><strong style={{ color:theme.text }}>{name}</strong></div><Download size={16} color={theme.muted}/></div>)}</section></div>;

  const renderMovimentacao = () => <div><SectionTitle title="Movimentação" subtitle="Solicite inclusão, exclusão ou alteração de beneficiários." /><div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:16 }}>{[{ title:'Nova Inclusão', icon:UserPlus, desc:'Cadastrar titular ou dependente no contrato.', fields:['Empresa','Nome completo','CPF','Data de nascimento','Telefone','E-mail'] }, { title:'Nova Exclusão', icon:UserMinus, desc:'Solicitar encerramento de vínculo.', fields:['Beneficiário','CPF','Data fim','Motivo'] }, { title:'Nova Alteração', icon:RefreshCw, desc:'Atualizar dados cadastrais ou contratuais.', fields:['Beneficiário','Campo alterado','Novo dado','Justificativa'] }].map(({ title, icon:Icon, desc, fields }) => <section key={title} style={{ ...card, padding:18 }}><div style={{ width:46, height:46, borderRadius:16, background:'#eff6ff', color:theme.blue, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon/></div><h3 style={{ color:theme.text, margin:'14px 0 6px' }}>{title}</h3><p style={{ color:theme.muted, fontSize:'0.84rem', minHeight:42 }}>{desc}</p><div style={{ display:'grid', gap:8, marginTop:12 }}>{fields.map((field) => <Input key={field} placeholder={field} />)}</div><Button style={{ width:'100%', marginTop:12, background:theme.blue, color:'#fff' }}>Enviar solicitação</Button></section>)}</div></div>;

  const renderSolicitacoes = () => <section style={{ ...card, padding:18 }}><SectionTitle title="Solicitações" subtitle="Acompanhe o histórico e o status das suas demandas." /><table className="data-table"><thead><tr><th>Tipo</th><th>Protocolo</th><th>Descrição</th><th>Status</th><th>Ações</th></tr></thead><tbody>{['Inclusão','Alteração','Exclusão'].map((tipo, idx) => <tr key={tipo}><td>{tipo}</td><td>#CLI-00{idx + 1}</td><td>{tipo === 'Inclusão' ? 'Novo beneficiário' : tipo === 'Exclusão' ? 'Remoção de dependente' : 'Atualização cadastral'}</td><td><StatusPill status={idx === 0 ? 'Aberto' : 'Em andamento'}/></td><td><Button variant="outline" onClick={() => setActiveSection('chat')}><MessageCircle size={14}/> Chat</Button></td></tr>)}</tbody></table></section>;

  const renderFormularios = () => <div><SectionTitle title="Formulários e Manuais" subtitle="Documentos operacionais, regras e materiais de apoio para gestão do plano." /><div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:16 }}>{['Formulários de Movimentação','Tabelas e Reembolso','Informações de Carência','Regras de Coparticipação'].map((title) => <section key={title} style={{ ...card, padding:18 }}><h3 style={{ margin:'0 0 12px', color:theme.text }}>{title}</h3>{['Visualizar documento','Baixar manual'].map((doc) => <div key={doc} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderTop:`1px solid ${theme.border}` }}><span style={{ color:theme.text, fontWeight:700 }}><FileText size={14}/> {doc}</span><Download size={16} color={theme.blue}/></div>)}</section>)}</div></div>;

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
      <aside style={{ background:theme.navy, color:'#fff', padding:20, display:'flex', flexDirection:'column', gap:18 }}><div style={{ display:'flex', alignItems:'center', gap:12, padding:'6px 4px 18px', borderBottom:'1px solid #ffffff1f' }}><div style={{ width:44, height:44, borderRadius:15, background:'#ffffff1f', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={24}/></div><div><div style={{ fontWeight:900, fontSize:'1.04rem' }}>Portal do Cliente</div><div style={{ color:'#cbd5e1', fontSize:'0.75rem' }}>DonCor</div></div></div><Button onClick={() => setActiveSection('solicitacoes')} style={{ background:theme.blue, color:'#fff', justifyContent:'flex-start', gap:8 }}><FileText size={15}/>Novo chamado</Button><nav style={{ display:'grid', gap:6 }}>{menuItems.map((item) => <button key={item.id} onClick={() => setActiveSection(item.id)} style={{ border:0, borderRadius:12, padding:'10px 12px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, background:activeSection === item.id ? '#ffffff18' : 'transparent', color:activeSection === item.id ? '#fff' : '#cbd5e1', fontWeight:activeSection === item.id ? 900 : 700 }}><item.icon size={17}/>{item.label}</button>)}</nav><div style={{ marginTop:'auto', borderTop:'1px solid #ffffff1f', paddingTop:14 }}><button onClick={handleLogout} style={{ width:'100%', border:0, background:'transparent', color:'#cbd5e1', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer', fontWeight:800 }}><LogOut size={17}/>Sair</button></div></aside>
      <div style={{ minWidth:0 }}><header style={{ background:'#fff', borderBottom:`1px solid ${theme.border}`, padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:5 }}><div style={{ display:'flex', alignItems:'center', gap:14 }}><div style={{ width:40, height:40, borderRadius:14, background:'#eff6ff', color:theme.blue, display:'flex', alignItems:'center', justifyContent:'center' }}><Building2 size={19}/></div><div><strong style={{ color:theme.text, fontSize:'1rem' }}>{empresa}</strong><div style={{ color:theme.muted, fontSize:'0.78rem' }}>{session.documento}</div></div></div><div style={{ display:'flex', alignItems:'center', gap:8 }}><button style={{ border:`1px solid ${theme.border}`, background:'#fff', borderRadius:12, padding:9, color:theme.muted }}><Bell size={16}/></button><button style={{ border:`1px solid ${theme.border}`, background:'#fff', borderRadius:12, padding:9, color:theme.muted }}><HelpCircle size={16}/></button><Button variant="outline" onClick={() => setShowPassBox(!showPassBox)}>Alterar senha</Button></div></header><main style={{ padding:24, maxWidth:1320, margin:'0 auto' }}>{error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>{error}</div>}{passMsg && <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#047857', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{passMsg}</div>}{showPassBox && <section style={{ ...card, padding:16, marginBottom:16 }}><h2 style={{ fontSize:'1rem', color:theme.text, margin:'0 0 12px' }}>Alterar senha de acesso</h2><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, alignItems:'end' }}><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Senha atual</label><Input type="password" value={senhaAtual} onChange={(e)=>setSenhaAtual(e.target.value)} placeholder="Senha atual" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Nova senha</label><Input type="password" value={novaSenha} onChange={(e)=>setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Confirmar nova senha</label><Input type="password" value={confirmaSenha} onChange={(e)=>setConfirmaSenha(e.target.value)} placeholder="Repita a nova senha" /></div><Button onClick={handleChangePass} style={{ background:theme.blue, color:'#fff' }}>Salvar senha</Button></div></section>}{loading && <div style={{ marginBottom:14, color:theme.muted, display:'flex', alignItems:'center', gap:8 }}><Activity size={16}/>Atualizando informações do cliente...</div>}{renderActiveSection()}</main></div>
    </div>
  );
};

export default PortalDonCor;
