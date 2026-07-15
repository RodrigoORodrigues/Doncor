import React, { useState } from 'react';
import { 
  Construction, User, Settings, HelpCircle, Mail, Save, KeyRound,
  Phone, UploadCloud, Trash2, Building2, FileText 
} from 'lucide-react';
import DoncorLogo from '../components/DoncorLogo';

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = (error) => reject(error);
});

const cardStyle = {
  background: '#fff',
  borderRadius: '12px',
  padding: '28px 32px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  width: '100%',
  maxWidth: '960px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d8e2ef',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '0.9rem'
};

const fieldLabelStyle = {
  fontSize: '0.78rem',
  fontWeight: 800,
  color: '#4d5e7a',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'block',
  marginBottom: '6px'
};

const GenericPage = ({ pageId, pageLabel }) => {
  const isSupport = pageId === 'suporte';
  const isProfile = pageId === 'perfil';
  const isSettings = pageId === 'configuracoes';
  const supportEmail = 'donfim@gmail.com';

  const [profile, setProfile] = useState(() => {
    const cached = localStorage.getItem('doncor_profile_broker');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Erro ao ler perfil do localStorage:', e);
      }
    }
    return {
      nome: 'Carlos Eduardo Silva',
      email: 'donfim@gmail.com',
      telefone: '(11) 99999-0000',
      logo: ''
    };
  });

  const [settings, setSettings] = useState({
    notificacoesEmail: true,
    notificacoesSms: false,
    atualizacaoAutomatica: true
  });

  const [support, setSupport] = useState({ assunto: '', mensagem: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const handleSaveProfile = () => {
    setProfileSaving(true);
    localStorage.setItem('doncor_profile_broker', JSON.stringify(profile));
    
    // Dispatch a custom event so other components (like TopNav) can react immediately
    window.dispatchEvent(new Event('doncor-profile-updated'));
    
    setTimeout(() => {
      setProfileSaving(false);
      setSuccessMsg('Perfil corporativo atualizado com sucesso no sistema!');
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 400);
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setProfile(prev => ({ ...prev, logo: base64 }));
    } catch (err) {
      console.error('Erro ao converter logo para base64:', err);
    }
  };

  if (isProfile) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #edf2f9', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 id="page-title-profile" style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={22} color="#2C7BE5" /> {pageLabel || 'Meu Perfil Corporativo'}
            </h2>
          </div>

          {successMsg && (
            <div id="profile-success-msg" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#047857', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            
            {/* PREVIEW CARD */}
            <div id="corporate-card-preview" style={{ 
              background: 'linear-gradient(135deg, #12263F 0%, #1e3a8a 100%)', 
              borderRadius: '20px', 
              padding: '24px', 
              color: '#fff', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between', 
              minHeight: '250px', 
              position: 'relative', 
              overflow: 'hidden',
              boxShadow: '0 12px 30px rgba(18,38,63,0.25)'
            }}>
              {/* Background decorative shapes */}
              <div style={{ position: 'absolute', top: -50, right: -50, width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', pointerEvents: 'none' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.8, fontWeight: 700 }}>Identidade DonCor</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }}>{profile.nome || 'Sua Corretora'}</div>
                </div>
                
                {/* Logo Container */}
                {profile.logo ? (
                  <div style={{ width: '64px', height: '64px', background: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <img src={profile.logo} alt="Logo Corporativa" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.3)', gap: '2px' }}>
                    <Building2 size={22} color="rgba(255,255,255,0.7)" />
                    <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>Sem Logo</span>
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '28px', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Mail size={14} style={{ opacity: 0.8 }} />
                  <span style={{ fontSize: '0.8rem', opacity: 0.9, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '260px' }}>{profile.email || 'Não informado'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Phone size={14} style={{ opacity: 0.8 }} />
                  <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{profile.telefone || 'Não informado'}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '16px', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: '#10B981', letterSpacing: '0.5px' }}>Corretor Parceiro</span>
                </div>
                <DoncorLogo size={14} showText={false} animated={false} />
              </div>
            </div>

            {/* FORM FIELDS & LOGO UPLOAD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div>
                  <label id="lbl-nome" style={fieldLabelStyle}>Nome Corporativo / Razão Social</label>
                  <input id="input-nome" style={inputStyle} value={profile.nome} onChange={(e) => setProfile((p) => ({ ...p, nome: e.target.value }))} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label id="lbl-email" style={fieldLabelStyle}>E-mail de contato</label>
                    <input id="input-email" style={inputStyle} value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label id="lbl-tel" style={fieldLabelStyle}>Telefone comercial</label>
                    <input id="input-telefone" style={inputStyle} value={profile.telefone} onChange={(e) => setProfile((p) => ({ ...p, telefone: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* LOGO UPLOAD AREA */}
              <div style={{ border: '1px dashed #d8e2ef', borderRadius: '14px', padding: '18px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>Logo Oficial da Corretora</div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <label id="logo-uploader-label" style={{ 
                    flex: 1,
                    border: '1px dashed #2C7BE5',
                    borderRadius: '10px',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#fff',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#12263F'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2C7BE5'}>
                    <UploadCloud size={20} color="#2C7BE5" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Carregar nova logo</span>
                    <span style={{ fontSize: '0.65rem', color: '#8a8d93' }}>PNG, JPG, SVG de até 1MB</span>
                    <input type="file" accept="image/*" onChange={(event) => handleLogoUpload(event.target.files?.[0])} style={{ display: 'none' }} />
                  </label>

                  {profile.logo && (
                    <button 
                      id="btn-remove-logo"
                      onClick={() => setProfile(prev => ({ ...prev, logo: '' }))}
                      style={{ 
                        border: '1px solid #fee2e2', 
                        background: '#fef2f2', 
                        color: '#ef4444', 
                        borderRadius: '10px', 
                        padding: '12px 14px', 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
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

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  id="btn-save-profile"
                  onClick={handleSaveProfile} 
                  disabled={profileSaving}
                  style={{ 
                    background: '#2C7BE5', 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px', 
                    flex: 1, 
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: profileSaving ? 0.7 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <FileText size={16} /> {profileSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </div>

          </div>
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
