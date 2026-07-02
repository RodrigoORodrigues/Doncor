import React, { useState } from 'react';
import { Construction, User, Settings, HelpCircle, Mail, Save, KeyRound } from 'lucide-react';

const cardStyle = {
  background: '#fff',
  borderRadius: '12px',
  padding: '28px 32px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  width: '100%',
  maxWidth: '760px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d8e2ef',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '0.9rem'
};

const GenericPage = ({ pageId, pageLabel }) => {
  const isSupport = pageId === 'suporte';
  const isProfile = pageId === 'perfil';
  const isSettings = pageId === 'configuracoes';
  const supportEmail = 'donfim@gmail.com';

  const [profile, setProfile] = useState({
    nome: 'Carlos Eduardo Silva',
    email: 'carlos.silva@corretora.com.br',
    telefone: '(11) 99999-0000',
    cargo: 'Administrador'
  });

  const [settings, setSettings] = useState({
    notificacoesEmail: true,
    atualizacaoAutomatica: true
  });

  const [support, setSupport] = useState({ assunto: '', mensagem: '' });

  if (isProfile) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 16px', color: '#344050', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={20} /> Meu Perfil</h2>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
            <div><label>Nome</label><input style={inputStyle} value={profile.nome} onChange={(e) => setProfile((p) => ({ ...p, nome: e.target.value }))} /></div>
            <div><label>E-mail</label><input style={inputStyle} value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} /></div>
            <div><label>Telefone</label><input style={inputStyle} value={profile.telefone} onChange={(e) => setProfile((p) => ({ ...p, telefone: e.target.value }))} /></div>
            <div><label>Cargo</label><input style={inputStyle} value={profile.cargo} onChange={(e) => setProfile((p) => ({ ...p, cargo: e.target.value }))} /></div>
          </div>
          <button style={{ marginTop: '16px', padding: '9px 14px', background: '#4979bb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Save size={16} /> Salvar alterações
          </button>
        </div>
      </div>
    );
  }

  if (isSettings) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 16px', color: '#344050', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} /> Configurações</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <label><input type="checkbox" checked={settings.notificacoesEmail} onChange={(e) => setSettings((s) => ({ ...s, notificacoesEmail: e.target.checked }))} /> Receber notificações por e-mail</label>
            <label><input type="checkbox" checked={settings.atualizacaoAutomatica} onChange={(e) => setSettings((s) => ({ ...s, atualizacaoAutomatica: e.target.checked }))} /> Atualização automática de dados</label>
            <button type="button" style={{ marginTop: '8px', width: 'fit-content', padding: '9px 14px', background: '#4979bb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} /> Trocar acesso
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isSupport) {
    const mailToHref = `mailto:${supportEmail}?subject=${encodeURIComponent(support.assunto || 'Suporte Don Cor')}&body=${encodeURIComponent(support.mensagem)}`;
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 12px', color: '#344050', display: 'flex', alignItems: 'center', gap: '8px' }}><HelpCircle size={20} /> Suporte</h2>
          <p style={{ fontSize: '0.85rem', color: '#8a8d93' }}>Preencha os campos e envie o e-mail para o suporte técnico.</p>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input aria-label="Assunto" placeholder="Assunto" style={inputStyle} value={support.assunto} onChange={(e) => setSupport((s) => ({ ...s, assunto: e.target.value }))} />
            <textarea aria-label="Mensagem" placeholder="Descreva sua solicitação" style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} value={support.mensagem} onChange={(e) => setSupport((s) => ({ ...s, mensagem: e.target.value }))} />
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a href={mailToHref} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', background: '#4979bb', color: '#fff', textDecoration: 'none', fontWeight: 600 }}><Mail size={16} /> Enviar e-mail para {supportEmail}</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 64px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#4979bb15', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Construction size={32} color="#4979bb" /></div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#344050', margin: '0 0 8px' }}>{pageLabel}</h2>
        <p style={{ fontSize: '0.85rem', color: '#8a8d93', margin: 0 }}>Esta funcionalidade está em desenvolvimento.</p>
      </div>
    </div>
  );
};

export default GenericPage;
