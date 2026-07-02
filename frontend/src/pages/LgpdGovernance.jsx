import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Download, Plus, Search, Eye, X, Check, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { fetchLgpdConfig, saveLgpdConfig, fetchLgpdAceites, deleteLgpdAceite } from '../services/api';

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

const cardStyle = { 
  background: theme.card, 
  border: `1px solid ${theme.border}`, 
  borderRadius: 18, 
  boxShadow: '0 10px 28px rgba(15,23,42,0.05)' 
};

export default function LgpdGovernance() {
  const [lgpdAceitesList, setLgpdAceitesList] = useState([]);
  const [lgpdSearchText, setLgpdSearchText] = useState('');
  const [selectedAceite, setSelectedAceite] = useState(null);
  const [showNovaVersaoModal, setShowNovaVersaoModal] = useState(false);
  const [novaVersaoText, setNovaVersaoText] = useState('');
  const [novaVersaoLabel, setNovaVersaoLabel] = useState('1.1');
  const [lgpdText, setLgpdText] = useState('');
  const [lgpdVersion, setLgpdVersion] = useState('1.0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLgpdData = useCallback(async () => {
    setLoading(true);
    try {
      const [aceites, config] = await Promise.all([
        fetchLgpdAceites(),
        fetchLgpdConfig()
      ]);
      setLgpdAceitesList(aceites || []);
      setLgpdText(config.texto || '');
      setLgpdVersion(config.versao || '1.0');
      setError('');
    } catch (err) {
      console.error('Erro ao carregar dados LGPD:', err);
      setError('Não foi possível carregar as informações de governança LGPD.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLgpdData();
  }, [loadLgpdData]);

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
      
      // Refresh list to show any potential updates
      const list = await fetchLgpdAceites();
      setLgpdAceitesList(list || []);
      
      alert('Nova versão de termos LGPD publicada com sucesso! Todos os clientes deverão aceitar esta nova versão no próximo acesso.');
    } catch (err) {
      alert('Erro ao salvar nova versão dos termos.');
    }
  };

  const handleDeleteAceite = async (id) => {
    if (!id) return;
    if (!window.confirm('Tem certeza de que deseja excluir este registro de aceite permanentemente?')) return;
    try {
      await deleteLgpdAceite(id);
      setLgpdAceitesList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Erro ao excluir o registro de aceite.');
    }
  };

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>🔄</div>
        <p style={{ color: theme.muted, fontSize: '0.9rem' }}>Carregando dados de governança...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
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
            <Download size={15}/> Exportar
          </Button>
          <Button 
            onClick={() => {
              setNovaVersaoText(lgpdText);
              setNovaVersaoLabel((parseFloat(lgpdVersion) + 0.1).toFixed(1));
              setShowNovaVersaoModal(true);
            }} 
            style={{ background: theme.blue, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontWeight: 800 }}
          >
            <Plus size={15}/> Nova Versão
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: 16, borderRadius: 12, fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Cards de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
        <div style={{ ...cardStyle, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '2.5rem' }}>💚</div>
          <div>
            <div style={{ color: theme.muted, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Total de Aceites</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.text, marginTop: 4 }}>{lgpdAceitesList.length}</div>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '2.5rem' }}>📜</div>
          <div>
            <div style={{ color: theme.muted, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Versão Ativa</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.text, marginTop: 4 }}>v{lgpdVersion}</div>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '2.5rem' }}>👥</div>
          <div>
            <div style={{ color: theme.muted, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Usuários Únicos</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: theme.text, marginTop: 4 }}>{uniqueUsersCount || lgpdAceitesList.length}</div>
          </div>
        </div>
      </div>

      {/* Tabela de logs */}
      <div style={{ ...cardStyle, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: theme.text }}>Registro de Atividades</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 340 }}>
            <span style={{ color: theme.muted }}><Search size={16}/></span>
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
                    <td style={{ padding: '14px 16px', textAlign: 'center', display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <button 
                        onClick={() => setSelectedAceite(item)}
                        style={{ border: 0, background: '#eff6ff', color: theme.blue, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                      >
                        <Eye size={13}/> Detalhes
                      </button>
                      <button 
                        onClick={() => handleDeleteAceite(item.id)}
                        style={{ border: 0, background: '#fef2f2', color: '#ef4444', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
                        title="Excluir do sistema"
                      >
                        <Trash2 size={13}/> Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Comprovante de Aceite */}
      {selectedAceite && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 30, width: '100%', maxWidth: 600, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'scaleUp 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: theme.text }}>Comprovante de Aceite LGPD</h3>
              <button onClick={() => setSelectedAceite(null)} style={{ border: 0, background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: theme.muted }}><X size={20}/></button>
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
                <div style={{ color: theme.text, marginTop: 2 }}>v{selectedAceite.versao}</div>
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

      {/* Modal Nova Versão */}
      {showNovaVersaoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 30, width: '100%', maxWidth: 680, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'scaleUp 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: `1px solid ${theme.border}`, paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: theme.text }}>Publicar Nova Versão dos Termos LGPD</h3>
              <button onClick={() => setShowNovaVersaoModal(false)} style={{ border: 0, background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: theme.muted }}><X size={20}/></button>
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
}
