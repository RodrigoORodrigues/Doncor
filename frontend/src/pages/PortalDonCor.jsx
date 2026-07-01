import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Bell, Building2, Download, Eye, FileText, FolderOpen, HelpCircle, Home, LogOut, MessageCircle, Paperclip, Receipt, RefreshCw, Search, Send, Shield, UploadCloud, UserMinus, UserPlus, User, Settings, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import DoncorLogo from '../components/DoncorLogo';
import api, {
  loginPortalDonCor,
  fetchPortalDonCorResumo,
  fetchPortalDonCorFormularios,
  fetchPortalDonCorSolicitacoes,
  createPortalDonCorMovimentacao,
  fetchPortalDonCorChat,
  getPortalFormularioDownloadUrl,
  sendPortalDonCorChat,
  alterarSenhaPortalDonCor,
  fetchPortalDonCorSinistralidade,
  getPortalSinistralidadeDownloadUrl,
  fetchLgpdConfig,
  saveLgpdConfig,
  fetchLgpdAceites,
  aceitarLgpd,
  markPortalDonCorChatRead
} from '../services/api';

const STORAGE_KEY = 'doncor_portal_cliente_session';
const PORTAL_REFRESH_MS = 30000;
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
  { id: 'faturas', label: 'Faturas', icon: Receipt },
  { id: 'bi', label: 'Sinistralidade e BI', icon: BarChart3 },
  { id: 'movimentacao', label: 'Movimentação', icon: RefreshCw },
  { id: 'solicitacoes', label: 'Solicitações', icon: FileText },
  { id: 'formularios', label: 'Formulários e Manuais', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

const movementSubItems = [
  { id: 'inclusao', label: 'Inclusão' },
  { id: 'exclusao', label: 'Exclusão' },
  { id: 'alteracao', label: 'Alteração' },
];

const movementPageContent = {
  inclusao: { title: 'Inclusão', subtitle: 'Gerencie suas inclusões' },
  exclusao: { title: 'Exclusão', subtitle: 'Gerencie suas exclusões' },
  alteracao: { title: 'Alteração', subtitle: 'Gerencie suas alterações' },
};

const formularioCategories = [
  { id: 'movimentacao', title: 'Formulários de Movimentação', icon: '📋', description: 'Documentos necessários para atendimento.' },
  { id: 'reembolso', title: 'Tabelas de Reembolso', icon: '📊', description: 'Documentos necessários para atendimento.' },
  { id: 'carencia', title: 'Informações de Carência', icon: '⏱️', description: 'Documentos necessários para atendimento.' },
  { id: 'coparticipacao', title: 'Regras de Coparticipação', icon: '⚖️', description: 'Documentos necessários para atendimento.' },
  { id: 'coberturas', title: 'Coberturas e Exclusões', icon: '📄', description: 'Documentos necessários para atendimento.' },
  { id: 'manuais', title: 'Manuais Operacionais', icon: '📘', description: 'Documentos necessários para atendimento.' },
];

const defaultMovementForms = {
  inclusao: {
    operadora: '',
    planos: ['Saúde'],
    beneficiario: '',
    cpf: '',
    dataNascimento: '',
    estadoCivil: '',
    email: '',
    telefone: '',
    detalhes: '',
    tipoMovimentacao: 'No vencimento',
    outrosDescricao: '',
  },
  exclusao: {
    operadora: '',
    planos: ['Dental'],
    beneficiario: '',
    cpf: '',
    detalhes: '',
    tipoMovimentacao: 'No vencimento',
    outrosDescricao: '',
  },
  alteracao: {
    planos: [],
    beneficiario: '',
    cpf: '',
    detalhes: '',
    tipoMovimentacao: ['Alteração Cadastral'],
    outrosDescricao: '',
  },
};

const defaultMovementAttachments = {
  inclusao: {},
  exclusao: {},
  alteracao: [],
};

const attachmentMeta = (file, category = '') => ({
  name: file?.name || category,
  size: file?.size || 0,
  type: file?.type || '',
  category,
});

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const card = { background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 18, boxShadow: '0 10px 28px rgba(15,23,42,0.05)' };
const plain = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const StatusPill = ({ status }) => {
  const normalized = String(status || '').toLowerCase();
  const ok = normalized.includes('pago') || normalized.includes('ativo') || normalized.includes('baixado') || normalized.includes('concl');
  const danger = normalized.includes('pend');
  const warn = normalized.includes('andamento');
  const neutral = normalized.includes('recebido') || normalized.includes('abert');
  const color = ok ? theme.ok : danger ? '#DC2626' : warn ? theme.warning : neutral ? theme.muted : theme.muted;
  const bg = ok ? '#ECFDF5' : danger ? '#FEF2F2' : warn ? '#FFFBEB' : '#F1F5F9';
  return <span style={{ color, background: bg, borderRadius: 999, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800 }}>{status || 'Recebido'}</span>;
};

const StatCard = ({ title, value, subtitle, icon: Icon, tone = theme.blue, onClick }) => (
  <div onClick={onClick} style={{ ...card, padding: 18, cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s' }}>
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
  const [confirmMovement, setConfirmMovement] = useState(null);
  const [confirmTerm, setConfirmTerm] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [esqueciEmail, setEsqueciEmail] = useState('');
  const [esqueciSenha, setEsqueciSenha] = useState('');
  const [esqueciError, setEsqueciError] = useState('');
  const [esqueciSuccess, setEsqueciSuccess] = useState('');
  const [showPassBox, setShowPassBox] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [passMsg, setPassMsg] = useState('');

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nome: '', email: '', telefone: '', cargo: '' });

  // LGPD Consent and Password Redefinition State Variables
  const [lgpdText, setLgpdText] = useState('');
  const [lgpdVersion, setLgpdVersion] = useState('1.0');
  const [lgpdAcceptedCheckbox, setLgpdAcceptedCheckbox] = useState(false);
  const [lgpdError, setLgpdError] = useState('');
  const [lgpdSubmitting, setLgpdSubmitting] = useState(false);

  const [tempSenha, setTempSenha] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);

  const [lgpdAceitesList, setLgpdAceitesList] = useState([]);
  const [lgpdSearchText, setLgpdSearchText] = useState('');
  const [selectedAceite, setSelectedAceite] = useState(null);
  const [showNovaVersaoModal, setShowNovaVersaoModal] = useState(false);
  const [novaVersaoText, setNovaVersaoText] = useState('');
  const [novaVersaoLabel, setNovaVersaoLabel] = useState('1.1');

  useEffect(() => {
    if (session) {
      setPerfilForm({
        nome: session.empresa || session.nome || 'Usuário',
        email: session.email || 'Não informado',
        telefone: session.telefone || 'Não informado',
        cargo: session.cargo || 'Cliente'
      });
    }
  }, [session]);

  useEffect(() => {
    if (session && !session.lgpdAceito) {
      fetchLgpdConfig()
        .then((cfg) => {
          setLgpdText(cfg.texto);
          setLgpdVersion(cfg.versao);
        })
        .catch((err) => {
          setLgpdError('Não foi possível carregar os termos da LGPD.');
        });
    }
  }, [session]);

  const [configForm, setConfigForm] = useState({ notifications: true, autoUpdate: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [formularios, setFormularios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [sinistralidade, setSinistralidade] = useState([]);
  const [solicitacoesSearch, setSolicitacoesSearch] = useState('');
  const [solicitacoesTipo, setSolicitacoesTipo] = useState('todos');
  const [solicitacoesStatus, setSolicitacoesStatus] = useState('todos');
  const [movementForms, setMovementForms] = useState(defaultMovementForms);
  const [movementAttachments, setMovementAttachments] = useState(defaultMovementAttachments);
  const [submittingMovement, setSubmittingMovement] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const empresa = session?.empresa || session?.nome || 'Cliente';

  // Security evaluation conditions
  const needsLgpdAcceptance = session && !session.lgpdAceito;
  const needsPasswordChange = session && session.lgpdAceito && !session.senhaAlterada;

  const isDonfim = useMemo(() => {
    return session?.nome?.toLowerCase() === 'donfim' || session?.email?.toLowerCase().includes('donfim') || perfilForm?.nome?.toLowerCase() === 'donfim' || perfilForm?.cargo?.toLowerCase() === 'master';
  }, [session, perfilForm]);

  const filteredMenuItems = useMemo(() => {
    const base = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'contratos', label: 'Contratos', icon: FolderOpen },
      { id: 'faturas', label: 'Faturas', icon: Receipt },
      { id: 'bi', label: 'Sinistralidade e BI', icon: BarChart3 },
      { id: 'movimentacao', label: 'Movimentação', icon: RefreshCw },
      { id: 'solicitacoes', label: 'Solicitações', icon: FileText },
      { id: 'formularios', label: 'Formulários e Manuais', icon: FileText },
      { id: 'chat', label: 'Chat', icon: MessageCircle },
    ];
    if (isDonfim) {
      base.push({ id: 'lgpd', label: 'Governança LGPD', icon: '🛡️' });
    }
    return base;
  }, [isDonfim]);

  const isLengthValid = newPass.length >= 8;
  const containsSpecialChar = /[^A-Za-z0-9]/.test(newPass);
  const hasNoSequence = (val) => {
    if (!val) return true;
    for (let i = 0; i <= val.length - 3; i++) {
      const c1 = val[i];
      const c2 = val[i+1];
      const c3 = val[i+2];
      if (/\d/.test(c1) && /\d/.test(c2) && /\d/.test(c3)) {
        if (c1 === c2 && c2 === c3) return false;
        const n1 = parseInt(c1, 10);
        const n2 = parseInt(c2, 10);
        const n3 = parseInt(c3, 10);
        if (n2 === n1 + 1 && n3 === n2 + 1) return false;
        if (n2 === n1 - 1 && n3 === n2 - 1) return false;
      }
    }
    return true;
  };
  const isSequenceValid = hasNoSequence(newPass);
  const isMatchValid = newPass === confirmNewPass && newPass.length > 0;
  const isFormValid = isLengthValid && containsSpecialChar && isSequenceValid && isMatchValid;

  const loadPortal = useCallback(async (currentSession = session) => {
    if (!currentSession?.documento) return;
    if (!currentSession.lgpdAceito || !currentSession.senhaAlterada) return;
    setLoading(true);
    try {
      const [resumo, chat, solicitacoesData, formulariosData, sinistroData] = await Promise.all([
        fetchPortalDonCorResumo(currentSession.documento),
        fetchPortalDonCorChat({ documento: currentSession.documento, empresa: currentSession.empresa }),
        fetchPortalDonCorSolicitacoes({ documento: currentSession.documento }),
        fetchPortalDonCorFormularios(),
        fetchPortalDonCorSinistralidade(currentSession.documento)
      ]);
      setPayload(resumo);
      setMessages(chat || []);
      setSolicitacoes(solicitacoesData || []);
      setFormularios(formulariosData || []);
      setSinistralidade(sinistroData || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Não foi possível carregar o Portal do Cliente.');
    }
    setLoading(false);
  }, [session]);

  const loadLgpdGovernance = useCallback(async () => {
    try {
      const data = await fetchLgpdAceites();
      setLgpdAceitesList(data);
    } catch (err) {
      console.error('Erro ao carregar aceites LGPD:', err);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'lgpd' && isDonfim) {
      loadLgpdGovernance();
    }
  }, [activeSection, isDonfim, loadLgpdGovernance]);

  useEffect(() => {
    if (!session || !session.lgpdAceito || !session.senhaAlterada) return undefined;
    loadPortal(session);
    const timer = setInterval(() => loadPortal(session), PORTAL_REFRESH_MS);
    return () => clearInterval(timer);
  }, [session, loadPortal]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginPortalDonCor({ documento, senha });
      setTempSenha(senha); // Keep current login password as temporary
      setSession(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSenha('');
      if (data.lgpdAceito && data.senhaAlterada) {
        await loadPortal(data);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'CPF/CNPJ ou senha inválidos.');
    }
    setLoading(false);
  };

  const handleAcceptLgpd = async () => {
    if (!lgpdAcceptedCheckbox) return;
    setLgpdSubmitting(true);
    setLgpdError('');
    try {
      await aceitarLgpd({
        documento: session.documento,
        usuario: session.nome,
        empresa: session.empresa,
        versao: lgpdVersion,
        ip: '127.0.0.1'
      });
      const updatedSession = { ...session, lgpdAceito: true };
      setSession(updatedSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
    } catch (err) {
      setLgpdError(err?.response?.data?.detail || 'Erro ao registrar aceite de LGPD.');
    }
    setLgpdSubmitting(false);
  };

  const handleSaveFirstPassword = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setPassSubmitting(true);
    setPassError('');
    try {
      await alterarSenhaPortalDonCor({
        documento: session.documento,
        senhaAtual: tempSenha || senha,
        novaSenha: newPass
      });
      const updatedSession = { ...session, senhaAlterada: true, primeiroAcesso: false };
      setSession(updatedSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
      setPassSuccess('Sua senha foi redefinida com sucesso!');
      await loadPortal(updatedSession);
    } catch (err) {
      setPassError(err?.response?.data?.detail || 'Erro ao redefinir a senha.');
    }
    setPassSubmitting(false);
  };

  const handleExportLgpd = () => {
    if (lgpdAceitesList.length === 0) return;
    const headers = ['Usuario', 'Documento', 'Empresa', 'Versao', 'Data/Hora', 'IP', 'Hash de Assinatura'];
    const rows = lgpdAceitesList.map(item => [
      item.usuario || '',
      item.documento || '',
      item.empresa || '',
      item.versao || '',
      item.criadoEm || item.createdAt || '',
      item.ip || '',
      item.hash || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_lgpd_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveNovaVersao = async (e) => {
    e.preventDefault();
    if (!novaVersaoText || !novaVersaoLabel) return;
    try {
      await saveLgpdConfig({
        versao: novaVersaoLabel,
        texto: novaVersaoText
      });
      setShowNovaVersaoModal(false);
      setNovaVersaoText('');
      setNovaVersaoLabel((parseFloat(novaVersaoLabel) + 0.1).toFixed(1));
      
      const cfg = await fetchLgpdConfig();
      setLgpdText(cfg.texto);
      setLgpdVersion(cfg.versao);
      alert('Nova versão de termos LGPD publicada com sucesso! Todos os usuários que fizerem login deverão aceitar esta nova versão.');
    } catch (err) {
      alert('Erro ao salvar nova versão dos termos.');
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setEsqueciError('');
    setEsqueciSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/api/portal-doncor/esqueci-senha', {
        documento,
        email: esqueciEmail,
        novaSenha: esqueciSenha
      });
      setEsqueciSuccess(response.data.message || 'Senha redefinida com sucesso.');
      setTimeout(() => {
        setShowForgot(false);
        setEsqueciSuccess('');
        setEsqueciEmail('');
        setEsqueciSenha('');
      }, 3000);
    } catch (err) {
      setEsqueciError(err?.response?.data?.detail || 'Erro ao redefinir a senha.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setPayload(null);
    setTempSenha('');
    setNewPass('');
    setConfirmNewPass('');
    setLgpdAcceptedCheckbox(false);
    setMessages([]);
    setFormularios([]);
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
    if (attachment && attachment.size > 2 * 1024 * 1024) {
      alert('O tamanho máximo do anexo é de 2MB. Por favor, escolha um arquivo menor.');
      return;
    }
    
    try {
      let attachmentData = null;
      if (attachment) {
        attachmentData = { ...attachmentMeta(attachment, 'Chat'), base64: await fileToBase64(attachment) };
      }
      
      const saved = await sendPortalDonCorChat({
        documento: session.documento,
        empresa,
        text: message.trim(),
        attachmentName: attachment?.name || '',
        attachmentSize: attachment?.size || 0,
        attachments: attachmentData ? [attachmentData] : [],
        sender: empresa,
        senderRole: 'portal'
      });
      setMessages((items) => [...items, saved]);
      setMessage('');
      setAttachment(null);
    } catch(e) {
      console.error(e);
      alert('Erro ao enviar mensagem. Tente novamente ou contate o suporte.');
    }
  };

  const updateMovementField = (section, field, value) => {
    setMovementForms((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  };

  const toggleMovementArrayValue = (section, field, value) => {
    setMovementForms((current) => {
      const values = current[section][field] || [];
      const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return { ...current, [section]: { ...current[section], [field]: nextValues } };
    });
  };

  const updateChecklistAttachment = (section, category, file) => {
    setMovementAttachments((current) => {
      const nextSection = { ...(current[section] || {}) };
      if (file === undefined) {
        delete nextSection[category];
      } else {
        nextSection[category] = file ? attachmentMeta(file, category) : { name: category, size: 0, type: '', category };
      }
      return { ...current, [section]: nextSection };
    });
  };

  const updateAlteracaoAttachments = (files) => {
    setMovementAttachments((current) => ({
      ...current,
      alteracao: Array.from(files || []).map((file) => attachmentMeta(file, 'Alteração')),
    }));
  };

  const resetMovementForm = (section) => {
    setMovementForms((current) => ({ ...current, [section]: defaultMovementForms[section] }));
    setMovementAttachments((current) => ({ ...current, [section]: defaultMovementAttachments[section] }));
  };

  const getMovementAttachments = (section) => {
    const value = movementAttachments[section];
    if (Array.isArray(value)) return value;
    return Object.values(value || {}).filter((item) => item?.name);
  };

  const submitMovimentacao = async (section) => {
    if (!session) return;
    setError('');
    setSuccessMsg('');
    const form = movementForms[section];
    const contrato = form.contrato || payload?.parceiro?.contratos?.[0] || contratos?.[0]?.contrato || '';
    setSubmittingMovement(true);
    try {
      const saved = await createPortalDonCorMovimentacao({
        tipo: section,
        documento: session.documento,
        empresa,
        contrato,
        ...form,
        anexos: getMovementAttachments(section),
      });
      setSolicitacoes((items) => [saved, ...items]);
      setSuccessMsg(`Solicitação ${saved.protocolo} enviada com sucesso.`);
      resetMovementForm(section);
      setActiveSection('solicitacoes');
      await loadPortal(session);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Não foi possível enviar a solicitação.');
    }
    setSubmittingMovement(false);
  };

  const faturas = useMemo(() => payload?.faturas || [], [payload]);
  const boletos = useMemo(() => payload?.boletos || [], [payload]);
  const contratos = useMemo(() => {
    const map = new Map();
    faturas.forEach((item) => {
      const key = item.contrato || item.numero || 'Contrato';
      if (!map.has(key)) map.set(key, { contrato: key, plano: item.seguradora || 'Plano empresarial', seguradora: item.seguradora || '-', status: 'Ativo', vigencia: item.competencia || '-', vidas: item.vidas || '-' });
    });
    if (map.size === 0 && payload?.resumo?.contratos) map.set('Contrato Principal', { contrato: 'Contrato Principal', plano: 'Plano empresarial', seguradora: 'DonCor', status: 'Ativo', vigencia: '-', vidas: '-' });
    return Array.from(map.values());
  }, [faturas, payload]);
  const filteredSolicitacoes = useMemo(() => {
    const term = solicitacoesSearch.trim().toLowerCase();
    return (solicitacoes || []).filter((item) => {
      const tipoOk = solicitacoesTipo === 'todos' || String(item.tipo || item.tipoLabel || '').toLowerCase() === solicitacoesTipo;
      const statusOk = solicitacoesStatus === 'todos' || String(item.status || '').toLowerCase() === solicitacoesStatus;
      if (!tipoOk || !statusOk) return false;
      if (!term) return true;
      return ['protocolo', 'tipoLabel', 'beneficiario', 'cpf', 'contrato', 'status', 'detalhes']
        .some((key) => String(item[key] || '').toLowerCase().includes(term));
    });
  }, [solicitacoes, solicitacoesSearch, solicitacoesTipo, solicitacoesStatus]);
  const solicitacoesAbertas = useMemo(
    () => solicitacoes.filter((item) => !String(item.status || '').toLowerCase().includes('concl')).length,
    [solicitacoes]
  );
  const mensagensAtendimento = useMemo(() => messages.length, [messages]);
  const solicitacoesPorStatus = useMemo(() => {
    const base = [
      { key: 'recebido', label: 'Recebido', value: 0, color: theme.muted },
      { key: 'em andamento', label: 'Em andamento', value: 0, color: theme.warning },
      { key: 'concluido', label: 'Concluído', value: 0, color: theme.ok },
    ];
    solicitacoes.forEach((item) => {
      const status = plain(item.status);
      const target = base.find((entry) => status.includes(entry.key)) || base[0];
      target.value += 1;
    });
    return base;
  }, [solicitacoes]);
  const solicitacoesPorTipo = useMemo(() => {
    const base = [
      { key: 'inclusao', label: 'Inclusão', value: 0, color: theme.blue },
      { key: 'exclusao', label: 'Exclusão', value: 0, color: '#DC2626' },
      { key: 'alteracao', label: 'Alteração', value: 0, color: theme.primary },
    ];
    solicitacoes.forEach((item) => {
      const tipo = plain(item.tipo || item.tipoLabel);
      const target = base.find((entry) => tipo.includes(entry.key)) || base[2];
      target.value += 1;
    });
    return base;
  }, [solicitacoes]);
  const maxSolicitacoesStatus = useMemo(() => Math.max(...solicitacoesPorStatus.map((item) => item.value), 1), [solicitacoesPorStatus]);
  const maxSolicitacoesTipo = useMemo(() => Math.max(...solicitacoesPorTipo.map((item) => item.value), 1), [solicitacoesPorTipo]);
  const ultimasSolicitacoes = useMemo(() => solicitacoes.slice(0, 4), [solicitacoes]);
  const demandasPendentes = useMemo(() => solicitacoes.filter((item) => !String(item.status || '').toLowerCase().includes('concl')).slice(0, 4), [solicitacoes]);
  const demandasConcluidas = useMemo(() => solicitacoes.filter((item) => String(item.status || '').toLowerCase().includes('concl')).slice(0, 4), [solicitacoes]);
  const formulariosPorCategoria = useMemo(() => {
    const grouped = formularioCategories.map((category) => ({
      ...category,
      docs: formularios.filter((item) => item.categoria === category.id),
    }));
    const customCategories = formularios
      .filter((item) => !formularioCategories.some((category) => category.id === item.categoria))
      .reduce((acc, item) => {
        const key = item.categoria || 'outros';
        const current = acc.get(key) || {
          id: key,
          title: item.categoriaLabel || 'Outros documentos',
          icon: item.categoriaIcone || '📄',
          description: item.categoriaDescricao || 'Documentos necessários para atendimento.',
          docs: [],
        };
        current.docs.push(item);
        acc.set(key, current);
        return acc;
      }, new Map());
    return [...grouped, ...Array.from(customCategories.values())];
  }, [formularios]);

  const openFormulario = (item) => {
    const url = getPortalFormularioDownloadUrl(item);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderDashboardBars = (items, maxValue) => (
    <div style={{ display: 'grid', gap: 14 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', color: theme.text, fontWeight: 800 }}>
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div style={{ height: 10, background: '#edf2f7', borderRadius: 999, overflow: 'hidden', marginTop: 7 }}>
            <div style={{ width: `${item.value ? Math.max((item.value / maxValue) * 100, 8) : 0}%`, height: '100%', background: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );

  const chartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map(m => ({ name: m, solicitacoes: 0, boletos: 0 }));
    
    solicitacoes.forEach(s => {
      if (s.dataSolicitacao) {
        const parts = s.dataSolicitacao.split('/');
        if (parts.length >= 2) {
          const mIndex = parseInt(parts[1], 10) - 1;
          if (mIndex >= 0 && mIndex < 12) {
            data[mIndex].solicitacoes++;
          }
        }
      }
    });
    
    boletos.forEach(b => {
      if (b.dataVencimento || b.competencia) {
        const dateStr = b.dataVencimento || b.competencia;
        const parts = dateStr.split('/');
        if (parts.length >= 2) {
          const mIndex = parseInt(parts[1], 10) - 1;
          if (mIndex >= 0 && mIndex < 12) {
            data[mIndex].boletos++;
          }
        }
      }
    });
    
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      if (m < 0) m += 12;
      last6Months.push(data[m]);
    }
    return last6Months;
  }, [solicitacoes, boletos]);

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 460px)', background: theme.bg }}>
        <div style={{ background: `linear-gradient(135deg, ${theme.navy} 0%, ${theme.primary} 100%)`, color: '#fff', padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}><DoncorLogo size={36} /><div style={{ height: 24, width: 1, background: '#ffffff30', margin: '0 4px' }} /><div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>Portal do Cliente</div></div>
            <h1 style={{ fontSize: '2.4rem', lineHeight: 1.08, margin: '0 0 18px', maxWidth: 620 }}>Acompanhe contratos, faturas, movimentações e atendimento em um só lugar.</h1>
            <p style={{ maxWidth: 540, opacity: 0.82, fontSize: '1rem', lineHeight: 1.6 }}>Área exclusiva para empresas e parceiros cadastrados consultarem boletos, histórico financeiro, relatórios e abrirem solicitações com a equipe.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 720 }}>{[['Contratos', FolderOpen], ['Faturas', Receipt], ['Chat', MessageCircle]].map(([label, Icon]) => <div key={label} style={{ border: '1px solid #ffffff25', borderRadius: 16, padding: 14, background: '#ffffff12' }}><Icon size={18}/><div style={{ marginTop: 8, fontWeight: 800 }}>{label}</div></div>)}</div>
        </div>
        <div style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {showForgot ? (
            <form onSubmit={handleForgotPassword} style={{ width: '100%', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 22, padding: 30, boxShadow: '0 24px 70px rgba(15,23,42,0.12)' }}>
              <div style={{ marginBottom: 24 }}><div style={{ marginBottom: 14 }}><DoncorLogo size={40} /></div><h2 style={{ margin: 0, fontSize: '1.55rem', color: theme.text }}>Redefinir Senha</h2><p style={{ margin: '8px 0 0', color: theme.muted, fontSize: '0.9rem' }}>Informe seus dados para recuperar o acesso.</p></div>
              {esqueciError && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{esqueciError}</div>}
              {esqueciSuccess && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{esqueciSuccess}</div>}
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>CNPJ ou CPF vinculado</label><Input value={documento} onChange={(event) => setDocumento(event.target.value)} placeholder="Digite o CNPJ da empresa ou CPF" style={{ marginBottom:12 }} />
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>E-mail cadastrado</label><Input type="email" value={esqueciEmail} onChange={(event) => setEsqueciEmail(event.target.value)} placeholder="Digite o e-mail da conta" style={{ marginBottom:12 }} />
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>Nova Senha</label><Input type="password" value={esqueciSenha} onChange={(event) => setEsqueciSenha(event.target.value)} placeholder="Mínimo 6 caracteres" style={{ marginBottom:14 }} />
              <button type="button" onClick={() => setShowForgot(false)} style={{ border:0, background:'transparent', color:theme.muted, cursor:'pointer', fontSize:'0.84rem', marginBottom:14, padding:0, textDecoration: 'underline' }}>Voltar para o login</button>
              <Button type="submit" disabled={loading} style={{ width:'100%', background:theme.blue, color:'#fff', fontWeight:900 }}>{loading ? 'Redefinindo...' : 'Confirmar Nova Senha'}</Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ width: '100%', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 22, padding: 30, boxShadow: '0 24px 70px rgba(15,23,42,0.12)' }}>
              <div style={{ marginBottom: 24 }}><div style={{ marginBottom: 14 }}><DoncorLogo size={40} /></div><h2 style={{ margin: 0, fontSize: '1.55rem', color: theme.text }}>Entrar no Portal do Cliente</h2><p style={{ margin: '8px 0 0', color: theme.muted, fontSize: '0.9rem' }}>Use o CNPJ/CPF vinculado e sua senha de acesso.</p></div>
              {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{error}</div>}
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>CNPJ ou CPF vinculado</label><Input value={documento} onChange={(event) => setDocumento(event.target.value)} placeholder="Digite o CNPJ da empresa ou CPF" style={{ marginBottom:12 }} />
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>Senha</label><Input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" style={{ marginBottom:10 }} />
              <button type="button" onClick={() => { setShowForgot(true); setError(''); }} style={{ border:0, background:'transparent', color:theme.blue, cursor:'pointer', fontSize:'0.78rem', marginBottom:14, padding:0 }}>Esqueci minha senha</button>
              <Button type="submit" disabled={loading} style={{ width:'100%', background:theme.blue, color:'#fff', fontWeight:900 }}>{loading ? 'Validando...' : 'Entrar no Portal do Cliente'}</Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (needsLgpdAcceptance) {
    return renderLgpdAcceptanceScreen();
  }

  if (needsPasswordChange) {
    return renderPasswordChangeScreen();
  }

  const renderDashboard = () => (
    <>
      <SectionTitle title={`Bem-vindo ao seu Portal, ${empresa}`} subtitle="Resumo das operações ativas por seção." action={<Button onClick={() => { setActiveSection('movimentacao'); setActiveMovementTab('inclusao'); }} style={{ background: theme.blue, color: '#fff', display: 'flex', gap: 8 }}><FileText size={15}/>Novo chamado</Button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:14, marginBottom:16 }}>
        <StatCard title="Contratos vigentes" value={payload?.resumo?.contratos || contratos.length || 0} subtitle="Ativos" icon={FolderOpen} onClick={() => setActiveSection('contratos')}/>
        <StatCard title="Boletos disponíveis" value={payload?.resumo?.boletos || boletos.length || 0} subtitle="PDFs no sistema" icon={Download} tone={theme.ok} onClick={() => setActiveSection('faturas')}/>
        <StatCard title="Solicitações abertas" value={solicitacoesAbertas} subtitle="Aguardando conclusão" icon={FileText} tone={theme.warning} onClick={() => setActiveSection('solicitacoes')}/>
        <StatCard title="Mensagens no chat" value={mensagensAtendimento} subtitle="Atendimento registrado" icon={MessageCircle} tone={theme.primary} onClick={() => setActiveSection('chat')}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, marginBottom:16 }}>
        <section style={{ ...card, padding:18 }}>
          <SectionTitle title="Evolução do Sistema - Portal do Cliente" subtitle="Gráficos referentes aos dados do sistema" />
          <div style={{ width: '100%', height: 300, marginTop: 20 }}>
            {chartData.every(d => d.solicitacoes === 0 && d.boletos === 0) ? (
              <EmptyState>Os gráficos serão exibidos após a primeira movimentação ou boleto.</EmptyState>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: theme.muted, fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: theme.muted, fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="solicitacoes" name="Solicitações" fill={theme.primary} radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="boletos" name="Boletos Acessados" fill={theme.blue} radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <section style={{ ...card, padding:18 }}>
          <SectionTitle title="Status das Solicitações" subtitle="Distribuição das demandas enviadas." />
          {solicitacoes.length === 0 ? <EmptyState>Nenhuma solicitação enviada.</EmptyState> : renderDashboardBars(solicitacoesPorStatus, maxSolicitacoesStatus)}
        </section>
        <section style={{ ...card, padding:18 }}>
          <SectionTitle title="Movimentações por tipo" subtitle="Inclusões, exclusões e alterações solicitadas." />
          {solicitacoes.length === 0 ? <EmptyState>Os gráficos serão exibidos após a primeira movimentação.</EmptyState> : renderDashboardBars(solicitacoesPorTipo, maxSolicitacoesTipo)}
        </section>
      </div>
    </>
  );

  const renderContratos = () => (
    <div>
      <SectionTitle 
        title="Contratos Vigentes" 
        subtitle="Gerencie suas apólices, vigência e status de todos os contratos."
        action={<Button onClick={() => { setActiveSection('movimentacao'); setActiveMovementTab('inclusao'); }} style={{ background: theme.blue, color: '#fff' }}><FileText size={14}/> Novo Chamado</Button>}
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
  );

  const renderBi = () => (
    <section style={{ ...card, padding: 18 }}>
      <SectionTitle title="Sinistralidade e BI" subtitle="Relatórios e arquivos processados para acompanhamento de indicadores." />
      {sinistralidade.length === 0 ? <EmptyState>Nenhum documento disponível no momento.</EmptyState> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {sinistralidade.map((file, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: `1px solid ${theme.border}`, borderRadius: 10, background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText color={theme.blue} size={16} />
                <div>
                  <div style={{ color: theme.text, fontWeight: 600, fontSize: '0.85rem' }}>{file.titulo}</div>
                  <div style={{ color: theme.muted, fontSize: '0.7rem' }}>
                    {file.arquivoNome && `${file.arquivoNome} • `}
                    {file.criadoEm}
                  </div>
                </div>
              </div>
              {(file.arquivoUrl || file.arquivoNome) && (
                <a href={getPortalSinistralidadeDownloadUrl(file)} target="_blank" rel="noreferrer" style={{ color: theme.muted }}>
                  <Download size={16} style={{ cursor: 'pointer' }} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const fieldLabel = { display:'block', color:theme.text, fontWeight:800, fontSize:'0.74rem', marginBottom:6, letterSpacing:'0.02em' };
  const selectStyle = { width:'100%', border:`1px solid ${theme.border}`, borderRadius:9, padding:'11px 12px', background:'#fff', color:theme.text, fontSize:'0.92rem' };
  const checkboxRow = { display:'flex', alignItems:'center', gap:8, color:theme.text, fontSize:'0.92rem' };
  const radioCard = { border:`1px solid ${theme.border}`, borderRadius:10, padding:14, background:'#fff', display:'flex', gap:10, alignItems:'flex-start' };
  const uploadBox = <div style={{ border:'2px dashed #d5dcec', borderRadius:12, background:'#f8faff', padding:28, textAlign:'center', color:theme.text }}><UploadCloud size={26} color={theme.muted}/><div style={{ marginTop:8, fontWeight:800 }}>Arraste e solte os arquivos aqui</div><div style={{ color:theme.muted, fontSize:'0.82rem', marginTop:4 }}>ou clique para selecionar no computador</div><Button variant="outline" style={{ marginTop:12 }}>Selecionar Arquivos</Button></div>;

  const renderInclusao = () => {
    const form = movementForms.inclusao;
    const attachments = movementAttachments.inclusao;
    return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.95fr', gap: 22 }}>
      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={fieldLabel}>Operadora *</label>
              <select style={selectStyle} value={form.operadora} onChange={(event) => updateMovementField('inclusao', 'operadora', event.target.value)}>
                <option value="">Selecione a Operadora</option>
                <option>Assim Saúde</option>
                <option>Amil</option>
                <option>SulAmérica</option>
                <option>Bradesco Saúde</option>
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Plano *</label>
              <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Saúde')} onChange={() => toggleMovementArrayValue('inclusao', 'planos', 'Saúde')} /> Saúde</label>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Dental')} onChange={() => toggleMovementArrayValue('inclusao', 'planos', 'Dental')} /> Dental</label>
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
              <Input placeholder="Nome completo do beneficiário" value={form.beneficiario} onChange={(event) => updateMovementField('inclusao', 'beneficiario', event.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input placeholder="000.000.000-00" value={form.cpf} onChange={(event) => updateMovementField('inclusao', 'cpf', event.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Data de Nascimento *</label>
              <Input type="date" value={form.dataNascimento} onChange={(event) => updateMovementField('inclusao', 'dataNascimento', event.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Estado Civil *</label>
              <select style={selectStyle} value={form.estadoCivil} onChange={(event) => updateMovementField('inclusao', 'estadoCivil', event.target.value)}>
                <option value="">Selecione</option>
                <option>Solteiro(a)</option>
                <option>Casado(a)</option>
                <option>Divorciado(a)</option>
                <option>Viúvo(a)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>E-mail *</label>
              <Input placeholder="email@exemplo.com" type="email" value={form.email} onChange={(event) => updateMovementField('inclusao', 'email', event.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>Telefone *</label>
              <Input placeholder="(11) 90000-0000" value={form.telefone} onChange={(event) => updateMovementField('inclusao', 'telefone', event.target.value)} />
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20}/> Detalhes da Inclusão
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18 }}>
            <label style={fieldLabel}>Descreva os detalhes da inclusão *</label>
            <textarea
              value={form.detalhes}
              onChange={(event) => updateMovementField('inclusao', 'detalhes', event.target.value)}
              placeholder="Informe observações, condições ou instruções adicionais para esta inclusão..."
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
            <RefreshCw size={20}/> Tipo de Inclusão
          </h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ ...radioCard, alignItems: 'flex-start' }}>
              <input type="radio" name="tipo-inclusao" checked={form.tipoMovimentacao === 'No vencimento'} onChange={() => updateMovementField('inclusao', 'tipoMovimentacao', 'No vencimento')} />
              <div>
                <strong style={{ color: theme.text }}>No vencimento</strong>
                <div style={{ color: theme.muted, marginTop: 4, fontSize: '0.82rem' }}>Inclusão programada para a próxima fatura.</div>
              </div>
            </label>
            <label style={{ ...radioCard, alignItems: 'flex-start', background: '#fff' }}>
              <input type="radio" name="tipo-inclusao" checked={form.tipoMovimentacao === 'Imediato'} onChange={() => updateMovementField('inclusao', 'tipoMovimentacao', 'Imediato')} />
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
            {['RG / CPF', 'Comprovante de Residência', 'CTPS / eSocial', 'Formulário Assinado', 'Outros'].map((doc) => (
              <div key={doc} style={{ display: 'grid', gap: 8 }}>
                <label style={{ ...checkboxRow, border: `1px solid ${theme.border}`, padding: '12px 14px', borderRadius: 10, justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span>
                    <input type="checkbox" checked={!!attachments[doc]} onChange={(event) => updateChecklistAttachment('inclusao', doc, event.target.checked ? null : undefined)} style={{ marginRight: 10 }} />
                    {doc}
                    {attachments[doc]?.name && attachments[doc].name !== doc && <span style={{ color: theme.muted, marginLeft: 6, fontSize: '0.72rem' }}>({attachments[doc].name})</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UploadCloud size={18} color={theme.muted} />
                    <Input type="file" onChange={(event) => updateChecklistAttachment('inclusao', doc, event.target.files?.[0])} style={{ maxWidth: 112, fontSize: '0.68rem', padding: 4 }} />
                  </span>
                </label>
                {doc === 'Outros' && !!attachments[doc] && (
                  <div style={{ paddingLeft: 6 }}>
                    <Input placeholder="Especifique qual anexo..." value={form.outrosDescricao || ''} onChange={(event) => updateMovementField('inclusao', 'outrosDescricao', event.target.value)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" onClick={() => resetMovementForm('inclusao')} style={{ flex: 1 }}>Cancelar</Button>
          <Button disabled={submittingMovement} onClick={() => { setConfirmMovement('inclusao'); setConfirmTerm(false); }} style={{ flex: 1, background: theme.primary, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
        </div>
      </div>
    </div>
    );
  };

  const renderExclusao = () => {
    const form = movementForms.exclusao;
    const attachments = movementAttachments.exclusao;
    return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.95fr', gap: 22 }}>
      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={fieldLabel}>Operadora *</label>
              <select style={selectStyle} value={form.operadora} onChange={(event) => updateMovementField('exclusao', 'operadora', event.target.value)}>
                <option value="">Selecione a operadora</option>
                <option>Assim Saúde</option>
                <option>Amil</option>
                <option>SulAmérica</option>
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Plano *</label>
              <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Dental')} onChange={() => toggleMovementArrayValue('exclusao', 'planos', 'Dental')} /> Dental</label>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Saúde')} onChange={() => toggleMovementArrayValue('exclusao', 'planos', 'Saúde')} /> Saúde</label>
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
              <Input placeholder="Nome do beneficiário" value={form.beneficiario} onChange={(event) => updateMovementField('exclusao', 'beneficiario', event.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input placeholder="000.000.000-00" value={form.cpf} onChange={(event) => updateMovementField('exclusao', 'cpf', event.target.value)} />
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20}/> Detalhes da Exclusão
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18 }}>
            <label style={fieldLabel}>Descreva os detalhes da exclusão *</label>
            <textarea
              value={form.detalhes}
              onChange={(event) => updateMovementField('exclusao', 'detalhes', event.target.value)}
              placeholder="Informe o motivo, observações ou instruções adicionais para esta exclusão..."
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
            <RefreshCw size={20}/> Tipo de Exclusão
          </h3>
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ ...radioCard, alignItems: 'flex-start' }}>
              <input type="radio" name="tipo-exclusao" checked={form.tipoMovimentacao === 'No vencimento'} onChange={() => updateMovementField('exclusao', 'tipoMovimentacao', 'No vencimento')} />
              <div>
                <strong style={{ color: theme.text }}>No vencimento</strong>
                <div style={{ color: theme.muted, marginTop: 4, fontSize: '0.82rem' }}>A exclusão ocorrerá na data de aniversário do contrato.</div>
              </div>
            </label>
            <label style={{ ...radioCard, alignItems: 'flex-start', background: '#fff' }}>
              <input type="radio" name="tipo-exclusao" checked={form.tipoMovimentacao === 'Imediato'} onChange={() => updateMovementField('exclusao', 'tipoMovimentacao', 'Imediato')} />
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
            {['Termo de Rescisão', 'Formulário de Exclusão Assinado', 'Outros'].map((doc) => (
              <div key={doc} style={{ display: 'grid', gap: 8 }}>
                <label style={{ ...checkboxRow, border: `1px solid ${theme.border}`, padding: '12px 14px', borderRadius: 10, justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span>
                    <input type="checkbox" checked={!!attachments[doc]} onChange={(event) => updateChecklistAttachment('exclusao', doc, event.target.checked ? null : undefined)} style={{ marginRight: 10 }} />
                    {doc}
                    {attachments[doc]?.name && attachments[doc].name !== doc && <span style={{ color: theme.muted, marginLeft: 6, fontSize: '0.72rem' }}>({attachments[doc].name})</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UploadCloud size={18} color={theme.muted} />
                    <Input type="file" onChange={(event) => updateChecklistAttachment('exclusao', doc, event.target.files?.[0])} style={{ maxWidth: 112, fontSize: '0.68rem', padding: 4 }} />
                  </span>
                </label>
                {doc === 'Outros' && !!attachments[doc] && (
                  <div style={{ paddingLeft: 6 }}>
                    <Input placeholder="Especifique qual anexo..." value={form.outrosDescricao || ''} onChange={(event) => updateMovementField('exclusao', 'outrosDescricao', event.target.value)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" onClick={() => resetMovementForm('exclusao')} style={{ flex: 1 }}>Cancelar</Button>
          <Button disabled={submittingMovement} onClick={() => { setConfirmMovement('exclusao'); setConfirmTerm(false); }} style={{ flex: 1, background: theme.primary, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
        </div>
      </div>
    </div>
    );
  };

  const renderAlteracao = () => {
    const form = movementForms.alteracao;
    const attachments = movementAttachments.alteracao;
    return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.95fr', gap: 22 }}>
      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {contratos.length === 0 ? (
              <div style={{ color: theme.muted, fontSize: '0.9rem', gridColumn: '1 / -1' }}>Nenhum contrato encontrado.</div>
            ) : contratos.map((item, idx) => (
              <label key={item.contrato || idx} style={{ ...radioCard, alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.planos.includes(item.contrato)} 
                  onChange={() => toggleMovementArrayValue('alteracao', 'planos', item.contrato)} 
                />
                <div>
                  <strong style={{ color: theme.text }}>{item.plano || item.seguradora || 'Saúde'}</strong>
                  <div style={{ color: theme.muted, fontSize: '0.82rem' }}>{item.contrato !== 'Contrato Principal' ? `Apólice nº ${item.contrato}` : item.contrato}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={20}/> Dados do Beneficiário
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>Nome Completo *</label>
              <Input placeholder="Nome do beneficiário" value={form.beneficiario} onChange={(event) => updateMovementField('alteracao', 'beneficiario', event.target.value)} />
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input placeholder="000.000.000-00" value={form.cpf} onChange={(event) => updateMovementField('alteracao', 'cpf', event.target.value)} />
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20}/> Detalhes da Alteração
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18 }}>
            <label style={fieldLabel}>Descreva a alteração *</label>
            <textarea
              value={form.detalhes}
              onChange={(event) => updateMovementField('alteracao', 'detalhes', event.target.value)}
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
              <div key={tipo} style={{ display: 'grid', gap: 8 }}>
                <label style={{ ...radioCard, alignItems: 'center', cursor: 'pointer', background: index === 0 ? '#fff' : '#f8faff' }}>
                  <input type="checkbox" checked={form.tipoMovimentacao.includes(tipo)} onChange={() => toggleMovementArrayValue('alteracao', 'tipoMovimentacao', tipo)} />
                  <span style={{ fontWeight: 700, color: theme.text, fontSize: '0.88rem' }}>{tipo}</span>
                </label>
                {tipo === 'Outros' && form.tipoMovimentacao.includes(tipo) && (
                  <div style={{ paddingLeft: 6 }}>
                    <Input placeholder="Especifique o tipo de solicitação..." value={form.outrosDescricao || ''} onChange={(event) => updateMovementField('alteracao', 'outrosDescricao', event.target.value)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Paperclip size={20}/> Anexos
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
            <label style={{ border:'2px dashed #d5dcec', borderRadius:12, background:'#f8faff', padding:28, textAlign:'center', color:theme.text, display:'block', cursor:'pointer' }}>
              <UploadCloud size={26} color={theme.muted}/>
              <div style={{ marginTop:8, fontWeight:800 }}>Selecione arquivos de apoio</div>
              <div style={{ color:theme.muted, fontSize:'0.82rem', marginTop:4 }}>PDF, imagens ou documentos do pedido</div>
              <Input type="file" multiple onChange={(event) => updateAlteracaoAttachments(event.target.files)} style={{ marginTop:12 }} />
            </label>
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              {attachments.length === 0 ? <div style={{ color: theme.muted, fontSize: '0.78rem' }}>Nenhum anexo selecionado.</div> : attachments.map((file) => (
                <div key={`${file.name}-${file.size}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', background: '#fff' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.text, fontSize: '0.82rem', fontWeight: 700 }}><FileText size={16} color={theme.muted}/>{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" onClick={() => resetMovementForm('alteracao')} style={{ flex: 1 }}>Cancelar</Button>
          <Button disabled={submittingMovement} onClick={() => { setConfirmMovement('alteracao'); setConfirmTerm(false); }} style={{ flex: 1, background: theme.primary, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
        </div>
      </div>
    </div>
    );
  };

  const renderMovimentacao = () => {
    const movementContent = movementPageContent[activeMovementTab] || movementPageContent.inclusao;

    return (
      <div>
        <SectionTitle title={movementContent.title} subtitle={movementContent.subtitle} />
        {activeMovementTab === 'inclusao' && renderInclusao()}
        {activeMovementTab === 'exclusao' && renderExclusao()}
        {activeMovementTab === 'alteracao' && renderAlteracao()}
      </div>
    );
  };

  const renderSolicitacoes = () => (
    <div>
      <SectionTitle 
        title="Solicitações" 
        subtitle="Acompanhe o histórico e status de todas as suas demandas."
        action={<Button onClick={() => { setActiveSection('movimentacao'); setActiveMovementTab('inclusao'); }} style={{ background: theme.blue, color: '#fff' }}><FileText size={14}/> Nova Solicitação</Button>}
      />
      <section style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
            <Input value={solicitacoesSearch} onChange={(event) => setSolicitacoesSearch(event.target.value)} placeholder="Buscar por protocolo, CPF ou nome do beneficiário..." style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
          </div>
          <select value={solicitacoesTipo} onChange={(event) => setSolicitacoesTipo(event.target.value)} style={{ ...selectStyle, maxWidth: 150 }}>
            <option value="todos">Tipo: Todos</option>
            <option value="inclusao">Inclusão</option>
            <option value="exclusao">Exclusão</option>
            <option value="alteracao">Alteração</option>
          </select>
          <select value={solicitacoesStatus} onChange={(event) => setSolicitacoesStatus(event.target.value)} style={{ ...selectStyle, maxWidth: 150 }}>
            <option value="todos">Status: Todos</option>
            <option value="recebido">Recebido</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluído">Concluído</option>
          </select>
        </div>
        <table className="data-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
              <th style={{ textAlign: 'left' }}>Tipo</th>
              <th style={{ textAlign: 'left' }}>Protocolo</th>
              <th style={{ textAlign: 'left' }}>Nome do Beneficiário</th>
              <th style={{ textAlign: 'left' }}>CPF</th>
              <th style={{ textAlign: 'left' }}>Data de envio</th>
              <th style={{ textAlign: 'left' }}>Data Conclusão</th>
              <th style={{ textAlign: 'left' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredSolicitacoes.map((item) => (
              <tr key={item.id || item.protocolo} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ fontWeight: 600 }}>{item.tipoLabel || item.tipo}</td>
                <td style={{ color: theme.primary, fontWeight: 700 }}>#{item.protocolo}</td>
                <td>{item.beneficiario || '-'}</td>
                <td>{item.cpf || '-'}</td>
                <td>{item.dataEnvio || item.criadoEm || '-'}</td>
                <td style={{ color: theme.muted }}>{item.dataConclusao || '-'}</td>
                <td><StatusPill status={item.status}/></td>
                <td style={{ textAlign: 'center' }}>
                  <Button variant="outline" size="sm" onClick={() => setActiveSection('chat')} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                    <MessageCircle size={13}/> Chat
                  </Button>
                </td>
              </tr>
            ))}
            {filteredSolicitacoes.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: theme.muted, padding: 28 }}>Nenhuma solicitação encontrada.</td>
              </tr>
            )}
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
        {formulariosPorCategoria.map((section) => (
          <section key={section.id} style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{section.icon}</div>
            <h3 style={{ margin: '0 0 12px', color: theme.text, fontWeight: 700, fontSize: '0.95rem' }}>{section.title}</h3>
            <p style={{ margin: '0 0 12px', color: theme.muted, fontSize: '0.75rem' }}>{section.description}</p>
            <div style={{ display: 'grid', gap: 8 }}>
              {section.docs.length === 0 && (
                <div style={{ color: theme.muted, fontSize: '0.76rem', borderTop: `1px solid ${theme.border}`, paddingTop: 10 }}>
                  Nenhum documento disponível.
                </div>
              )}
              {section.docs.map((doc, docIdx) => (
                <div key={docIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: docIdx === 0 ? `1px solid ${theme.border}` : 'none', paddingTop: docIdx === 0 ? 8 : 0 }}>
                  <span style={{ color: theme.text, fontSize: '0.8rem', fontWeight: 600 }}>
                    <FileText size={12} style={{ display: 'inline', marginRight: 6 }} /> {doc.titulo}
                  </span>
                  <button onClick={() => openFormulario(doc)} style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer', color: theme.blue }} title="Baixar documento">
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  const renderChat = () => <section style={{ ...card, minHeight:560, display:'flex', flexDirection:'column', overflow:'hidden' }}>
    <div style={{ padding:'16px 18px', borderBottom:`1px solid ${theme.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, color:theme.text, fontWeight:900 }}><MessageCircle size={18}/>Atendimento ao Cliente</div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}><Button onClick={() => loadPortal(session)} variant="outline" style={{ fontSize:'0.75rem', display:'flex', gap:6 }}><RefreshCw size={13}/>Atualizar</Button><StatusPill status="Online agora" /></div>
    </div>
    <div style={{ flex:1, padding:18, background:'#f8fafc', overflowY:'auto' }}>
      {messages.length === 0 ? <EmptyState>Nenhuma mensagem ainda. Envie sua primeira solicitação para a equipe.</EmptyState> : messages.map((item) => (
        <div key={item.id} style={{ display:'flex', justifyContent:item.direction === 'incoming' ? 'flex-end' : 'flex-start', marginBottom:10 }}>
          <div style={{ maxWidth:'72%', background:item.direction === 'incoming' ? theme.blue : '#fff', color:item.direction === 'incoming' ? '#fff' : theme.text, border:`1px solid ${theme.border}`, borderRadius:14, padding:'10px 12px' }}>
            <div style={{ fontSize:'0.68rem', opacity:0.82, marginBottom:4 }}>{item.sender}</div>
            {item.text && <div style={{ fontSize:'0.88rem', whiteSpace: 'pre-wrap' }}>{item.text}</div>}
            {item.attachmentName && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', fontWeight:800 }}>
                <Paperclip size={13}/>
                {item.attachments?.[0]?.base64 ? (
                  <a href={item.attachments[0].base64} download={item.attachmentName} style={{ color: 'inherit', textDecoration: 'underline' }}>{item.attachmentName}</a>
                ) : (
                  <span>{item.attachmentName}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
    <div style={{ padding:16, borderTop:`1px solid ${theme.border}` }}>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Digite sua mensagem para o atendimento..." style={{ width:'100%', minHeight:86, border:`1px solid ${theme.border}`, borderRadius:12, padding:'10px 12px', resize:'vertical', fontFamily:'inherit', fontSize:'0.86rem' }} />
      <div style={{ display:'flex', justifyContent:'space-between', gap:10, marginTop:10 }}>
        <label style={{ border:`1px solid ${theme.border}`, borderRadius:10, padding:'8px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:theme.text, fontSize:'0.8rem' }}><Paperclip size={14}/> {attachment ? attachment.name : 'Anexar documento'}<Input type="file" onChange={(event) => setAttachment(event.target.files?.[0] || null)} style={{ display:'none' }} /></label>
        <Button onClick={sendMessage} style={{ background:theme.blue, color:'#fff', display:'flex', gap:6 }}><Send size={14}/>Enviar</Button>
      </div>
    </div>
  </section>;

  const renderPerfil = () => (
    <section style={{ ...card, padding: 24, maxWidth: 800 }}>
      <SectionTitle title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={20} color={theme.primary} /> Meu Perfil</span>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
        <div>
          <label style={{ ...fieldLabel, marginBottom: 6 }}>Nome</label>
          <Input value={perfilForm.nome} onChange={(e) => setPerfilForm(prev => ({...prev, nome: e.target.value}))} />
        </div>
        <div>
          <label style={{ ...fieldLabel, marginBottom: 6 }}>E-mail</label>
          <Input value={perfilForm.email} onChange={(e) => setPerfilForm(prev => ({...prev, email: e.target.value}))} />
        </div>
        <div>
          <label style={{ ...fieldLabel, marginBottom: 6 }}>Telefone</label>
          <Input value={perfilForm.telefone} onChange={(e) => setPerfilForm(prev => ({...prev, telefone: e.target.value}))} />
        </div>
        <div>
          <label style={{ ...fieldLabel, marginBottom: 6 }}>Cargo</label>
          <Input value={perfilForm.cargo} onChange={(e) => setPerfilForm(prev => ({...prev, cargo: e.target.value}))} />
        </div>
      </div>
      <Button 
        onClick={() => { setSuccessMsg('Perfil atualizado com sucesso!'); setTimeout(() => setSuccessMsg(''), 3000); }} 
        style={{ background: theme.blue, color: '#fff', display: 'flex', gap: 8, marginTop: 24 }}
      >
        <FileText size={16}/> Salvar alterações
      </Button>
    </section>
  );

  const renderConfiguracoes = () => (
    <section style={{ ...card, padding: 24, maxWidth: 600 }}>
      <SectionTitle title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={20} color={theme.primary} /> Configurações</span>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: theme.text }}>
          <input type="checkbox" checked={configForm.notifications} onChange={(e) => setConfigForm(prev => ({...prev, notifications: e.target.checked}))} style={{ width: 16, height: 16 }} />
          Receber notificações por e-mail
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: theme.text }}>
          <input type="checkbox" checked={configForm.autoUpdate} onChange={(e) => setConfigForm(prev => ({...prev, autoUpdate: e.target.checked}))} style={{ width: 16, height: 16 }} />
          Atualização automática de dados
        </label>
        
        <div style={{ marginTop: 20 }}>
          <Button onClick={() => setShowPassBox(!showPassBox)} style={{ background: theme.blue, color: '#fff' }}>
            <Shield size={16} style={{ marginRight: 8 }}/> Trocar acesso
          </Button>
        </div>
      </div>
    </section>
  );

  const renderLgpdAcceptanceScreen = () => {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 680, background: '#fff', borderRadius: 24, padding: 36, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛡️</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Termos de Privacidade e LGPD</h2>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>Versão ativa dos termos: v{lgpdVersion}</div>
            </div>
          </div>

          <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 20 }}>
            Para prosseguir e acessar o Portal do Cliente DonCor, é necessário que você leia e concorde com os termos de consentimento para tratamento de dados pessoais (Lei Geral de Proteção de Dados - Lei nº 13.709/2018).
          </p>

          <div style={{ 
            height: 260, 
            overflowY: 'auto', 
            background: '#f8fafc', 
            border: '1px solid #cbd5e1', 
            borderRadius: 12, 
            padding: 20, 
            fontSize: '0.88rem', 
            lineHeight: '1.6', 
            color: '#334155', 
            whiteSpace: 'pre-wrap',
            marginBottom: 24,
            fontFamily: 'system-ui, sans-serif'
          }}>
            {lgpdText || 'Carregando termos de privacidade...'}
          </div>

          {lgpdError && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: 10, padding: '10px 12px', marginBottom: 20, fontSize: '0.86rem' }}>
              {lgpdError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 28 }}>
            <input 
              type="checkbox" 
              id="lgpd-checkbox"
              checked={lgpdAcceptedCheckbox} 
              onChange={(e) => setLgpdAcceptedCheckbox(e.target.checked)} 
              style={{ width: 20, height: 20, cursor: 'pointer', marginTop: 2 }}
            />
            <label htmlFor="lgpd-checkbox" style={{ fontSize: '0.9rem', color: '#334155', cursor: 'pointer', userSelect: 'none', fontWeight: 600 }}>
              Declaro que li, compreendi e concordo integralmente com o tratamento de meus dados pessoais conforme descrito acima.
            </label>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button 
              onClick={handleLogout} 
              style={{ flex: 1, padding: '12px 20px', border: '1px solid #cbd5e1', borderRadius: 12, background: 'transparent', color: '#475569', cursor: 'pointer', fontWeight: 800 }}
            >
              Cancelar e Sair
            </button>
            <Button 
              onClick={handleAcceptLgpd} 
              disabled={!lgpdAcceptedCheckbox || lgpdSubmitting}
              style={{ flex: 1, padding: '12px 20px', background: lgpdAcceptedCheckbox ? theme.blue : '#cbd5e1', color: '#fff', borderRadius: 12, border: 0, fontWeight: 900, cursor: lgpdAcceptedCheckbox ? 'pointer' : 'not-allowed' }}
            >
              {lgpdSubmitting ? 'Registrando...' : 'Aceitar e Continuar'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPasswordChangeScreen = () => {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 540, background: '#fff', borderRadius: 24, padding: 36, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔑</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>Trocar Senha Temporária</h2>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>É obrigatório alterar a senha para o primeiro acesso.</div>
            </div>
          </div>

          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 24 }}>
            Sua conta utiliza uma senha temporária. Para sua total segurança, defina uma nova senha forte obedecendo os critérios abaixo.
          </p>

          <form onSubmit={handleSaveFirstPassword}>
            <div style={{ display: 'grid', gap: 18, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>Senha Temporária de Login</label>
                <Input 
                  type="password" 
                  value={tempSenha || senha} 
                  onChange={(e) => setTempSenha(e.target.value)} 
                  placeholder="Senha temporária utilizada para entrar" 
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>Nova Senha</label>
                <Input 
                  type="password" 
                  value={newPass} 
                  onChange={(e) => setNewPass(e.target.value)} 
                  placeholder="Mínimo 8 caracteres com caractere especial" 
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>Confirmar Nova Senha</label>
                <Input 
                  type="password" 
                  value={confirmNewPass} 
                  onChange={(e) => setConfirmNewPass(e.target.value)} 
                  placeholder="Repita a nova senha criada" 
                  required
                />
              </div>
            </div>

            {/* LIVE FEEDBACK CHECKLIST */}
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: 10 }}>Requisitos de Segurança:</div>
              <div style={{ display: 'grid', gap: 8, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isLengthValid ? '#16a34a' : '#dc2626' }}>
                  <span>{isLengthValid ? '✅' : '❌'}</span>
                  <span>Mínimo de 8 caracteres</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: containsSpecialChar ? '#16a34a' : '#dc2626' }}>
                  <span>{containsSpecialChar ? '✅' : '❌'}</span>
                  <span>Conter ao menos 1 caractere especial (ex: !, @, #, $, etc.)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isSequenceValid ? '#16a34a' : '#dc2626' }}>
                  <span>{isSequenceValid ? '✅' : '❌'}</span>
                  <span>Não conter sequências consecutivas ou iguais de 3 ou mais números (ex: 123, 321, 111)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isMatchValid ? '#16a34a' : '#dc2626' }}>
                  <span>{isMatchValid ? '✅' : '❌'}</span>
                  <span>As senhas devem ser idênticas</span>
                </div>
              </div>
            </div>

            {passError && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: 10, padding: '10px 12px', marginBottom: 20, fontSize: '0.86rem' }}>
                {passError}
              </div>
            )}

            {passSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 10, padding: '10px 12px', marginBottom: 20, fontSize: '0.86rem' }}>
                {passSuccess}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16 }}>
              <button 
                type="button"
                onClick={handleLogout} 
                style={{ flex: 1, padding: '12px 20px', border: '1px solid #cbd5e1', borderRadius: 12, background: 'transparent', color: '#475569', cursor: 'pointer', fontWeight: 800 }}
              >
                Voltar e Sair
              </button>
              <Button 
                type="submit" 
                disabled={!isFormValid || passSubmitting}
                style={{ flex: 1, padding: '12px 20px', background: isFormValid ? theme.blue : '#cbd5e1', color: '#fff', borderRadius: 12, border: 0, fontWeight: 900, cursor: isFormValid ? 'pointer' : 'not-allowed' }}
              >
                {passSubmitting ? 'Alterando...' : 'Confirmar Nova Senha'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderLgpdGovernance = () => {
    const filteredLogs = lgpdAceitesList.filter(item => {
      if (!lgpdSearchText) return true;
      const term = lgpdSearchText.toLowerCase();
      return (
        item.usuario?.toLowerCase().includes(term) ||
        item.empresa?.toLowerCase().includes(term) ||
        item.versao?.toLowerCase().includes(term) ||
        item.hash?.toLowerCase().includes(term)
      );
    });

    const uniqueUsersCount = new Set(lgpdAceitesList.map(item => item.documento)).size;

    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: theme.text, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🛡️</span> Governança LGPD e Termos Aceitos
            </h1>
            <p style={{ margin: '6px 0 0', color: theme.muted, fontSize: '0.88rem' }}>
              Auditabilidade e controle de consentimento dos usuários da plataforma.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button 
              onClick={handleExportLgpd} 
              style={{ background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontWeight: 800 }}
            >
              📥 Exportar
            </Button>
            <Button 
              onClick={() => {
                setNovaVersaoText(lgpdText);
                setNovaVersaoLabel((parseFloat(lgpdVersion) + 0.1).toFixed(1));
                setShowNovaVersaoModal(true);
              }} 
              style={{ background: theme.blue, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontWeight: 800 }}
            >
              ➕ Nova Versão
            </Button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
          <div style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '2.5rem' }}>💚</div>
            <div>
              <div style={{ color: theme.muted, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Total de Aceites</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.text, marginTop: 4 }}>{lgpdAceitesList.length}</div>
            </div>
          </div>

          <div style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '2.5rem' }}>📜</div>
            <div>
              <div style={{ color: theme.muted, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Versão Ativa</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.text, marginTop: 4 }}>v{lgpdVersion}</div>
            </div>
          </div>

          <div style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '2.5rem' }}>👥</div>
            <div>
              <div style={{ color: theme.muted, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Usuários Únicos</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.text, marginTop: 4 }}>{uniqueUsersCount || lgpdAceitesList.length}</div>
            </div>
          </div>
        </div>

        <div style={{ ...card, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: theme.text }}>Registro de Atividades</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 340 }}>
              <span style={{ color: theme.muted }}>🔍</span>
              <Input 
                placeholder="Buscar por usuário, hash, versão..." 
                value={lgpdSearchText} 
                onChange={(e) => setLgpdSearchText(e.target.value)} 
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.border}`, color: theme.muted, fontSize: '0.8rem', fontWeight: 800 }}>
                  <th style={{ padding: '12px 16px' }}>USUÁRIO</th>
                  <th style={{ padding: '12px 16px' }}>EMPRESA</th>
                  <th style={{ padding: '12px 16px' }}>VERSÃO</th>
                  <th style={{ padding: '12px 16px' }}>DATA/HORA</th>
                  <th style={{ padding: '12px 16px' }}>IP</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', color: theme.muted, fontSize: '0.9rem' }}>
                      Nenhum aceite correspondente encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item, index) => (
                    <tr key={item.id || index} style={{ borderBottom: `1px solid ${theme.border}`, fontSize: '0.88rem', color: theme.text }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px', fontWeight: 800 }}>{item.usuario}</td>
                      <td style={{ padding: '14px 16px' }}>{item.empresa || 'Todas'}</td>
                      <td style={{ padding: '14px 16px' }}><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>{item.versao}</span></td>
                      <td style={{ padding: '14px 16px' }}>{item.criadoEm || item.createdAt}</td>
                      <td style={{ padding: '14px 16px', color: theme.muted }}>{item.ip}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedAceite(item)}
                          style={{ border: 0, background: '#eff6ff', color: theme.blue, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                        >
                          👁️ Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedAceite && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 30, width: '100%', maxWidth: 600, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: theme.text }}>Comprovante de Aceite LGPD</h3>
                <button onClick={() => setSelectedAceite(null)} style={{ border: 0, background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: theme.muted }}>&times;</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, fontSize: '0.88rem' }}>
                <div>
                  <div style={{ color: theme.muted, fontWeight: 700 }}>Usuário:</div>
                  <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedAceite.usuario}</div>
                </div>
                <div>
                  <div style={{ color: theme.muted, fontWeight: 700 }}>Documento:</div>
                  <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedAceite.documento}</div>
                </div>
                <div>
                  <div style={{ color: theme.muted, fontWeight: 700 }}>Empresa:</div>
                  <div style={{ color: theme.text, marginTop: 2 }}>{selectedAceite.empresa || 'Todas'}</div>
                </div>
                <div>
                  <div style={{ color: theme.muted, fontWeight: 700 }}>Versão Aceita:</div>
                  <div style={{ color: theme.text, marginTop: 2 }}>{selectedAceite.versao}</div>
                </div>
                <div>
                  <div style={{ color: theme.muted, fontWeight: 700 }}>Data e Hora:</div>
                  <div style={{ color: theme.text, marginTop: 2 }}>{selectedAceite.criadoEm || selectedAceite.createdAt}</div>
                </div>
                <div>
                  <div style={{ color: theme.muted, fontWeight: 700 }}>Endereço IP:</div>
                  <div style={{ color: theme.text, marginTop: 2 }}>{selectedAceite.ip}</div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ color: theme.muted, fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>Hash de Consentimento:</div>
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '10px 12px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all' }}>
                  {selectedAceite.hash}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={() => setSelectedAceite(null)} style={{ background: theme.blue, color: '#fff', fontWeight: 800 }}>
                  Fechar Comprovante
                </Button>
              </div>
            </div>
          </div>
        )}

        {showNovaVersaoModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 30, width: '100%', maxWidth: 680, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: theme.text }}>Publicar Nova Versão dos Termos LGPD</h3>
                <button onClick={() => setShowNovaVersaoModal(false)} style={{ border: 0, background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: theme.muted }}>&times;</button>
              </div>

              <form onSubmit={handleSaveNovaVersao}>
                <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: theme.text, marginBottom: 6 }}>Identificador de Versão</label>
                    <Input 
                      value={novaVersaoLabel} 
                      onChange={(e) => setNovaVersaoLabel(e.target.value)} 
                      placeholder="Ex: 1.1" 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: theme.text, marginBottom: 6 }}>Texto dos Termos LGPD</label>
                    <textarea 
                      value={novaVersaoText} 
                      onChange={(e) => setNovaVersaoText(e.target.value)} 
                      rows={8}
                      style={{ width: '100%', border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, fontSize: '0.88rem', color: theme.text, resize: 'vertical' }}
                      placeholder="Escreva os termos legais..." 
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button 
                    type="button" 
                    onClick={() => setShowNovaVersaoModal(false)} 
                    style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: 10, background: 'transparent', color: theme.muted, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <Button type="submit" style={{ background: theme.blue, color: '#fff', fontWeight: 800 }}>
                    Publicar Termos
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'perfil': return renderPerfil();
      case 'configuracoes': return renderConfiguracoes();
      case 'contratos': return renderContratos();
      case 'faturas': return renderFaturas();
      case 'bi': return renderBi();
      case 'movimentacao': return renderMovimentacao();
      case 'solicitacoes': return renderSolicitacoes();
      case 'formularios': return renderFormularios();
      case 'chat': return renderChat();
      case 'lgpd': 
        if (!isDonfim) return renderDashboard();
        return renderLgpdGovernance();
      default: return renderDashboard();
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:theme.bg, display:'grid', gridTemplateColumns:'278px 1fr' }}>
      <aside style={{ background:theme.navy, color:'#fff', padding:20, display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'6px 4px 18px', borderBottom:'1px solid #ffffff1f' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><DoncorLogo size={28} showText={true} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ffffff24', paddingLeft: 10, marginLeft: 4 }}>
            <div style={{ fontWeight:900, fontSize:'0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>{empresa}</div>
            <div style={{ color:'#cbd5e1', fontSize:'0.65rem', fontWeight: 600 }}>Portal do Cliente</div>
          </div>
        </div>
        <Button onClick={() => { setActiveSection('movimentacao'); setActiveMovementTab('inclusao'); }} style={{ background:theme.blue, color:'#fff', justifyContent:'flex-start', gap:8 }}><FileText size={15}/>Novo chamado</Button>
        <nav style={{ display:'grid', gap:6 }}>
          {filteredMenuItems.map((item) => (
            <React.Fragment key={item.id}>
              <button onClick={() => setActiveSection(item.id)} style={{ border:0, borderRadius:12, padding:'10px 12px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, background:activeSection === item.id ? '#ffffff18' : 'transparent', color:activeSection === item.id ? '#fff' : '#cbd5e1', fontWeight:activeSection === item.id ? 900 : 700 }}>
                {typeof item.icon === 'string' ? (
                  <span style={{ fontSize: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 17, height: 17 }}>{item.icon}</span>
                ) : (
                  <item.icon size={17}/>
                )}{item.label}
              </button>
              {item.id === 'movimentacao' && activeSection === 'movimentacao' && (
                <div style={{ display:'grid', gap:4, margin:'-2px 0 2px 28px', paddingLeft:10, borderLeft:'1px solid #ffffff24' }}>
                  {movementSubItems.map((subItem) => (
                    <button key={subItem.id} onClick={() => { setActiveSection('movimentacao'); setActiveMovementTab(subItem.id); }} style={{ border:0, borderRadius:10, padding:'8px 10px', cursor:'pointer', textAlign:'left', background:activeMovementTab === subItem.id ? '#ffffff18' : 'transparent', color:activeMovementTab === subItem.id ? '#fff' : '#cbd5e1', fontWeight:activeMovementTab === subItem.id ? 900 : 700, fontSize:'0.82rem' }}>
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>
        <div style={{ marginTop:'auto', borderTop:'1px solid #ffffff1f', paddingTop:14 }}>
          <button onClick={handleLogout} style={{ width:'100%', border:0, background:'transparent', color:'#cbd5e1', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer', fontWeight:800 }}><LogOut size={17}/>Sair</button>
        </div>
      </aside>
      <div style={{ minWidth:0 }}>
        <header style={{ background:'#fff', borderBottom:`1px solid ${theme.border}`, padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:5 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:14, background:'#eff6ff', color:theme.blue, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Building2 size={19}/>
            </div>
            <div>
              <strong style={{ color:theme.text, fontSize:'1rem' }}>{empresa}</strong>
              <div style={{ color:theme.muted, fontSize:'0.78rem' }}>{session.documento}</div>
            </div>
          </div>
          <div style={{ width:420 }}><Input placeholder="Buscar..." /></div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button
              onClick={() => {
                setActiveSection('chat');
                const unread = messages.filter(m => m.direction === 'incoming' && !m.read).length;
                if (unread > 0) markPortalDonCorChatRead({ documento: session.documento, empresa: session.empresa }).then(() => loadPortal(session));
              }}
              style={{ border:`1px solid ${theme.border}`, background:'#fff', borderRadius:12, padding:9, color:theme.muted, position: 'relative', cursor: 'pointer' }}
            >
              <Bell size={16}/>
              {messages.filter(m => m.direction === 'incoming' && !m.read).length > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, background: '#e63757', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '50%' }}>
                  {messages.filter(m => m.direction === 'incoming' && !m.read).length}
                </span>
              )}
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ border:`1px solid ${theme.border}`, background:'#f8fafc', borderRadius:12, padding:'6px 14px', color:theme.text, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              >
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: theme.primary }}>{perfilForm.nome}</span>
                </div>
                <ChevronDown size={14} color={theme.muted}/>
              </button>
              
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220, background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 50 }}>
                  <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${theme.border}`, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 900, color: theme.primary, fontSize: '0.95rem' }}>{perfilForm.nome}</div>
                    <div style={{ color: theme.muted, fontSize: '0.75rem', marginTop: 2 }}>{perfilForm.email}</div>
                    <div style={{ color: theme.muted, fontSize: '0.75rem', marginTop: 2 }}>{perfilForm.cargo}</div>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <button onClick={() => { setActiveSection('perfil'); setShowProfileMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: theme.text, fontSize: '0.85rem', borderRadius: 8 }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <User size={16} color={theme.blue} /> Meu Perfil
                    </button>
                    <button onClick={() => { setActiveSection('configuracoes'); setShowProfileMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: theme.text, fontSize: '0.85rem', borderRadius: 8 }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <Settings size={16} color={theme.blue} /> Configurações
                    </button>
                  </div>
                  <div style={{ padding: '8px', borderTop: `1px solid ${theme.border}` }}>
                    <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: '#e63757', fontSize: '0.85rem', borderRadius: 8 }} onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f2'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <LogOut size={16} /> Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main style={{ padding:24, maxWidth:1320, margin:'0 auto' }}>
          {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>{error}</div>}
          {successMsg && <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#047857', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{successMsg}</div>}
          {passMsg && <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#047857', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{passMsg}</div>}
          {showPassBox && <section style={{ ...card, padding:16, marginBottom:16 }}><h2 style={{ fontSize:'1rem', color:theme.text, margin:'0 0 12px' }}>Alterar senha de acesso</h2><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, alignItems:'end' }}><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Senha atual</label><Input type="password" value={senhaAtual} onChange={(e)=>setSenhaAtual(e.target.value)} placeholder="Senha atual" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Nova senha</label><Input type="password" value={novaSenha} onChange={(e)=>setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Confirmar nova senha</label><Input type="password" value={confirmaSenha} onChange={(e)=>setConfirmaSenha(e.target.value)} placeholder="Repita a nova senha" /></div><Button onClick={handleChangePass} style={{ background:theme.blue, color:'#fff' }}>Salvar senha</Button></div></section>}
          {loading && <div style={{ marginBottom:14, color:theme.muted, display:'flex', alignItems:'center', gap:8 }}><Activity size={16}/>Atualizando informações do cliente...</div>}
          {renderActiveSection()}
        </main>
      </div>
      {confirmMovement && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', color: theme.text, display: 'flex', alignItems: 'center', gap: 10 }}><FileText size={22} color={theme.primary} /> Confirmar Solicitação</h3>
            
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', color: theme.text, border: `1px solid ${theme.border}` }}>
              {confirmMovement === 'inclusao' && (
                <>
                  <div style={{ marginBottom: 4 }}><strong>Movimentação:</strong> Inclusão</div>
                  <div style={{ marginBottom: 4 }}><strong>Nome:</strong> {movementForms[confirmMovement].nome || '-'}</div>
                  <div style={{ marginBottom: 4 }}><strong>CPF:</strong> {movementForms[confirmMovement].cpf || '-'}</div>
                  <div><strong>Contrato:</strong> {movementForms[confirmMovement].contrato || contratos?.[0]?.contrato || '-'}</div>
                </>
              )}
              {confirmMovement === 'exclusao' && (
                <>
                  <div style={{ marginBottom: 4 }}><strong>Movimentação:</strong> Exclusão</div>
                  <div style={{ marginBottom: 4 }}><strong>Beneficiário:</strong> {movementForms[confirmMovement].nome || '-'}</div>
                  <div style={{ marginBottom: 4 }}><strong>Contrato:</strong> {movementForms[confirmMovement].contrato || contratos?.[0]?.contrato || '-'}</div>
                  <div><strong>Motivo:</strong> {movementForms[confirmMovement].motivoExclusao || '-'}</div>
                </>
              )}
              {confirmMovement === 'alteracao' && (
                <>
                  <div style={{ marginBottom: 4 }}><strong>Movimentação:</strong> Alteração</div>
                  <div style={{ marginBottom: 4 }}><strong>Detalhes:</strong> {movementForms[confirmMovement].detalhes || '-'}</div>
                  <div><strong>Contrato:</strong> {movementForms[confirmMovement].contrato || contratos?.[0]?.contrato || '-'}</div>
                </>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: theme.muted, marginBottom: 24, cursor: 'pointer' }}>
              <input type="checkbox" checked={confirmTerm} onChange={(e) => setConfirmTerm(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              Confirmo a leitura e o envio destas informações.
            </label>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="outline" onClick={() => setConfirmMovement(null)} style={{ flex: 1 }}>Revisar Dados</Button>
              <Button disabled={!confirmTerm || submittingMovement} onClick={() => { setConfirmMovement(null); submitMovimentacao(confirmMovement); }} style={{ flex: 1, background: confirmTerm ? theme.primary : theme.muted, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalDonCor;
