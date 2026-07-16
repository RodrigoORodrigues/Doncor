import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Bell, Building2, Download, Eye, FileText, FolderOpen, HelpCircle, Home, LogOut, MessageCircle, Paperclip, Receipt, RefreshCw, Search, Send, Shield, UploadCloud, UserMinus, UserPlus, User, Settings, ChevronDown, Trash2, Mail, Phone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import DoncorLogo from '../components/DoncorLogo';
import { formatCPF, formatCNPJ, formatCPFOrCNPJ, formatPhone, validateCPF, validateCNPJ, validateCPFOrCNPJ } from '../lib/utils';
import {
  loginPortalDonCor,
  fetchPortalDonCorResumo,
  fetchPortalDonCorFormularios,
  fetchPortalDonCorSolicitacoes,
  fetchContratosEmpresarial,
  createPortalDonCorMovimentacao,
  deletePortalDonCorSolicitacao,
  fetchPortalDonCorChat,
  getPortalFormularioDownloadUrl,
  sendPortalDonCorChat,
  alterarSenhaPortalDonCor,
  esqueciSenhaPortalDonCor,
  atualizarPerfilPortalDonCor,
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
    nomeMae: '',
    cpf: '',
    dataNascimento: '',
    estadoCivil: '',
    parentesco: 'Titular',
    genero: '',
    email: '',
    telefone: '',
    detalhes: '',
    tipoMovimentacao: 'No vencimento',
    outrosDescricao: '',
    outraOperadora: '',
  },
  exclusao: {
    operadora: '',
    planos: ['Dental'],
    beneficiario: '',
    cpf: '',
    detalhes: '',
    tipoMovimentacao: 'No vencimento',
    outrosDescricao: '',
    outraOperadora: '',
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
  rawFile: file,
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
  const neutral = normalized.includes('recebido') || normalized.includes('enviado') || normalized.includes('abert');
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
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
    <div style={{ flex: '1 1 240px' }}>
      <h2 style={{ margin: 0, color: theme.text, fontSize: '1.22rem', fontWeight: 900 }}>{title}</h2>
      {subtitle && <p style={{ margin: '5px 0 0', color: theme.muted, fontSize: '0.86rem' }}>{subtitle}</p>}
    </div>
    {action && <div style={{ flexShrink: 0 }}>{action}</div>}
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
  const [validationErrors, setValidationErrors] = useState(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState({ inclusao: false, exclusao: false, alteracao: false });
  const [showValidationModal, setShowValidationModal] = useState(false);
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
  const [perfilForm, setPerfilForm] = useState({ nome: '', email: '', telefone: '', cargo: '', logo: '' });

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
        cargo: session.cargo || 'Cliente',
        logo: session.logo || ''
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
  const [fixedOperadoras, setFixedOperadoras] = useState([]);

  const handleAddFixedOperadora = (name) => {
    if (name && name.trim()) {
      const trimmed = name.trim();
      setFixedOperadoras((prev) => {
        if (!prev.includes(trimmed)) {
          return [...prev, trimmed];
        }
        return prev;
      });
    }
  };
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const totalInclusoes = useMemo(() => payload?.totalInclusoes || 0, [payload]);
  const [messages, setMessages] = useState([]);
  const filteredChatMessages = useMemo(() => messages.filter((m) => !m.protocolo), [messages]);
  const [contratosDb, setContratosDb] = useState([]);
  const [contratosSearch, setContratosSearch] = useState('');
  const [contratosStatusFilter, setContratosStatusFilter] = useState('Todos');
  const [contratosVigenciaFilter, setContratosVigenciaFilter] = useState('Todas');
  const [selectedContratoDetail, setSelectedContratoDetail] = useState(null);
  const [selectedProtocolDetail, setSelectedProtocolDetail] = useState(null);
  const [showBeneficiariesModal, setShowBeneficiariesModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [previewAtt, setPreviewAtt] = useState(null);

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
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  const empresa = session?.empresa || session?.nome || 'Cliente';

  // Security evaluation conditions
  const needsLgpdAcceptance = session && !session.lgpdAceito;
  const needsPasswordChange = session && session.lgpdAceito && !session.senhaAlterada;

  const isDonfim = useMemo(() => {
    return session?.nome?.toLowerCase() === 'donfim' || session?.email?.toLowerCase().includes('donfim') || perfilForm?.nome?.toLowerCase() === 'donfim' || perfilForm?.cargo?.toLowerCase() === 'master';
  }, [session, perfilForm]);

  const filteredMenuItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'contratos', label: 'Contratos', icon: FolderOpen },
      { id: 'faturas', label: 'Faturas', icon: Receipt },
    ];
    if (session?.acessoSinistralidade) {
      items.push({ id: 'bi', label: 'Sinistralidade e BI', icon: BarChart3 });
    }
    items.push(
      { id: 'movimentacao', label: 'Movimentação', icon: RefreshCw },
      { id: 'solicitacoes', label: 'Solicitações', icon: FileText },
      { id: 'formularios', label: 'Formulários e Manuais', icon: FileText },
      { id: 'chat', label: 'Chat', icon: MessageCircle }
    );
    return items;
  }, [session]);

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
      const [resumo, chat, solicitacoesData, formulariosData, sinistroData, dbContratosData] = await Promise.all([
        fetchPortalDonCorResumo(currentSession.documento),
        fetchPortalDonCorChat({ documento: currentSession.documento, empresa: currentSession.empresa }),
        fetchPortalDonCorSolicitacoes({ documento: currentSession.documento }),
        fetchPortalDonCorFormularios(),
        fetchPortalDonCorSinistralidade(currentSession.documento),
        fetchContratosEmpresarial(currentSession.documento, 'todos', '')
      ]);
      setPayload(resumo);
      setMessages(chat || []);
      setSolicitacoes(solicitacoesData || []);
      setFormularios(formulariosData || []);
      setSinistralidade(sinistroData || []);
      setContratosDb(dbContratosData || []);
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
      const data = await esqueciSenhaPortalDonCor({
        documento,
        email: esqueciEmail,
        novaSenha: esqueciSenha
      });
      setEsqueciSuccess(data.message || 'Senha redefinida com sucesso.');
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

  const handleDeleteSolicitacao = async (id) => {
    if (!id) return;
    if (!window.confirm('Tem certeza de que deseja excluir esta solicitação permanentemente?')) return;
    try {
      await deletePortalDonCorSolicitacao(id);
      setSolicitacoes(prev => prev.filter(item => item.id !== id));
      alert('Solicitação excluída com sucesso.');
    } catch (err) {
      alert('Erro ao excluir a solicitação.');
    }
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
    setAttemptedSubmit((prev) => ({ ...prev, [section]: false }));
    setValidationErrors((prev) => (prev?.section === section ? null : prev));
  };

  const validateMovementForm = (section) => {
    const missingFields = [];
    const form = movementForms[section];
    const attachments = movementAttachments[section];

    if (section === 'inclusao') {
      if (!form.operadora) missingFields.push('Operadora');
      if (form.operadora === 'Outra' && !form.outraOperadora?.trim()) missingFields.push('Nome da outra Operadora');
      if (!form.planos || form.planos.length === 0) missingFields.push('Pelo menos um Plano (Saúde/Dental)');
      if (!form.beneficiario?.trim()) missingFields.push('Nome Completo do Beneficiário');
      if (!form.nomeMae?.trim()) missingFields.push('Nome da Mãe');
      if (!form.cpf?.trim()) {
        missingFields.push('CPF');
      } else if (!validateCPF(form.cpf)) {
        missingFields.push('CPF inválido');
      }
      if (!form.dataNascimento) missingFields.push('Data de Nascimento');
      if (!form.estadoCivil) missingFields.push('Estado Civil');
      if (!form.parentesco) missingFields.push('Parentesco');
      if (!form.genero) missingFields.push('Gênero');
      if (!form.email?.trim()) missingFields.push('E-mail');
      if (!form.telefone?.trim()) {
        missingFields.push('Telefone');
      } else {
        const cleanPhone = form.telefone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
          missingFields.push('Telefone inválido (mínimo de 10 ou 11 dígitos)');
        }
      }

      // Attachments check - only 'Outros' is optional!
      const requiredDocs = ['RG / CPF', 'Comprovante de Residência', 'CTPS / eSocial', 'Formulário Assinado'];
      requiredDocs.forEach(doc => {
        const att = attachments?.[doc];
        if (!att || !att.name || att.size === 0) {
          missingFields.push(`Anexo: ${doc}`);
        }
      });
      // description for 'Outros' if uploaded
      if (attachments?.['Outros'] && attachments['Outros'].name && !form.outrosDescricao?.trim()) {
        missingFields.push('Descrição do anexo Outros');
      }
    } else if (section === 'exclusao') {
      if (!form.operadora) missingFields.push('Operadora');
      if (form.operadora === 'Outra' && !form.outraOperadora?.trim()) missingFields.push('Nome da outra Operadora');
      if (!form.planos || form.planos.length === 0) missingFields.push('Pelo menos um Plano (Saúde/Dental)');
      if (!form.beneficiario?.trim()) missingFields.push('Nome Completo');
      if (!form.cpf?.trim()) {
        missingFields.push('CPF');
      } else if (!validateCPF(form.cpf)) {
        missingFields.push('CPF inválido');
      }
      
      // Attachments check - only 'Outros' is optional!
      const requiredDocs = ['Termo de Rescisão', 'Formulário de Exclusão Assinado'];
      requiredDocs.forEach(doc => {
        const att = attachments?.[doc];
        if (!att || !att.name || att.size === 0) {
          missingFields.push(`Anexo: ${doc}`);
        }
      });
      // description for 'Outros' if uploaded
      if (attachments?.['Outros'] && attachments['Outros'].name && !form.outrosDescricao?.trim()) {
        missingFields.push('Descrição do anexo Outros');
      }
    } else if (section === 'alteracao') {
      if (!form.planos || form.planos.length === 0) missingFields.push('Selecione pelo menos um Contrato/Plano');
      if (!form.beneficiario?.trim()) missingFields.push('Nome Completo');
      if (!form.cpf?.trim()) {
        missingFields.push('CPF');
      } else if (!validateCPF(form.cpf)) {
        missingFields.push('CPF inválido');
      }
      
      // Support files list attachments are required
      if (!attachments || attachments.length === 0) {
        missingFields.push('Anexo de apoio (Selecione pelo menos um arquivo)');
      }
    }

    return missingFields;
  };

  const isFieldInvalid = (section, fieldName) => {
    if (!attemptedSubmit[section]) return false;
    const form = movementForms[section];
    if (fieldName === 'planos') {
      return !form.planos || form.planos.length === 0;
    }
    if (fieldName === 'outraOperadora') {
      return form.operadora === 'Outra' && (!form.outraOperadora || !form.outraOperadora.trim());
    }
    if (fieldName === 'detalhes') {
      return false;
    }
    if (fieldName === 'outrosDescricao') {
      const att = movementAttachments[section]?.[ 'Outros' ];
      const hasOutros = att && att.name && att.size > 0;
      return hasOutros && (!form.outrosDescricao || !form.outrosDescricao.trim());
    }
    const val = form[fieldName];
    if (!val || (typeof val === 'string' && !val.trim())) return true;
    if (fieldName === 'cpf') {
      return !validateCPF(val);
    }
    if (fieldName === 'telefone') {
      const cleanPhone = val.replace(/\D/g, '');
      return cleanPhone.length < 10 || cleanPhone.length > 11;
    }
    return false;
  };

  const isAttachmentInvalid = (section, docName) => {
    if (!attemptedSubmit[section]) return false;
    if (section === 'alteracao') {
      return !movementAttachments.alteracao || movementAttachments.alteracao.length === 0;
    }
    if (docName === 'Outros') {
      return false; // Optional
    }
    const att = movementAttachments[section]?.[docName];
    return !att || !att.name || att.size === 0;
  };

  const handleTrySubmit = (section) => {
    setAttemptedSubmit((prev) => ({ ...prev, [section]: true }));
    const missing = validateMovementForm(section);
    if (missing.length > 0) {
      setValidationErrors({ section, fields: missing });
      setShowValidationModal(true);
      return;
    }
    setValidationErrors(null);
    setConfirmMovement(section);
    setConfirmTerm(false);
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
    const resolvedOperadora = form.operadora === 'Outra' ? (form.outraOperadora || 'Outra') : form.operadora;
    if (form.operadora === 'Outra' && form.outraOperadora?.trim()) {
      handleAddFixedOperadora(form.outraOperadora);
    }
    try {
      const attachmentsList = getMovementAttachments(section);
      const attachmentsWithBase64 = await Promise.all(
        attachmentsList.map(async (att) => {
          if (att.rawFile && att.rawFile instanceof File) {
            try {
              const base64 = await fileToBase64(att.rawFile);
              const { rawFile, ...rest } = att;
              return { ...rest, base64 };
            } catch (err) {
              console.error('Erro ao converter arquivo para base64:', err);
            }
          }
          const { rawFile, ...rest } = att;
          return rest;
        })
      );

      const saved = await createPortalDonCorMovimentacao({
        tipo: section,
        documento: session.documento,
        empresa,
        contrato,
        ...form,
        operadora: resolvedOperadora,
        anexos: attachmentsWithBase64,
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
    const list = [];
    if (contratosDb && contratosDb.length > 0) {
      contratosDb.forEach((c) => {
        list.push({
          contrato: c.numero || 'Contrato',
          plano: c.plano || c.produto || 'Plano empresarial',
          seguradora: c.seguradora || '-',
          status: c.status || 'Ativo',
          vigencia: c.vigencia || '-',
          vencimento: c.vencimento || '-',
          vidas: c.vidas || 0,
          valorMensal: c.valorMensal || 'R$ 0,00',
          tipo: c.tipo || 'Empresarial'
        });
      });
    } else {
      const map = new Map();
      faturas.forEach((item) => {
        const key = item.contrato || item.numero || 'Contrato';
        if (!map.has(key)) map.set(key, { contrato: key, plano: item.seguradora || 'Plano empresarial', seguradora: item.seguradora || '-', status: 'Ativo', vigencia: item.competencia || '-', vidas: item.vidas || '-' });
      });
      if (map.size === 0 && payload?.resumo?.contratos) map.set('Contrato Principal', { contrato: 'Contrato Principal', plano: 'Plano empresarial', seguradora: 'DonCor', status: 'Ativo', vigencia: '-', vidas: '-' });
      list.push(...Array.from(map.values()));
    }
    return list;
  }, [contratosDb, faturas, payload]);

  const uniqueOperadoras = useMemo(() => {
    const set = new Set();
    contratos.forEach(item => {
      if (item.seguradora && item.seguradora !== '-' && item.seguradora !== 'DonCor') {
        set.add(item.seguradora);
      }
    });
    return Array.from(set);
  }, [contratos]);

  const availableOperadoras = useMemo(() => {
    const list = [...uniqueOperadoras];
    fixedOperadoras.forEach(op => {
      if (op && op.trim() && !list.includes(op.trim())) {
        list.push(op.trim());
      }
    });
    return list;
  }, [uniqueOperadoras, fixedOperadoras]);

  const filteredContratosList = useMemo(() => {
    let list = contratos;
    if (contratosSearch.trim()) {
      const term = contratosSearch.toLowerCase();
      list = list.filter(item => 
        String(item.contrato || '').toLowerCase().includes(term) ||
        String(item.plano || '').toLowerCase().includes(term) ||
        String(item.seguradora || '').toLowerCase().includes(term)
      );
    }
    if (contratosStatusFilter !== 'Todos') {
      list = list.filter(item => String(item.status || '').toLowerCase() === contratosStatusFilter.toLowerCase());
    }
    return list;
  }, [contratos, contratosSearch, contratosStatusFilter]);
  const filteredSolicitacoes = useMemo(() => {
    const term = solicitacoesSearch.trim().toLowerCase();
    return (solicitacoes || []).filter((item) => {
      const tipoOk = solicitacoesTipo === 'todos' || String(item.tipo || item.tipoLabel || '').toLowerCase() === solicitacoesTipo;
      const itemStatus = String(item.status || '').toLowerCase();
      const statusOk = solicitacoesStatus === 'todos' || 
        ((solicitacoesStatus === 'enviado' || solicitacoesStatus === 'recebido') && (itemStatus === 'enviado' || itemStatus === 'recebido')) ||
        itemStatus === solicitacoesStatus;
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
  const mensagensAtendimento = useMemo(() => filteredChatMessages.length, [filteredChatMessages]);
  const solicitacoesPorStatus = useMemo(() => {
    const base = [
      { key: 'recebido', label: 'Recebido', value: 0, color: theme.muted },
      { key: 'em andamento', label: 'Em andamento', value: 0, color: theme.warning },
      { key: 'concluido', label: 'Concluído', value: 0, color: theme.ok },
    ];
    solicitacoes.forEach((item) => {
      const status = plain(item.status);
      const target = base.find((entry) => status.includes(entry.key) || (entry.key === 'recebido' && (status.includes('recebido') || status.includes('enviado')))) || base[0];
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

  const solicitacoesPorMes = useMemo(() => {
    const counts = {};
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    solicitacoes.forEach(item => {
      if (item.createdAt) {
        const date = new Date(item.createdAt);
        const month = months[date.getMonth()];
        counts[month] = (counts[month] || 0) + 1;
      }
    });

    return months.map(month => ({
      name: month,
      value: counts[month] || 0
    }));
  }, [solicitacoes]);

  const maxSolicitacoesStatus = useMemo(() => Math.max(...solicitacoesPorStatus.map((item) => item.value), 1), [solicitacoesPorStatus]);
  const maxSolicitacoesTipo = useMemo(() => Math.max(...solicitacoesPorTipo.map((item) => item.value), 1), [solicitacoesPorTipo]);
  const ultimasSolicitacoes = useMemo(() => solicitacoes.slice(0, 4), [solicitacoes]);
  const demandasPendentes = useMemo(() => solicitacoes.filter((item) => !String(item.status || '').toLowerCase().includes('concl')).slice(0, 4), [solicitacoes]);
  const demandasConcluidas = useMemo(() => solicitacoes.filter((item) => String(item.status || '').toLowerCase().includes('concl')).slice(0, 4), [solicitacoes]);
  const inclusoesConcluidas = useMemo(() => {
    return solicitacoes.filter(item =>
      plain(item.status || '').includes('concl') &&
      plain(item.tipo || item.tipoLabel || '').includes('inclusao')
    );
  }, [solicitacoes]);

  const generoData = useMemo(() => {
    const M = inclusoesConcluidas.filter(item => plain(item.genero || '').includes('m')).length;
    const F = inclusoesConcluidas.filter(item => plain(item.genero || '').includes('f')).length;
    const total = M + F;
    return [
      { name: 'M', value: M, color: '#2C7BE5', percentage: total > 0 ? `${((M / total) * 100).toFixed(2).replace('.', ',')}%` : '0%' },
      { name: 'F', value: F, color: '#e63757', percentage: total > 0 ? `${((F / total) * 100).toFixed(2).replace('.', ',')}%` : '0%' }
    ];
  }, [inclusoesConcluidas]);

  const titularidadeData = useMemo(() => {
    const T = inclusoesConcluidas.filter(item => plain(item.parentesco || '').includes('titular')).length;
    const D = inclusoesConcluidas.filter(item => plain(item.parentesco || '').includes('dependente')).length;
    const total = T + D;
    return [
      { name: 'T', value: T, color: '#166534', percentage: total > 0 ? `${((T / total) * 100).toFixed(2).replace('.', ',')}%` : '0%' },
      { name: 'D', value: D, color: '#a3e635', percentage: total > 0 ? `${((D / total) * 100).toFixed(2).replace('.', ',')}%` : '0%' }
    ];
  }, [inclusoesConcluidas]);

  const vidasPorSeguradoraData = useMemo(() => {
    const data = contratos.reduce((acc, item) => {
      const seguradora = item.seguradora || 'Outros';
      acc[seguradora] = (acc[seguradora] || 0) + (parseInt(item.vidas) || 0);
      return acc;
    }, {});
    return Object.keys(data).map((key) => ({
      name: key,
      value: data[key],
      color: '#' + Math.floor(Math.random()*16777215).toString(16), // Placeholder color strategy
    }));
  }, [contratos]);

  const totalVidas = useMemo(() => contratos.reduce((acc, item) => acc + (parseInt(item.vidas) || 0), 0), [contratos]);

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
    
    const getMonthIndex = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return -1;
      const cleanStr = dateStr.split(',')[0].split(' ')[0].trim();
      if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-');
        if (parts.length >= 2) {
          if (parts[0].length === 4) {
            return parseInt(parts[1], 10) - 1;
          } else if (parts[2]?.length === 4) {
            return parseInt(parts[1], 10) - 1;
          }
        }
      }
      if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/');
        if (parts.length === 2) {
          if (parts[1].length === 4) {
            return parseInt(parts[0], 10) - 1;
          }
          if (parts[0].length === 4) {
            return parseInt(parts[1], 10) - 1;
          }
        } else if (parts.length >= 3) {
          return parseInt(parts[1], 10) - 1;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.getMonth();
      }
      return -1;
    };

    solicitacoes.forEach(s => {
      const dateStr = s.criadoEm || s.dataEnvio || s.createdAt || s.dataSolicitacao;
      const mIndex = getMonthIndex(dateStr);
      if (mIndex >= 0 && mIndex < 12) {
        data[mIndex].solicitacoes++;
      }
    });
    
    boletos.forEach(b => {
      const dateStr = b.vencimento || b.dataVencimento || b.competencia || b.criadoEm || b.createdAt;
      const mIndex = getMonthIndex(dateStr);
      if (mIndex >= 0 && mIndex < 12) {
        data[mIndex].boletos++;
      }
    });

    faturas.forEach(f => {
      const dateStr = f.vencimento || f.dataVencimento || f.competencia || f.criadoEm || f.createdAt;
      const mIndex = getMonthIndex(dateStr);
      if (mIndex >= 0 && mIndex < 12) {
        data[mIndex].boletos++;
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
  }, [solicitacoes, boletos, faturas]);

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
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>CNPJ ou CPF vinculado</label><Input value={documento} onChange={(event) => setDocumento(formatCPFOrCNPJ(event.target.value))} placeholder="Digite o CNPJ da empresa ou CPF" style={{ marginBottom:12 }} />
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>E-mail cadastrado</label><Input type="email" value={esqueciEmail} onChange={(event) => setEsqueciEmail(event.target.value)} placeholder="Digite o e-mail da conta" style={{ marginBottom:12 }} />
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>Nova Senha</label><Input type="password" value={esqueciSenha} onChange={(event) => setEsqueciSenha(event.target.value)} placeholder="Mínimo 6 caracteres" style={{ marginBottom:14 }} />
              <button type="button" onClick={() => setShowForgot(false)} style={{ border:0, background:'transparent', color:theme.muted, cursor:'pointer', fontSize:'0.84rem', marginBottom:14, padding:0, textDecoration: 'underline' }}>Voltar para o login</button>
              <Button type="submit" disabled={loading} style={{ width:'100%', background:theme.blue, color:'#fff', fontWeight:900 }}>{loading ? 'Redefinindo...' : 'Confirmar Nova Senha'}</Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ width: '100%', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 22, padding: 30, boxShadow: '0 24px 70px rgba(15,23,42,0.12)' }}>
              <div style={{ marginBottom: 24 }}><div style={{ marginBottom: 14 }}><DoncorLogo size={40} /></div><h2 style={{ margin: 0, fontSize: '1.55rem', color: theme.text }}>Entrar no Portal do Cliente</h2><p style={{ margin: '8px 0 0', color: theme.muted, fontSize: '0.9rem' }}>Use o CNPJ/CPF vinculado e sua senha de acesso.</p></div>
              {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{error}</div>}
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>CNPJ ou CPF vinculado</label><Input value={documento} onChange={(event) => setDocumento(formatCPFOrCNPJ(event.target.value))} placeholder="Digite o CNPJ da empresa ou CPF" style={{ marginBottom:12 }} />
              <label style={{ display:'block', color:theme.text, fontWeight:800, fontSize:'0.84rem', marginBottom:6 }}>Senha</label><Input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" style={{ marginBottom:10 }} />
              <button type="button" onClick={() => { setShowForgot(true); setError(''); }} style={{ border:0, background:'transparent', color:theme.blue, cursor:'pointer', fontSize:'0.78rem', marginBottom:14, padding:0 }}>Esqueci minha senha</button>
              <Button type="submit" disabled={loading} style={{ width:'100%', background:theme.blue, color:'#fff', fontWeight:900 }}>{loading ? 'Validando...' : 'Entrar no Portal do Cliente'}</Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <>
      <SectionTitle title={`Bem vindo ao seu Portal, ${empresa}`} subtitle="Resumo das operações ativas por seção." action={<Button onClick={() => { setActiveSection('movimentacao'); setActiveMovementTab('inclusao'); }} style={{ background: theme.blue, color: '#fff', display: 'flex', gap: 8 }}><FileText size={15}/>Novo chamado</Button>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:14, marginBottom:16 }}>
        <StatCard title="Contratos vigentes" value={payload?.resumo?.contratos || contratos.length || 0} subtitle="Ativos" icon={FolderOpen} onClick={() => setActiveSection('contratos')}/>
        <StatCard title="Boletos disponíveis" value={payload?.resumo?.boletos || boletos.length || 0} subtitle="PDFs no sistema" icon={Download} tone={theme.ok} onClick={() => setActiveSection('faturas')}/>
        <StatCard title="Solicitações abertas" value={solicitacoesAbertas} subtitle="Aguardando conclusão" icon={FileText} tone={theme.warning} onClick={() => setActiveSection('solicitacoes')}/>
        <StatCard title="Mensagens no chat" value={mensagensAtendimento} subtitle="Atendimento registrado" icon={MessageCircle} tone={theme.primary} onClick={() => setActiveSection('chat')}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, marginBottom:16 }}>
        <section style={{ ...card, padding:18 }}>
          <SectionTitle title="Solicitações por Mês" subtitle="Acompanhe o volume de solicitações ao longo dos últimos meses." />
          <div style={{ width: '100%', height: 300, marginTop: 20 }}>
            {solicitacoes.length === 0 ? (
              <EmptyState>Nenhuma solicitação encontrada.</EmptyState>
            ) : (
              <ResponsiveContainer>
                <BarChart data={solicitacoesPorMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: theme.muted, fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: theme.muted, fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" name="Solicitações" fill={theme.primary} radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Seção com os Gráficos adicionais de Gênero, Titularidade e Seguradora */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 32, borderTop: '1px solid #f0f2f5', paddingTop: 24 }}>
            {/* Gráfico de Gênero */}
            <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#15A4C4', color: '#fff', padding: '10px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.88rem', letterSpacing: '0.3px' }}>
                Qtde de Beneficiários por Gênero
              </div>
              <div style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', height: 220, maxWidth: 280, display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={generoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={0}
                        dataKey="value"
                        label={({ value, percentage }) => `${value} (${percentage})`}
                        labelLine={true}
                      >
                        {generoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} (${props.payload.percentage})`, name === 'M' ? 'Masculino' : 'Feminino']}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: theme.text, lineHeight: 1 }}>{totalInclusoes}</div>
                  </div>
                </div>
                
                {/* Legenda Gênero */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16, fontSize: '0.82rem', color: theme.text }}>
                  <span style={{ fontWeight: 700, color: '#4a5568' }}>Genero</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2C7BE5', display: 'inline-block' }} /> M
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e63757', display: 'inline-block' }} /> F
                  </span>
                </div>
              </div>
            </div>

            {/* Gráfico de Titularidade */}
            <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#15A4C4', color: '#fff', padding: '10px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.88rem', letterSpacing: '0.3px' }}>
                Qtde de Beneficiários por Titularidade
              </div>
              <div style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', height: 220, maxWidth: 280, display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={titularidadeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={0}
                        dataKey="value"
                        label={({ value, percentage }) => `${value} (${percentage})`}
                        labelLine={true}
                      >
                        {titularidadeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} (${props.payload.percentage})`, name === 'T' ? 'Titular' : 'Dependente']}
                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: theme.text, lineHeight: 1 }}>{totalInclusoes}</div>
                  </div>
                </div>
                
                {/* Legenda Titularidade */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16, fontSize: '0.82rem', color: theme.text }}>
                  <span style={{ fontWeight: 700, color: '#4a5568' }}>Titularidade</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#166534', display: 'inline-block' }} /> T
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#a3e635', display: 'inline-block' }} /> D
                  </span>
                </div>
              </div>
            </div>

            {/* Gráfico de Vidas por Seguradora */}
            <div style={{ background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#15A4C4', color: '#fff', padding: '10px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.88rem', letterSpacing: '0.3px' }}>
                Vidas por Seguradora
              </div>
              <div style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', height: 220, maxWidth: 280, display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vidasPorSeguradoraData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={0}
                        dataKey="value"
                      >
                        {vidasPorSeguradoraData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: '800', color: theme.text, lineHeight: 1 }}>{totalVidas}</div>
                  </div>
                </div>
                
                {/* Legenda Seguradoras */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginTop: 16, fontSize: '0.78rem', color: theme.text, width: '100%' }}>
                  {vidasPorSeguradoraData.map((item, index) => (
                    <span key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block' }} /> {item.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
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

  const renderContratos = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                  <div style={{ color: theme.muted, fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>CONTRATO ({item.tipo || 'Empresarial'})</div>
                  <h3 style={{ color: theme.text, fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{item.contrato}</h3>
                </div>
                <StatusPill status={item.status} />
              </div>
              <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.8rem' }}>
                  <span style={{ color: theme.muted }}>Plano:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                    {item.plano.split(',').map((p, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setSelectedPlan(p.trim());
                          setShowBeneficiariesModal(true);
                        }}
                        style={{ 
                          background: '#eff6ff', 
                          color: theme.blue, 
                          border: `1px solid ${theme.blue}`,
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {p.trim()}
                      </button>
                    ))}
                  </div>
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
              <Button onClick={() => setSelectedContratoDetail(item)} variant="outline" style={{ width: '100%', marginTop: 14, fontSize: '0.8rem' }}><Eye size={14}/> Visualizar</Button>
            </div>
          ))}
          {contratos.length === 0 && (
            <div style={{ colSpan: 3, padding: 24, textAlign: 'center', color: theme.muted }}>Nenhum contrato ativo encontrado.</div>
          )}
        </div>

        <section style={{ ...card, padding: 18, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <SectionTitle title="Detalhes dos Contratos" subtitle="Visualize informações completas com filtros avançados." />
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
              <Input value={contratosSearch} onChange={(e) => setContratosSearch(e.target.value)} placeholder="Filtrar por número, plano, seguradora..." style={{ paddingLeft: '32px', fontSize: '0.8rem' }} />
            </div>
            <select value={contratosStatusFilter} onChange={(e) => setContratosStatusFilter(e.target.value)} style={{ ...selectStyle, maxWidth: 200, flex: '1 1 150px' }}>
              <option value="Todos">Status: Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: '100%' }}>
            <table className="data-table" style={{ fontSize: '0.85rem', minWidth: '1000px', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Número do Contrato</th>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Seguradora</th>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Plano</th>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Vigência</th>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Vidas</th>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Valor Mensal</th>
                  <th style={{ textAlign: 'left', padding: '6px 14px' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '6px 14px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredContratosList.map((item) => (
                  <tr key={item.contrato} style={{ borderBottom: `1px solid ${theme.border}`, hover: { background: '#f8fafc' } }}>
                    <td style={{ fontWeight: 600, color: theme.primary, padding: '6px 14px' }}>{item.contrato}</td>
                    <td style={{ padding: '6px 14px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: item.tipo === 'PME' ? '#eff6ff' : '#f8fafc', color: item.tipo === 'PME' ? theme.blue : theme.text, border: `1px solid ${theme.border}` }}>
                        {item.tipo || 'Empresarial'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 14px' }}>{item.seguradora || '-'}</td>
                    <td style={{ padding: '6px 14px' }}>{item.plano}</td>
                    <td style={{ padding: '6px 14px' }}>{item.vigencia}</td>
                    <td style={{ padding: '6px 14px', fontWeight: 600 }}>{item.vidas}</td>
                    <td style={{ padding: '6px 14px' }}>{item.valorMensal || '-'}</td>
                    <td style={{ padding: '6px 14px' }}><StatusPill status={item.status}/></td>
                    <td style={{ textAlign: 'center', padding: '6px 14px' }}>
                      <button onClick={() => setSelectedContratoDetail(item)} style={{ border: 0, background: 'transparent', color: theme.blue, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredContratosList.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: theme.muted, padding: 24 }}>Nenhum contrato encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  };

  const renderFaturas = () => {
    const faturasChartData = faturas.map(f => {
      const cleanVal = parseFloat(String(f.valor || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      return {
        competencia: f.competencia || '-',
        valor: cleanVal,
        valorFormatado: f.valor
      };
    }).reverse();

    return (
      <div style={{ display: 'grid', gap: 20 }}>
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
      </div>
    );
  };

  const renderBi = () => {
    const biChartData = [
      { mes: 'Jan', sinistralidade: 68, limite: 75 },
      { mes: 'Fev', sinistralidade: 72, limite: 75 },
      { mes: 'Mar', sinistralidade: 78, limite: 75 },
      { mes: 'Abr', sinistralidade: 71, limite: 75 },
      { mes: 'Mai', sinistralidade: 69, limite: 75 },
      { mes: 'Jun', sinistralidade: 74, limite: 75 },
    ];

    return (
      <div style={{ display: 'grid', gap: 20 }}>
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
      </div>
    );
  };

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
      {validationErrors && validationErrors.section === 'inclusao' && (
        <div style={{ gridColumn: '1 / -1', background: '#FEF2F2', border: '2px solid #EF4444', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
          <h4 style={{ color: '#991B1B', fontWeight: 900, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
            ⚠️ ATENÇÃO: Informações Pendentes
          </h4>
          <p style={{ color: '#7F1D1D', fontSize: '0.88rem', margin: 0, fontWeight: 700 }}>
            Não foi possível prosseguir com o envio. Por favor, preencha todos os campos obrigatórios e anexe os documentos destacados em vermelho abaixo:
          </p>
          <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: '#7F1D1D', fontSize: '0.84rem', fontWeight: 600, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px' }}>
            {validationErrors.fields.map((err, i) => (
              <li key={i} style={{ listStyleType: 'disc' }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={fieldLabel}>Operadora *</label>
              <select
                style={{
                  ...selectStyle,
                  border: isFieldInvalid('inclusao', 'operadora') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'operadora') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                value={form.operadora}
                onChange={(event) => updateMovementField('inclusao', 'operadora', event.target.value)}
              >
                <option value="">Selecione a Operadora</option>
                {availableOperadoras.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
                <option value="Outra">Outra</option>
              </select>
              {isFieldInvalid('inclusao', 'operadora') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ Selecione uma Operadora.
                </span>
              )}
              {form.operadora === 'Outra' && (
                <div style={{ marginTop: 14 }}>
                  <label style={fieldLabel}>Nome da Operadora *</label>
                  <Input
                    placeholder="Digite o nome da outra operadora"
                    value={form.outraOperadora || ''}
                    onChange={(event) => updateMovementField('inclusao', 'outraOperadora', event.target.value)}
                    onBlur={() => {
                      if (form.outraOperadora?.trim()) {
                        const val = form.outraOperadora.trim();
                        handleAddFixedOperadora(val);
                        updateMovementField('inclusao', 'operadora', val);
                        updateMovementField('inclusao', 'outraOperadora', '');
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (form.outraOperadora?.trim()) {
                          const val = form.outraOperadora.trim();
                          handleAddFixedOperadora(val);
                          updateMovementField('inclusao', 'operadora', val);
                          updateMovementField('inclusao', 'outraOperadora', '');
                        }
                      }
                    }}
                    style={{
                      border: isFieldInvalid('inclusao', 'outraOperadora') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                      boxShadow: isFieldInvalid('inclusao', 'outraOperadora') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                      transition: 'all 0.2s ease',
                      fontSize: '0.85rem'
                    }}
                  />
                  {isFieldInvalid('inclusao', 'outraOperadora') && (
                    <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                      ⚠️ Digite o nome da outra Operadora.
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Plano *</label>
              <div style={{
                display: 'flex',
                gap: 18,
                marginTop: 12,
                border: isFieldInvalid('inclusao', 'planos') ? '2px solid #EF4444' : 'none',
                padding: isFieldInvalid('inclusao', 'planos') ? '6px 12px' : '0',
                borderRadius: 8,
                background: isFieldInvalid('inclusao', 'planos') ? '#FEF2F2' : 'none',
                transition: 'all 0.2s ease'
              }}>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Saúde')} onChange={() => toggleMovementArrayValue('inclusao', 'planos', 'Saúde')} /> Saúde</label>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Dental')} onChange={() => toggleMovementArrayValue('inclusao', 'planos', 'Dental')} /> Dental</label>
              </div>
              {isFieldInvalid('inclusao', 'planos') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ Selecione pelo menos um Plano.
                </span>
              )}
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
              <Input
                placeholder="Nome completo do beneficiário"
                value={form.beneficiario}
                onChange={(event) => updateMovementField('inclusao', 'beneficiario', event.target.value)}
                style={{
                  border: isFieldInvalid('inclusao', 'beneficiario') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'beneficiario') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('inclusao', 'beneficiario') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do Nome Completo é obrigatório.
                </span>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>Nome da Mãe *</label>
              <Input
                placeholder="Nome completo da mãe"
                value={form.nomeMae || ''}
                onChange={(event) => updateMovementField('inclusao', 'nomeMae', event.target.value)}
                style={{
                  border: isFieldInvalid('inclusao', 'nomeMae') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'nomeMae') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('inclusao', 'nomeMae') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do Nome da Mãe é obrigatório.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(event) => updateMovementField('inclusao', 'cpf', formatCPF(event.target.value))}
                style={{
                  border: isFieldInvalid('inclusao', 'cpf') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'cpf') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('inclusao', 'cpf') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do CPF é obrigatório.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Data de Nascimento *</label>
              <Input
                type="date"
                value={form.dataNascimento}
                onChange={(event) => updateMovementField('inclusao', 'dataNascimento', event.target.value)}
                style={{
                  border: isFieldInvalid('inclusao', 'dataNascimento') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'dataNascimento') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('inclusao', 'dataNascimento') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ A Data de Nascimento é obrigatória.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Estado Civil *</label>
              <select
                style={{
                  ...selectStyle,
                  border: isFieldInvalid('inclusao', 'estadoCivil') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'estadoCivil') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                value={form.estadoCivil}
                onChange={(event) => updateMovementField('inclusao', 'estadoCivil', event.target.value)}
              >
                <option value="">Selecione</option>
                <option>Solteiro(a)</option>
                <option>Casado(a)</option>
                <option>Divorciado(a)</option>
                <option>Viúvo(a)</option>
              </select>
              {isFieldInvalid('inclusao', 'estadoCivil') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ Selecione o Estado Civil.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Parentesco *</label>
              <select
                style={{
                  ...selectStyle,
                  border: isFieldInvalid('inclusao', 'parentesco') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'parentesco') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                value={form.parentesco || 'Titular'}
                onChange={(event) => updateMovementField('inclusao', 'parentesco', event.target.value)}
              >
                <option>Titular</option>
                <option>Cônjuge</option>
                <option>Filho(a)</option>
                <option>Entiado</option>
                <option>Dependente</option>
              </select>
              {isFieldInvalid('inclusao', 'parentesco') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ Selecione o Parentesco.
                </span>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>E-mail *</label>
              <Input
                placeholder="email@exemplo.com"
                type="email"
                value={form.email}
                onChange={(event) => updateMovementField('inclusao', 'email', event.target.value)}
                style={{
                  border: isFieldInvalid('inclusao', 'email') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'email') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('inclusao', 'email') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do E-mail é obrigatório.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Telefone *</label>
              <Input
                placeholder="(11) 90000-0000"
                value={form.telefone}
                onChange={(event) => updateMovementField('inclusao', 'telefone', formatPhone(event.target.value))}
                style={{
                  border: isFieldInvalid('inclusao', 'telefone') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'telefone') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('inclusao', 'telefone') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do Telefone é obrigatório.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Gênero *</label>
              <select
                style={{
                  ...selectStyle,
                  border: isFieldInvalid('inclusao', 'genero') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('inclusao', 'genero') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                value={form.genero || ''}
                onChange={(event) => updateMovementField('inclusao', 'genero', event.target.value)}
              >
                <option value="">Selecione</option>
                <option>Masculino</option>
                <option>Feminino</option>
              </select>
              {isFieldInvalid('inclusao', 'genero') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ Selecione o Gênero.
                </span>
              )}
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20}/> Detalhes da Inclusão
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18 }}>
            <label style={fieldLabel}>Descreva os detalhes da inclusão (Opcional)</label>
            <textarea
              value={form.detalhes}
              onChange={(event) => updateMovementField('inclusao', 'detalhes', event.target.value)}
              placeholder="Informe observações, conditions ou instruções adicionais para esta inclusão..."
              style={{
                width: '100%',
                minHeight: 128,
                border: isFieldInvalid('inclusao', 'detalhes') ? '2.5px solid #EF4444' : `1px solid ${theme.border}`,
                boxShadow: isFieldInvalid('inclusao', 'detalhes') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                borderRadius: 10,
                padding: 14,
                fontFamily: 'inherit',
                fontSize: '0.92rem',
                color: theme.text,
                resize: 'vertical',
                transition: 'all 0.2s ease'
              }}
            />
            {isFieldInvalid('inclusao', 'detalhes') && (
              <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                ⚠️ O preenchimento dos Detalhes da Inclusão é obrigatório.
              </span>
            )}
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
            <Paperclip size={20}/> Anexos
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, display: 'grid', gap: 12 }}>
            {['RG / CPF', 'Comprovante de Residência', 'CTPS / eSocial', 'Formulário Assinado', 'Outros'].map((doc) => (
              <div key={doc} style={{ display: 'grid', gap: 8 }}>
                <label style={{
                  ...checkboxRow,
                  border: isAttachmentInvalid('inclusao', doc) ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  background: isAttachmentInvalid('inclusao', doc) ? '#FEF2F2' : '#fff',
                  padding: '12px 14px',
                  borderRadius: 10,
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <span>
                    <input type="checkbox" checked={!!attachments[doc]} onChange={(event) => updateChecklistAttachment('inclusao', doc, event.target.checked ? null : undefined)} style={{ marginRight: 10 }} />
                    {doc === 'Outros' ? 'Outros (Opcional)' : doc}
                    {attachments[doc]?.name && attachments[doc].name !== doc && <span style={{ color: theme.muted, marginLeft: 6, fontSize: '0.72rem' }}>({attachments[doc].name})</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UploadCloud size={18} color={theme.muted} />
                    <Input type="file" onChange={(event) => updateChecklistAttachment('inclusao', doc, event.target.files?.[0])} style={{ maxWidth: 112, fontSize: '0.68rem', padding: 4 }} />
                  </span>
                </label>
                {isAttachmentInvalid('inclusao', doc) && (
                  <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 2, display: 'block', paddingLeft: 6 }}>
                    ⚠️ Documento obrigatório não anexado.
                  </span>
                )}
                {doc === 'Outros' && !!attachments[doc] && (
                  <div style={{ paddingLeft: 6 }}>
                    <Input
                      placeholder="Especifique qual anexo..."
                      value={form.outrosDescricao || ''}
                      onChange={(event) => updateMovementField('inclusao', 'outrosDescricao', event.target.value)}
                      style={{
                        border: isFieldInvalid('inclusao', 'outrosDescricao') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                        boxShadow: isFieldInvalid('inclusao', 'outrosDescricao') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    />
                    {isFieldInvalid('inclusao', 'outrosDescricao') && (
                      <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                        ⚠️ Descreva o tipo do anexo "Outros".
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" onClick={() => resetMovementForm('inclusao')} style={{ flex: 1 }}>Cancelar</Button>
          <Button disabled={submittingMovement} onClick={() => handleTrySubmit('inclusao')} style={{ flex: 1, background: theme.primary, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
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
      {validationErrors && validationErrors.section === 'exclusao' && (
        <div style={{ gridColumn: '1 / -1', background: '#FEF2F2', border: '2px solid #EF4444', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
          <h4 style={{ color: '#991B1B', fontWeight: 900, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
            ⚠️ ATENÇÃO: Informações Pendentes
          </h4>
          <p style={{ color: '#7F1D1D', fontSize: '0.88rem', margin: 0, fontWeight: 700 }}>
            Não foi possível prosseguir com o envio. Por favor, preencha todos os campos obrigatórios e anexe os documentos destacados em vermelho abaixo:
          </p>
          <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: '#7F1D1D', fontSize: '0.84rem', fontWeight: 600, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px' }}>
            {validationErrors.fields.map((err, i) => (
              <li key={i} style={{ listStyleType: 'disc' }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div>
              <label style={fieldLabel}>Operadora *</label>
              <select
                style={{
                  ...selectStyle,
                  border: isFieldInvalid('exclusao', 'operadora') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('exclusao', 'operadora') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                value={form.operadora}
                onChange={(event) => updateMovementField('exclusao', 'operadora', event.target.value)}
              >
                <option value="">Selecione a operadora</option>
                {availableOperadoras.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
                <option value="Outra">Outra</option>
              </select>
              {isFieldInvalid('exclusao', 'operadora') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ Selecione uma Operadora.
                </span>
              )}
              {form.operadora === 'Outra' && (
                <div style={{ marginTop: 14 }}>
                  <label style={fieldLabel}>Nome da Operadora *</label>
                  <Input
                    placeholder="Digite o nome da outra operadora"
                    value={form.outraOperadora || ''}
                    onChange={(event) => updateMovementField('exclusao', 'outraOperadora', event.target.value)}
                    onBlur={() => {
                      if (form.outraOperadora?.trim()) {
                        const val = form.outraOperadora.trim();
                        handleAddFixedOperadora(val);
                        updateMovementField('exclusao', 'operadora', val);
                        updateMovementField('exclusao', 'outraOperadora', '');
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        if (form.outraOperadora?.trim()) {
                          const val = form.outraOperadora.trim();
                          handleAddFixedOperadora(val);
                          updateMovementField('exclusao', 'operadora', val);
                          updateMovementField('exclusao', 'outraOperadora', '');
                        }
                      }
                    }}
                    style={{
                      border: isFieldInvalid('exclusao', 'outraOperadora') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                      boxShadow: isFieldInvalid('exclusao', 'outraOperadora') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                      transition: 'all 0.2s ease',
                      fontSize: '0.85rem'
                    }}
                  />
                  {isFieldInvalid('exclusao', 'outraOperadora') && (
                    <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                      ⚠️ Digite o nome da outra Operadora.
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label style={fieldLabel}>Plano *</label>
              <div style={{
                display: 'flex',
                gap: 18,
                marginTop: 12,
                border: isFieldInvalid('exclusao', 'planos') ? '2px solid #EF4444' : 'none',
                padding: isFieldInvalid('exclusao', 'planos') ? '6px 12px' : '0',
                borderRadius: 8,
                background: isFieldInvalid('exclusao', 'planos') ? '#FEF2F2' : 'none',
                transition: 'all 0.2s ease'
              }}>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Dental')} onChange={() => toggleMovementArrayValue('exclusao', 'planos', 'Dental')} /> Dental</label>
                <label style={checkboxRow}><input type="checkbox" checked={form.planos.includes('Saúde')} onChange={() => toggleMovementArrayValue('exclusao', 'planos', 'Saúde')} /> Saúde</label>
              </div>
              {isFieldInvalid('exclusao', 'planos') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ Selecione pelo menos um Plano.
                </span>
              )}
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
              <Input
                placeholder="Nome do beneficiário"
                value={form.beneficiario}
                onChange={(event) => updateMovementField('exclusao', 'beneficiario', event.target.value)}
                style={{
                  border: isFieldInvalid('exclusao', 'beneficiario') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('exclusao', 'beneficiario') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('exclusao', 'beneficiario') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do Nome Completo é obrigatório.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(event) => updateMovementField('exclusao', 'cpf', formatCPF(event.target.value))}
                style={{
                  border: isFieldInvalid('exclusao', 'cpf') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('exclusao', 'cpf') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('exclusao', 'cpf') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do CPF é obrigatório.
                </span>
              )}
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20}/> Detalhes da Exclusão
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18 }}>
            <label style={fieldLabel}>Descreva os detalhes da exclusão (Opcional)</label>
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
                resize: 'vertical',
                transition: 'all 0.2s ease'
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
            <Paperclip size={20}/> Anexos
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14, display: 'grid', gap: 12 }}>
            {['Termo de Rescisão', 'Formulário de Exclusão Assinado', 'Outros'].map((doc) => (
              <div key={doc} style={{ display: 'grid', gap: 8 }}>
                <label style={{
                  ...checkboxRow,
                  border: isAttachmentInvalid('exclusao', doc) ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  background: isAttachmentInvalid('exclusao', doc) ? '#FEF2F2' : '#fff',
                  padding: '12px 14px',
                  borderRadius: 10,
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <span>
                    <input type="checkbox" checked={!!attachments[doc]} onChange={(event) => updateChecklistAttachment('exclusao', doc, event.target.checked ? null : undefined)} style={{ marginRight: 10 }} />
                    {doc === 'Outros' ? 'Outros (Opcional)' : doc}
                    {attachments[doc]?.name && attachments[doc].name !== doc && <span style={{ color: theme.muted, marginLeft: 6, fontSize: '0.72rem' }}>({attachments[doc].name})</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UploadCloud size={18} color={theme.muted} />
                    <Input type="file" onChange={(event) => updateChecklistAttachment('exclusao', doc, event.target.files?.[0])} style={{ maxWidth: 112, fontSize: '0.68rem', padding: 4 }} />
                  </span>
                </label>
                {isAttachmentInvalid('exclusao', doc) && (
                  <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 2, display: 'block', paddingLeft: 6 }}>
                    ⚠️ Documento obrigatório não anexado.
                  </span>
                )}
                {doc === 'Outros' && !!attachments[doc] && (
                  <div style={{ paddingLeft: 6 }}>
                    <Input
                      placeholder="Especifique qual anexo..."
                      value={form.outrosDescricao || ''}
                      onChange={(event) => updateMovementField('exclusao', 'outrosDescricao', event.target.value)}
                      style={{
                        border: isFieldInvalid('exclusao', 'outrosDescricao') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                        boxShadow: isFieldInvalid('exclusao', 'outrosDescricao') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    />
                    {isFieldInvalid('exclusao', 'outrosDescricao') && (
                      <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                        ⚠️ Descreva o tipo do anexo "Outros".
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="outline" onClick={() => resetMovementForm('exclusao')} style={{ flex: 1 }}>Cancelar</Button>
          <Button disabled={submittingMovement} onClick={() => handleTrySubmit('exclusao')} style={{ flex: 1, background: theme.primary, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
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
      {validationErrors && validationErrors.section === 'alteracao' && (
        <div style={{ gridColumn: '1 / -1', background: '#FEF2F2', border: '2px solid #EF4444', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)' }}>
          <h4 style={{ color: '#991B1B', fontWeight: 900, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
            ⚠️ ATENÇÃO: Informações Pendentes
          </h4>
          <p style={{ color: '#7F1D1D', fontSize: '0.88rem', margin: 0, fontWeight: 700 }}>
            Não foi possível prosseguir com o envio. Por favor, preencha todos os campos obrigatórios e anexe os documentos destacados em vermelho abaixo:
          </p>
          <ul style={{ margin: '12px 0 0', paddingLeft: 20, color: '#7F1D1D', fontSize: '0.84rem', fontWeight: 600, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px' }}>
            {validationErrors.fields.map((err, i) => (
              <li key={i} style={{ listStyleType: 'disc' }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gap: 22 }}>
        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20}/> Dados do Contrato
          </h3>
          <div style={{
            borderTop: `1px solid ${theme.border}`,
            paddingTop: 18,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            border: isFieldInvalid('alteracao', 'planos') ? '2px solid #EF4444' : 'none',
            padding: isFieldInvalid('alteracao', 'planos') ? '16px' : '18px 0 0',
            borderRadius: isFieldInvalid('alteracao', 'planos') ? 12 : 0,
            background: isFieldInvalid('alteracao', 'planos') ? '#FEF2F2' : 'none',
            transition: 'all 0.2s ease'
          }}>
            {contratos.length === 0 ? (
              <div style={{ color: theme.muted, fontSize: '0.9rem', gridColumn: '1 / -1' }}>Nenhum contrato encontrado.</div>
            ) : (
              <select
                value={form.planos[0] || ''}
                onChange={(e) => updateMovementField('alteracao', 'planos', [e.target.value])}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#fff', fontSize: '0.9rem', color: theme.text }}
              >
                <option value="">Selecione um contrato...</option>
                {contratos.map((item, idx) => (
                  <option key={item.contrato || idx} value={item.contrato}>
                    {item.plano || item.seguradora || 'Saúde'} - Apólice nº {item.contrato}
                  </option>
                ))}
              </select>
            )}
          </div>
          {isFieldInvalid('alteracao', 'planos') && (
            <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
              ⚠️ Selecione pelo menos um Contrato/Plano para alteração.
            </span>
          )}
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={20}/> Dados do Beneficiário
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>Nome Completo *</label>
              <Input
                placeholder="Nome do beneficiário"
                value={form.beneficiario}
                onChange={(event) => updateMovementField('alteracao', 'beneficiario', event.target.value)}
                style={{
                  border: isFieldInvalid('alteracao', 'beneficiario') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('alteracao', 'beneficiario') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('alteracao', 'beneficiario') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do Nome Completo é obrigatório.
                </span>
              )}
            </div>
            <div>
              <label style={fieldLabel}>CPF *</label>
              <Input
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(event) => updateMovementField('alteracao', 'cpf', formatCPF(event.target.value))}
                style={{
                  border: isFieldInvalid('alteracao', 'cpf') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                  boxShadow: isFieldInvalid('alteracao', 'cpf') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              />
              {isFieldInvalid('alteracao', 'cpf') && (
                <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                  ⚠️ O preenchimento do CPF é obrigatório.
                </span>
              )}
            </div>
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={20}/> Detalhes da Alteração
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 18 }}>
            <label style={fieldLabel}>Descreva a alteração (Opcional)</label>
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
                resize: 'vertical',
                transition: 'all 0.2s ease'
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
            {['Alteração Cadastral', 'Upgrade', 'Downgrade', 'Outros'].map((tipo) => {
              const isSelected = form.tipoMovimentacao.includes(tipo);
              return (
                <div key={tipo} style={{ display: 'grid', gap: 8 }}>
                  <label style={{ 
                    ...radioCard, 
                    alignItems: 'center', 
                    cursor: 'pointer', 
                    border: isSelected ? `1.5px solid ${theme.primary}` : `1px solid ${theme.border}`,
                    background: isSelected ? '#fff' : '#f8faff',
                    transition: 'all 0.2s ease'
                  }}>
                    <input 
                      type="radio" 
                      name="tipoMovimentacao-alteracao"
                      checked={isSelected} 
                      onChange={() => updateMovementField('alteracao', 'tipoMovimentacao', [tipo])} 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: 700, color: theme.text, fontSize: '0.88rem' }}>{tipo}</span>
                  </label>
                  {tipo === 'Outros' && isSelected && (
                    <div style={{ paddingLeft: 6 }}>
                      <Input
                        placeholder="Especifique o tipo de solicitação..."
                        value={form.outrosDescricao || ''}
                        onChange={(event) => updateMovementField('alteracao', 'outrosDescricao', event.target.value)}
                        style={{
                          border: isFieldInvalid('alteracao', 'outrosDescricao') ? '2px solid #EF4444' : `1px solid ${theme.border}`,
                          boxShadow: isFieldInvalid('alteracao', 'outrosDescricao') ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      />
                      {isFieldInvalid('alteracao', 'outrosDescricao') && (
                        <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block' }}>
                          ⚠️ Por favor, especifique a descrição para "Outros".
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ ...card, padding: 24 }}>
          <h3 style={{ color: theme.primary, margin: '0 0 14px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Paperclip size={20}/> Anexos
          </h3>
          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
            <label style={{
              border: isAttachmentInvalid('alteracao', '') ? '2px dashed #EF4444' : '2px dashed #d5dcec',
              borderRadius: 12,
              background: isAttachmentInvalid('alteracao', '') ? '#FEF2F2' : '#f8faff',
              padding: 28,
              textAlign: 'center',
              color: theme.text,
              display: 'block',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <UploadCloud size={26} color={isAttachmentInvalid('alteracao', '') ? '#EF4444' : theme.muted}/>
              <div style={{ marginTop: 8, fontWeight: 800, color: isAttachmentInvalid('alteracao', '') ? '#EF4444' : theme.text }}>Selecione arquivos de apoio</div>
              <div style={{ color: isAttachmentInvalid('alteracao', '') ? '#B91C1C' : theme.muted, fontSize: '0.82rem', marginTop: 4 }}>PDF, imagens ou documentos do pedido</div>
              <Input type="file" multiple onChange={(event) => updateAlteracaoAttachments(event.target.files)} style={{ marginTop: 12 }} />
            </label>
            {isAttachmentInvalid('alteracao', '') && (
              <span style={{ color: '#EF4444', fontSize: '0.74rem', fontWeight: 800, marginTop: 4, display: 'block', textAlign: 'center' }}>
                ⚠️ Anexo obrigatório. Selecione pelo menos um arquivo de apoio.
              </span>
            )}
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
          <Button disabled={submittingMovement} onClick={() => handleTrySubmit('alteracao')} style={{ flex: 1, background: theme.primary, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
        </div>
      </div>
    </div>
    );
  };

  const renderMovimentacao = () => {
    const movementContent = movementPageContent[activeMovementTab] || movementPageContent.inclusao;
    const movimentacoesVolumeData = [
      { mes: 'Jan', 'Inclusão': 12, 'Exclusão': 4, 'Alteração': 2 },
      { mes: 'Fev', 'Inclusão': 15, 'Exclusão': 6, 'Alteração': 3 },
      { mes: 'Mar', 'Inclusão': 18, 'Exclusão': 5, 'Alteração': 1 },
      { mes: 'Abr', 'Inclusão': 14, 'Exclusão': 8, 'Alteração': 4 },
      { mes: 'Mai', 'Inclusão': 22, 'Exclusão': 7, 'Alteração': 5 },
      { mes: 'Jun', 'Inclusão': 19, 'Exclusão': 9, 'Alteração': 3 },
    ];

    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <div>
          <SectionTitle title={movementContent.title} subtitle={movementContent.subtitle} />
          {activeMovementTab === 'inclusao' && renderInclusao()}
          {activeMovementTab === 'exclusao' && renderExclusao()}
          {activeMovementTab === 'alteracao' && renderAlteracao()}
        </div>

      </div>
    );
  };

  const renderSolicitacoes = () => {
    const solicitacoesStatusData = [
      { name: 'Recebido', value: solicitacoes.filter(s => String(s.status || '').toLowerCase() === 'enviado' || String(s.status || '').toLowerCase() === 'recebido').length, color: theme.muted },
      { name: 'Em andamento', value: solicitacoes.filter(s => String(s.status || '').toLowerCase().includes('andamento')).length, color: theme.warning },
      { name: 'Concluído', value: solicitacoes.filter(s => String(s.status || '').toLowerCase().includes('concl')).length, color: theme.ok }
    ];

    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <div>
          <SectionTitle 
            title="Solicitações" 
            subtitle="Acompanhe o histórico e status de todas as suas demandas."
            action={<Button onClick={() => { setActiveSection('movimentacao'); setActiveMovementTab('inclusao'); }} style={{ background: theme.blue, color: '#fff' }}><FileText size={14}/> Nova Solicitação</Button>}
          />
          
          <section style={{ ...card, padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ flex: '1 1 280px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
                <Input value={solicitacoesSearch} onChange={(event) => setSolicitacoesSearch(event.target.value)} placeholder="Buscar por protocolo, CPF ou nome do beneficiário..." style={{ paddingLeft: '32px', fontSize: '0.8rem', width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, flex: '1 1 auto', flexWrap: 'wrap' }}>
                <select value={solicitacoesTipo} onChange={(event) => setSolicitacoesTipo(event.target.value)} style={{ ...selectStyle, flex: '1 1 140px', maxWidth: '100%' }}>
                  <option value="todos">Tipo: Todos</option>
                  <option value="inclusao">Inclusão</option>
                  <option value="exclusao">Exclusão</option>
                  <option value="alteracao">Alteração</option>
                </select>
                <select value={solicitacoesStatus} onChange={(event) => setSolicitacoesStatus(event.target.value)} style={{ ...selectStyle, flex: '1 1 140px', maxWidth: '100%' }}>
                  <option value="todos">Status: Todos</option>
                  <option value="recebido">Recebido</option>
                  <option value="em andamento">Em Andamento</option>
                  <option value="concluído">Concluído</option>
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: '100%' }}>
              <table className="data-table" style={{ fontSize: '0.8rem', minWidth: '1300px', borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Protocolo</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Contrato</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Empresa</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Beneficiário</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Nome da Mãe</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>CPF</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Nascimento</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Telefone</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>E-mail</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Parentesco</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Estado Civil</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Solicitação</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800, color: theme.muted }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSolicitacoes.map((item) => (
                    <tr key={item.id || item.protocolo} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '6px 10px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedProtocolDetail(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: theme.primary,
                            fontWeight: 800,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textAlign: 'left'
                          }}
                        >
                          {item.protocolo}
                        </button>
                      </td>
                      <td style={{ color: theme.text, padding: '6px 10px' }}>{item.contrato || '-'}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 600, color: theme.text }}>{item.empresa || '-'}</div>
                        <div style={{ fontSize: '0.72rem', color: theme.muted }}>{item.documento || '-'}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: theme.text, padding: '6px 10px' }}>{item.beneficiario || item.payload?.beneficiario || '-'}</td>
                      <td style={{ color: theme.text, padding: '6px 10px' }}>{item.nomeMae || item.payload?.nomeMae || '-'}</td>
                      <td style={{ color: theme.text, padding: '6px 10px', whiteSpace: 'nowrap' }}>{item.cpf || item.payload?.cpf || '-'}</td>
                      <td style={{ color: theme.text, padding: '6px 10px', whiteSpace: 'nowrap' }}>{item.dataNascimento || item.payload?.dataNascimento || '-'}</td>
                      <td style={{ color: theme.text, padding: '6px 10px', whiteSpace: 'nowrap' }}>{item.telefone || item.payload?.telefone || '-'}</td>
                      <td style={{ color: theme.text, padding: '6px 10px' }}>{item.email || item.payload?.email || '-'}</td>
                      <td style={{ color: theme.text, padding: '6px 10px' }}>{item.parentesco || item.payload?.parentesco || '-'}</td>
                      <td style={{ color: theme.text, padding: '6px 10px' }}>{item.estadoCivil || item.payload?.estadoCivil || '-'}</td>
                      <td style={{ fontWeight: 600, color: theme.text, padding: '6px 10px' }}>{item.tipoLabel || item.tipo || '-'}</td>
                      <td style={{ padding: '6px 10px' }}><StatusPill status={item.status}/></td>
                    </tr>
                  ))}
                  {filteredSolicitacoes.length === 0 && (
                    <tr>
                      <td colSpan="13" style={{ textAlign: 'center', color: theme.muted, padding: 28 }}>Nenhuma solicitação encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    );
  };

  const renderFormularios = () => {
    const formulariosChartData = [
      { name: 'Operacional', downloads: 145 },
      { name: 'Formulários Assim', downloads: 92 },
      { name: 'Formulários Amil', downloads: 118 },
      { name: 'Formulários Bradesco', downloads: 75 },
      { name: 'Manuais', downloads: 210 },
    ];

    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <div>
          <SectionTitle 
            title="Formulários e Manuais" 
            subtitle="Documentos operacionais, regras e materiais de apoio para gestão do seu plano."
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
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
      </div>
    );
  };

  const renderChat = () => <section style={{ ...card, minHeight:560, display:'flex', flexDirection:'column', overflow:'hidden' }}>
    <div style={{ padding:'16px 18px', borderBottom:`1px solid ${theme.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, color:theme.text, fontWeight:900 }}><MessageCircle size={18}/>Atendimento ao Cliente</div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}><Button onClick={() => loadPortal(session)} variant="outline" style={{ fontSize:'0.75rem', display:'flex', gap:6 }}><RefreshCw size={13}/>Atualizar</Button><StatusPill status="Online agora" /></div>
    </div>
    <div style={{ flex:1, padding:18, background:'#f8fafc', overflowY:'auto' }}>
      {filteredChatMessages.length === 0 ? <EmptyState>Nenhuma mensagem ainda. Envie sua primeira solicitação para a equipe.</EmptyState> : filteredChatMessages.map((item) => (
        <div key={item.id} style={{ display:'flex', justifyContent:item.direction === 'incoming' ? 'flex-end' : 'flex-start', marginBottom:10 }}>
          <div style={{ maxWidth:'72%', background:item.direction === 'incoming' ? theme.blue : '#fff', color:item.direction === 'incoming' ? '#fff' : theme.text, border:`1px solid ${theme.border}`, borderRadius:14, padding:'10px 12px' }}>
            <div style={{ fontSize:'0.68rem', opacity:0.82, marginBottom:4 }}>{item.sender}</div>
            {item.text && <div style={{ fontSize:'0.88rem', whiteSpace: 'pre-wrap' }}>{item.text}</div>}
            {item.attachments && item.attachments.length > 0 ? (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {item.attachments.map((att, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800 }}>
                    <Paperclip size={13} />
                    {att.base64 ? (
                      <a 
                        href={att.base64.startsWith('data:') ? att.base64 : `data:${att.type || 'application/octet-stream'};base64,${att.base64}`} 
                        download={att.name} 
                        style={{ color: 'inherit', textDecoration: 'underline' }}
                      >
                        {att.name}
                      </a>
                    ) : (
                      <span>{att.name}</span>
                    )}
                    {att.size ? <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>({(att.size / 1024).toFixed(0)} KB)</span> : null}
                  </div>
                ))}
              </div>
            ) : item.attachmentName ? (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800 }}>
                <Paperclip size={13} />
                <span>{item.attachmentName}</span>
              </div>
            ) : null}
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

  const handleSavePerfil = async () => {
    setProfileSaving(true);
    setProfileError('');
    setSuccessMsg('');
    try {
      const response = await atualizarPerfilPortalDonCor({
        documento: session.documento,
        nome: perfilForm.nome,
        email: perfilForm.email,
        telefone: perfilForm.telefone,
        logo: perfilForm.logo
      });

      const updatedSession = {
        ...session,
        empresa: perfilForm.nome,
        nome: perfilForm.nome,
        email: perfilForm.email,
        telefone: perfilForm.telefone,
        logo: perfilForm.logo
      };
      setSession(updatedSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
      setSuccessMsg('Perfil corporativo atualizado com sucesso no banco de dados!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Erro ao atualizar perfil no banco de dados:', err);
      setProfileError(err?.response?.data?.detail || 'Erro ao salvar alterações no banco de dados. Tente novamente.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setPerfilForm(prev => ({ ...prev, logo: base64 }));
    } catch (err) {
      console.error('Erro ao converter logo para base64:', err);
    }
  };

  const renderPerfil = () => (
    <section style={{ ...card, padding: 24, maxWidth: 960 }}>
      <SectionTitle title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={20} color={theme.primary} /> Meu Perfil Corporativo</span>} />
      
      {successMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#047857', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: '0.85rem', fontWeight: 700 }}>
          {successMsg}
        </div>
      )}
      
      {profileError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: '0.85rem', fontWeight: 700 }}>
          {profileError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28, marginTop: 20 }}>
        {/* CARD PERSONALIZADO (PREVIEW) */}
        <div style={{ 
          background: `linear-gradient(135deg, ${theme.primary} 0%, #1e3a8a 100%)`, 
          borderRadius: 20, 
          padding: 24, 
          color: '#fff', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          minHeight: 250, 
          position: 'relative', 
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0,45,105,0.2)'
        }}>
          {/* Background decorative shape */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8, fontWeight: 700 }}>Identidade Corporativa</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 220 }}>{perfilForm.nome || 'Sua Empresa'}</div>
            </div>
            
            {/* Logo Container */}
            {perfilForm.logo ? (
              <div style={{ width: 64, height: 64, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                <img src={perfilForm.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.3)', gap: 2 }}>
                <Building2 size={22} color="rgba(255,255,255,0.7)" />
                <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>Sem Logo</span>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: 28, zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Mail size={14} style={{ opacity: 0.8 }} />
              <span style={{ fontSize: '0.8rem', opacity: 0.9, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 260 }}>{perfilForm.email || 'Não informado'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Phone size={14} style={{ opacity: 0.8 }} />
              <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{perfilForm.telefone || 'Não informado'}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 16, zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: '#10B981', letterSpacing: 0.5 }}>Portal Autorizado</span>
            </div>
            <DoncorLogo size={14} showText={false} animated={false} />
          </div>
        </div>

        {/* FORMULÁRIO DE EDIÇÃO E UPLOAD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div>
              <label style={{ ...fieldLabel, marginBottom: 6 }}>Razão Social / Nome</label>
              <Input value={perfilForm.nome} onChange={(e) => setPerfilForm(prev => ({...prev, nome: e.target.value}))} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ ...fieldLabel, marginBottom: 6 }}>E-mail corporativo</label>
                <Input value={perfilForm.email} onChange={(e) => setPerfilForm(prev => ({...prev, email: e.target.value}))} />
              </div>
              <div>
                <label style={{ ...fieldLabel, marginBottom: 6 }}>Telefone de contato</label>
                <Input value={perfilForm.telefone} onChange={(e) => setPerfilForm(prev => ({...prev, telefone: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* ÁREA DE UPLOAD DA LOGO */}
          <div style={{ border: `1px dashed ${theme.border}`, borderRadius: 14, padding: 18, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: theme.text }}>Logo da Empresa</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ 
                flex: 1,
                border: '1px dashed #2C7BE5',
                borderRadius: 10,
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#fff',
                transition: 'all 0.2s'
              }} onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.primary} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2C7BE5'}>
                <UploadCloud size={20} color="#2C7BE5" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Carregar nova logo</span>
                <span style={{ fontSize: '0.65rem', color: theme.muted }}>PNG, JPG, SVG de até 1MB</span>
                <input type="file" accept="image/*" onChange={(event) => handleLogoUpload(event.target.files?.[0])} style={{ display: 'none' }} />
              </label>

              {perfilForm.logo && (
                <button 
                  onClick={() => setPerfilForm(prev => ({ ...prev, logo: '' }))}
                  style={{ 
                    border: '1px solid #fee2e2', 
                    background: '#fef2f2', 
                    color: '#ef4444', 
                    borderRadius: 10, 
                    padding: '12px 14px', 
                    fontSize: '0.72rem', 
                    fontWeight: 800, 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    height: '100%',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
                >
                  <Trash2 size={16} />
                  Remover logo
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button onClick={handleSavePerfil} disabled={profileSaving} style={{ background: theme.blue, color: '#fff', display: 'flex', gap: 8, flex: 1, padding: '12px', opacity: profileSaving ? 0.7 : 1 }}>
              <FileText size={16}/> {profileSaving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      </div>
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

  if (needsLgpdAcceptance) {
    return renderLgpdAcceptanceScreen();
  }

  if (needsPasswordChange) {
    return renderPasswordChangeScreen();
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'perfil': return renderPerfil();
      case 'configuracoes': return renderConfiguracoes();
      case 'contratos': return renderContratos();
      case 'faturas': return renderFaturas();
      case 'bi': return session?.acessoSinistralidade ? renderBi() : renderDashboard();
      case 'movimentacao': return renderMovimentacao();
      case 'solicitacoes': return renderSolicitacoes();
      case 'formularios': return renderFormularios();
      case 'chat': return renderChat();
      default: return renderDashboard();
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:theme.bg, display:'grid', gridTemplateColumns:'278px minmax(0, 1fr)' }}>
      <aside style={{ background:theme.navy, color:'#fff', padding:20, display:'flex', flexDirection:'column', gap:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'6px 4px 18px', borderBottom:'1px solid #ffffff1f' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><DoncorLogo size={28} showText={false} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ffffff24', paddingLeft: 10, marginLeft: 4 }}>
            <div style={{ fontWeight:900, fontSize:'0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Doncor</div>
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
            {perfilForm.logo ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 10, background: '#fff', padding: '4px 10px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                <img src={perfilForm.logo} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20}/>
              </div>
            )}
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
                const unread = messages.filter(m => !m.read && (m.protocolo || m.direction === 'incoming')).length;
                if (unread > 0) markPortalDonCorChatRead({ documento: session.documento, empresa: session.empresa }).then(() => loadPortal(session));
              }}
              style={{ border:`1px solid ${theme.border}`, background:'#fff', borderRadius:12, padding:9, color:theme.muted, position: 'relative', cursor: 'pointer' }}
            >
              <Bell size={16}/>
              {messages.filter(m => !m.read && (m.protocolo || m.direction === 'incoming')).length > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, background: '#e63757', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 5px', borderRadius: '50%' }}>
                  {messages.filter(m => !m.read && (m.protocolo || m.direction === 'incoming')).length}
                </span>
              )}
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{ border:`1px solid ${theme.border}`, background:'#f8fafc', borderRadius:12, padding:'6px 14px', color:theme.text, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              >
                {perfilForm.logo ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: '#fff', padding: 2, border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                    <img src={perfilForm.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ background: '#e2e8f0', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={13} color={theme.primary} />
                  </div>
                )}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: theme.primary }}>{perfilForm.nome}</span>
                </div>
                <ChevronDown size={14} color={theme.muted}/>
              </button>
              
              {showProfileMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 240, background: '#fff', border: `1px solid ${theme.border}`, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 50 }}>
                  <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${theme.border}`, background: '#f8fafc', display: 'flex', gap: 12, alignItems: 'center' }}>
                    {perfilForm.logo ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: '#fff', padding: 4, border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <img src={perfilForm.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dae8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
                        <User size={18} color={theme.blue} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 900, color: theme.primary, fontSize: '0.9rem', lineHeight: 1.2 }}>{perfilForm.nome}</div>
                      <div style={{ color: theme.muted, fontSize: '0.72rem', marginTop: 2, wordBreak: 'break-all' }}>{perfilForm.email}</div>
                    </div>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <button onClick={() => { setActiveSection('perfil'); setShowProfileMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: theme.text, fontSize: '0.85rem', borderRadius: 8 }} onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <User size={16} color={theme.blue} /> Meu Perfil
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
        <main style={{ padding:24, maxWidth:'100%', boxSizing:'border-box' }}>
          {error && <div style={{ background:'#fff1f2', border:'1px solid #fecdd3', color:'#be123c', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>{error}</div>}
          {successMsg && <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#047857', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{successMsg}</div>}
          {passMsg && <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#047857', borderRadius:10, padding:'10px 12px', marginBottom:14, fontSize:'0.86rem' }}>{passMsg}</div>}
          {showPassBox && <section style={{ ...card, padding:16, marginBottom:16 }}><h2 style={{ fontSize:'1rem', color:theme.text, margin:'0 0 12px' }}>Alterar senha de acesso</h2><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, alignItems:'end' }}><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Senha atual</label><Input type="password" value={senhaAtual} onChange={(e)=>setSenhaAtual(e.target.value)} placeholder="Senha atual" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Nova senha</label><Input type="password" value={novaSenha} onChange={(e)=>setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div><div><label style={{ fontSize:'0.72rem', color:theme.muted, fontWeight:800 }}>Confirmar nova senha</label><Input type="password" value={confirmaSenha} onChange={(e)=>setConfirmaSenha(e.target.value)} placeholder="Repita a nova senha" /></div><Button onClick={handleChangePass} style={{ background:theme.blue, color:'#fff' }}>Salvar senha</Button></div></section>}
          {loading && <div style={{ marginBottom:14, color:theme.muted, display:'flex', alignItems:'center', gap:8 }}><Activity size={16}/>Atualizando informações do cliente...</div>}
          {renderActiveSection()}
        </main>
      </div>
      {confirmMovement && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', color: theme.text, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}><FileText size={22} color={theme.primary} /> Confirmar Solicitação</h3>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 20 }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: theme.text, border: `1px solid ${theme.border}`, display: 'grid', gap: 12 }}>
                {confirmMovement === 'inclusao' && (
                  <>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Movimentação</span><div style={{ fontWeight: 800, color: theme.text, fontSize: '0.9rem', marginTop: 2 }}>Inclusão</div></div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Beneficiário</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.beneficiario || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Nome da Mãe</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.nomeMae || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>CPF</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.cpf || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Data de Nascimento</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.dataNascimento || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Estado Civil</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.estadoCivil || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Parentesco</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.parentesco || 'Titular'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Gênero</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.genero || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>E-mail</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movementForms.inclusao.email || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Telefone</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.telefone || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Operadora</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.operadora === 'Outra' ? (movementForms.inclusao.outraOperadora || 'Outra') : (movementForms.inclusao.operadora || '-')}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Planos</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.planos?.join(', ') || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Vigência</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.tipoMovimentacao || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Contrato</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.inclusao.contrato || contratos?.[0]?.contrato || '-'}</div></div>
                    </div>

                    <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Detalhes</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2, whiteSpace: 'pre-wrap' }}>{movementForms.inclusao.detalhes || '-'}</div></div>
                  </>
                )}
                {confirmMovement === 'exclusao' && (
                  <>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Movimentação</span><div style={{ fontWeight: 800, color: theme.text, fontSize: '0.9rem', marginTop: 2 }}>Exclusão</div></div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Beneficiário</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.exclusao.beneficiario || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>CPF</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.exclusao.cpf || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Operadora</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.exclusao.operadora === 'Outra' ? (movementForms.exclusao.outraOperadora || 'Outra') : (movementForms.exclusao.operadora || '-')}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Planos</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.exclusao.planos?.join(', ') || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Vigência</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.exclusao.tipoMovimentacao || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Contrato</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.exclusao.contrato || contratos?.[0]?.contrato || '-'}</div></div>
                    </div>

                    <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Detalhes</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2, whiteSpace: 'pre-wrap' }}>{movementForms.exclusao.detalhes || '-'}</div></div>
                  </>
                )}
                {confirmMovement === 'alteracao' && (
                  <>
                    <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Movimentação</span><div style={{ fontWeight: 800, color: theme.text, fontSize: '0.9rem', marginTop: 2 }}>Alteração</div></div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Beneficiário</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.alteracao.beneficiario || '-'}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>CPF</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.alteracao.cpf || '-'}</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Tipos de Alteração</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.alteracao.tipoMovimentacao?.join(', ') || '-'} {movementForms.alteracao.tipoMovimentacao?.includes('Outros') && movementForms.alteracao.outrosDescricao ? `(${movementForms.alteracao.outrosDescricao})` : ''}</div></div>
                      <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Contrato</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{movementForms.alteracao.contrato || contratos?.[0]?.contrato || '-'}</div></div>
                    </div>

                    <div><span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Detalhes</span><div style={{ fontWeight: 800, color: theme.text, marginTop: 2, whiteSpace: 'pre-wrap' }}>{movementForms.alteracao.detalhes || '-'}</div></div>
                  </>
                )}
              </div>

              {/* Anexos */}
              <div style={{ marginTop: 18 }}>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Documentos e Anexos</span>
                {getMovementAttachments(confirmMovement).length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: theme.muted, fontStyle: 'italic', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: `1px solid ${theme.border}` }}>Nenhum anexo adicionado.</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {getMovementAttachments(confirmMovement).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: '0.82rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>📎</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          {item.category && <div style={{ fontSize: '0.7rem', color: theme.muted, marginTop: 2 }}>{item.category}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: theme.muted, marginBottom: 24, cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={confirmTerm} onChange={(e) => setConfirmTerm(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              Confirmo a leitura e o envio destas informações.
            </label>

            <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
              <Button variant="outline" onClick={() => setConfirmMovement(null)} style={{ flex: 1 }}>Revisar Dados</Button>
              <Button disabled={!confirmTerm || submittingMovement} onClick={() => { setConfirmMovement(null); submitMovimentacao(confirmMovement); }} style={{ flex: 1, background: confirmTerm ? theme.primary : theme.muted, color: '#fff' }}>{submittingMovement ? 'Enviando...' : 'Enviar Solicitação'}</Button>
            </div>
          </div>
        </div>
      )}

      {showValidationModal && validationErrors && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '2px solid #EF4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <span style={{ fontSize: '2.5rem' }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#991B1B' }}>Informações Faltantes!</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#B91C1C', fontWeight: 700 }}>Não foi possível enviar a solicitação.</p>
              </div>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5, marginBottom: 16, fontWeight: 600 }}>
              Os seguintes campos obrigatórios ou anexos estão em branco ou não foram fornecidos:
            </p>

            <div style={{ 
              maxHeight: '220px', 
              overflowY: 'auto', 
              background: '#FEF2F2', 
              borderRadius: 12, 
              padding: '14px 18px', 
              border: '1px solid #FEE2E2',
              marginBottom: 24
            }}>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#991B1B', fontSize: '0.86rem', display: 'grid', gap: 8 }}>
                {validationErrors.fields.map((err, i) => (
                  <li key={i} style={{ fontWeight: 700, listStyleType: 'disc' }}>
                    {err}
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              onClick={() => setShowValidationModal(false)} 
              style={{ width: '100%', background: '#EF4444', color: '#fff', fontWeight: 900, height: 46, borderRadius: 12, transition: 'all 0.2s ease' }}
            >
              Entendido, Corrigir Agora
            </Button>
          </div>
        </div>
      )}

      {showBeneficiariesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: theme.text, display: 'flex', alignItems: 'center', gap: 10 }}>
                👥 Beneficiários: {selectedPlan}
              </h3>
              <button onClick={() => setShowBeneficiariesModal(false)} style={{ background: 'transparent', border: 0, fontSize: '1.25rem', cursor: 'pointer', color: theme.muted }}>&times;</button>
            </div>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <p style={{ color: theme.muted, fontSize: '0.9rem' }}>Funcionalidade em desenvolvimento. Listagem de beneficiários para este plano será exibida aqui.</p>
            </div>

            <Button onClick={() => setShowBeneficiariesModal(false)} style={{ background: theme.blue, color: '#fff', width: '100%', height: 44, marginTop: 20 }}>
              Fechar
            </Button>
          </div>
        </div>
      )}

      {selectedContratoDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: theme.text, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderOpen size={22} color={theme.blue} /> Detalhes do Contrato
              </h3>
              <button onClick={() => setSelectedContratoDetail(null)} style={{ background: 'transparent', border: 0, fontSize: '1.25rem', cursor: 'pointer', color: theme.muted }}>&times;</button>
            </div>
            
            <div style={{ display: 'grid', gap: 14, fontSize: '0.88rem', color: theme.text, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderBottom: `1px solid #f1f5f9`, paddingBottom: 8 }}>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Número do Contrato</span>
                  <div style={{ fontWeight: 800, color: theme.primary, fontSize: '1rem', marginTop: 2 }}>{selectedContratoDetail.contrato}</div>
                </div>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Status</span>
                  <div style={{ marginTop: 2 }}><StatusPill status={selectedContratoDetail.status} /></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderBottom: `1px solid #f1f5f9`, paddingBottom: 8 }}>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Tipo de Contrato</span>
                  <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: selectedContratoDetail.tipo === 'PME' ? '#eff6ff' : '#f8fafc', color: selectedContratoDetail.tipo === 'PME' ? theme.blue : theme.text, border: `1px solid ${theme.border}` }}>
                      {selectedContratoDetail.tipo || 'Empresarial'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Seguradora</span>
                  <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedContratoDetail.seguradora || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderBottom: `1px solid #f1f5f9`, paddingBottom: 8 }}>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Plano</span>
                  <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedContratoDetail.plano}</div>
                </div>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Vigência</span>
                  <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedContratoDetail.vigencia || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Total de Vidas</span>
                  <div style={{ fontWeight: 800, color: theme.text, fontSize: '1.1rem', marginTop: 2 }}>{selectedContratoDetail.vidas}</div>
                </div>
                <div>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>Valor Mensal</span>
                  <div style={{ fontWeight: 800, color: theme.text, fontSize: '1.1rem', marginTop: 2 }}>{selectedContratoDetail.valorMensal || '-'}</div>
                </div>
              </div>
            </div>

            <Button onClick={() => setSelectedContratoDetail(null)} style={{ background: theme.blue, color: '#fff', width: '100%', height: 44 }}>
              Fechar Detalhes
            </Button>
          </div>
        </div>
      )}

      {selectedProtocolDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 550, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: theme.text, display: 'flex', alignItems: 'center', gap: 10 }}>
                📄 Detalhes da Solicitação ({selectedProtocolDetail.protocolo})
              </h3>
              <button onClick={() => setSelectedProtocolDetail(null)} style={{ background: 'transparent', border: 0, fontSize: '1.25rem', cursor: 'pointer', color: theme.muted }}>&times;</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.82rem', color: theme.text, marginBottom: 24, maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Protocolo</span>
                <div style={{ fontWeight: 800, color: theme.primary, fontSize: '0.95rem', marginTop: 2 }}>{selectedProtocolDetail.protocolo}</div>
              </div>
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Status</span>
                <div style={{ marginTop: 2 }}><StatusPill status={selectedProtocolDetail.status} /></div>
              </div>
              
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Tipo de Solicitação</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.tipoLabel || selectedProtocolDetail.tipo || '-'}</div>
              </div>
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Data</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.dataSolicitacao || '-'}</div>
              </div>

              <div style={{ gridColumn: 'span 2', height: '1px', background: theme.border, margin: '4px 0' }} />

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Beneficiário</span>
                <div style={{ fontWeight: 800, color: theme.text, fontSize: '0.95rem', marginTop: 2 }}>{selectedProtocolDetail.beneficiario || selectedProtocolDetail.payload?.beneficiario || '-'}</div>
              </div>
              
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>CPF</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.cpf || selectedProtocolDetail.payload?.cpf || '-'}</div>
              </div>
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Data Nascimento</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.dataNascimento || selectedProtocolDetail.payload?.dataNascimento || '-'}</div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Nome da Mãe</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.nomeMae || selectedProtocolDetail.payload?.nomeMae || '-'}</div>
              </div>

              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Parentesco</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.parentesco || selectedProtocolDetail.payload?.parentesco || '-'}</div>
              </div>
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Gênero</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.genero || selectedProtocolDetail.payload?.genero || '-'}</div>
              </div>

              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Estado Civil</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.estadoCivil || selectedProtocolDetail.payload?.estadoCivil || '-'}</div>
              </div>
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Telefone</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.telefone || selectedProtocolDetail.payload?.telefone || '-'}</div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>E-mail</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.email || selectedProtocolDetail.payload?.email || '-'}</div>
              </div>

              <div style={{ gridColumn: 'span 2', height: '1px', background: theme.border, margin: '4px 0' }} />

              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Contrato Relacionado</span>
                <div style={{ fontWeight: 800, color: theme.blue, marginTop: 2 }}>{selectedProtocolDetail.contrato || '-'}</div>
              </div>
              <div>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Empresa</span>
                <div style={{ fontWeight: 800, color: theme.text, marginTop: 2 }}>{selectedProtocolDetail.empresa || '-'}</div>
              </div>

              {/* Seção de Anexos */}
              {(selectedProtocolDetail?.anexos || selectedProtocolDetail?.attachments || [])?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2', marginTop: 8 }}>
                  <span style={{ color: theme.muted, fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase' }}>Anexos / Documentos</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(selectedProtocolDetail?.anexos || selectedProtocolDetail?.attachments || []).map((att, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', background: '#f8f9fa', border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          <Paperclip size={14} color="#2C7BE5" />
                          <span style={{ fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                          {att.size ? <span style={{ color: theme.muted, fontSize: '0.72rem', marginLeft: 6 }}>({(att.size / 1024).toFixed(0)} KB)</span> : null}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewAttachment(att)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', padding: '2px 8px', height: 28, cursor: 'pointer' }}
                          >
                            <Eye size={12} /> Visualizar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadAttachment(att)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', padding: '2px 8px', height: 28, background: '#2C7BE5', color: '#fff', cursor: 'pointer' }}
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

            <Button onClick={() => setSelectedProtocolDetail(null)} style={{ background: theme.primary, color: '#fff', width: '100%', height: 44 }}>
              Fechar Detalhes
            </Button>
          </div>
        </div>
      )}

      {previewAtt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)', zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 800, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${theme.border}`, paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: theme.text, display: 'flex', alignItems: 'center', gap: 10 }}>
                👁️ Visualizar Anexo: {previewAtt.name}
              </h3>
              <button onClick={() => setPreviewAtt(null)} style={{ background: 'transparent', border: 0, fontSize: '1.25rem', cursor: 'pointer', color: theme.muted }}>&times;</button>
            </div>
            
            <div style={{ margin: '10px 0', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '10px' }}>
              {previewAtt.name.toLowerCase().endsWith('.pdf') || previewAtt.type?.includes('pdf') ? (
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
                <pre style={{ width: '100%', maxHeight: '500px', overflow: 'auto', padding: '12px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {atob(previewAtt.base64.split(',')[1] || previewAtt.base64)}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Paperclip size={48} color="#8a8d93" style={{ marginBottom: '14px' }} />
                  <p style={{ fontWeight: 600, color: '#344050' }}>Visualização não suportada para este tipo de arquivo.</p>
                  <p style={{ fontSize: '0.78rem', color: '#8a8d93', marginTop: '4px' }}>Por favor, faça o download utilizando o botão abaixo para abrir em seu dispositivo.</p>
                  <Button onClick={() => handleDownloadAttachment(previewAtt)} style={{ marginTop: '16px', background: theme.primary, color: '#fff' }}>
                    <Download size={14} style={{ marginRight: '6px' }} /> Baixar Arquivo
                  </Button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 10 }}>
              <Button onClick={() => handleDownloadAttachment(previewAtt)} variant="outline">
                <Download size={14} style={{ marginRight: '6px' }} /> Baixar
              </Button>
              <Button onClick={() => setPreviewAtt(null)} style={{ background: theme.primary, color: '#fff' }}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalDonCor;
