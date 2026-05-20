import React, { useState } from 'react';
import { Bot, Save } from 'lucide-react';

const RoboConfig = () => {
  const [config, setConfig] = useState({
    intervaloMinutos: 15,
    tentativas: 3,
    notificacoes: true,
    modoSeguro: true,
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Bot size={20} color="#2C7BE5" />
        <div>
          <h2 style={{ margin: 0, color: '#344050', fontSize: '1.1rem' }}>Configuração do Robô (Master)</h2>
          <p style={{ margin: 0, color: '#8a8d93', fontSize: '0.78rem' }}>Área restrita para parâmetros avançados do Robô.</p>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:'16px', maxWidth:'680px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}>Intervalo (min)
            <input type="number" value={config.intervaloMinutos} onChange={(e)=>setConfig({...config, intervaloMinutos: Number(e.target.value)})} style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </label>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}>Tentativas automáticas
            <input type="number" value={config.tentativas} onChange={(e)=>setConfig({...config, tentativas: Number(e.target.value)})} style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </label>
        </div>

        <div style={{ marginTop:'12px', display:'grid', gap:'8px' }}>
          <label style={{ display:'flex', gap:'8px', alignItems:'center', color:'#344050' }}><input type="checkbox" checked={config.notificacoes} onChange={(e)=>setConfig({...config, notificacoes: e.target.checked})} /> Notificar falhas por e-mail</label>
          <label style={{ display:'flex', gap:'8px', alignItems:'center', color:'#344050' }}><input type="checkbox" checked={config.modoSeguro} onChange={(e)=>setConfig({...config, modoSeguro: e.target.checked})} /> Modo seguro habilitado</label>
        </div>

        <button style={{ marginTop:'14px', background:'#2C7BE5', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 12px', display:'flex', alignItems:'center', gap:'6px' }}>
          <Save size={14} /> Salvar parâmetros
        </button>
      </div>
    </div>
  );
};

export default RoboConfig;
