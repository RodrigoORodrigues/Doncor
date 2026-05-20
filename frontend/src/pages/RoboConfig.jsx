import React, { useMemo, useState } from 'react';
import { Bot, Save, ShieldCheck, KeyRound, Globe, ServerCog, Plus, Trash2 } from 'lucide-react';

const emptyOperadora = { nome: '', url: '', usuario: '', senha: '' };

const RoboConfig = () => {
  const [config, setConfig] = useState({
    intervaloMinutos: 15,
    tentativas: 3,
    notificacoes: true,
    modoSeguro: true,
    ambienteExecucao: 'backend_fastapi',
    triggerEndpoint: '/api/v1/trigger-rpa',
    rpaServiceUrl: '',
    timeoutSegundos: 120,
    operadoras: [{ ...emptyOperadora }],
    supabaseUrl: '',
    supabaseServiceRoleKey: '',
    supabaseBucketBoletos: 'boletos',
    logNivel: 'INFO',
  });

  const requiredFields = useMemo(() => {
    const base = ['supabaseUrl', 'supabaseServiceRoleKey'];
    if (config.ambienteExecucao === 'edge_function') return [...base, 'triggerEndpoint'];
    if (config.ambienteExecucao === 'backend_fastapi') return [...base, 'triggerEndpoint'];
    return [...base, 'rpaServiceUrl'];
  }, [config.ambienteExecucao]);

  const operadoraMissing = config.operadoras.some((op) => !op.url || !op.usuario || !op.senha);
  const missingCount = requiredFields.filter((field) => !String(config[field] || '').trim()).length + (operadoraMissing ? 1 : 0);

  const updateOperadora = (index, key, value) => {
    const next = [...config.operadoras];
    next[index] = { ...next[index], [key]: value };
    setConfig({ ...config, operadoras: next });
  };

  const addOperadora = () => setConfig({ ...config, operadoras: [...config.operadoras, { ...emptyOperadora }] });
  const removeOperadora = (index) => setConfig({ ...config, operadoras: config.operadoras.filter((_, i) => i !== index) });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Bot size={20} color="#2C7BE5" />
        <div>
          <h2 style={{ margin: 0, color: '#344050', fontSize: '1.1rem' }}>Configuração do Robô (Master)</h2>
          <p style={{ margin: 0, color: '#8a8d93', fontSize: '0.78rem' }}>
            Parametrize conforme documentação: SUPABASEURL, SUPABASESERVICEROLEKEY, OPERADORAURL, OPERADORAUSERNAME, OPERADORA_PASSWORD.
          </p>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'8px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:'16px', maxWidth:'980px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '12px' }}>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}>Intervalo (min)
            <input type="number" value={config.intervaloMinutos} onChange={(e)=>setConfig({...config, intervaloMinutos: Number(e.target.value)})} style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </label>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}>Tentativas automáticas
            <input type="number" value={config.tentativas} onChange={(e)=>setConfig({...config, tentativas: Number(e.target.value)})} style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </label>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}>Timeout (seg)
            <input type="number" value={config.timeoutSegundos} onChange={(e)=>setConfig({...config, timeoutSegundos: Number(e.target.value)})} style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </label>
        </div>

        <div style={{ marginTop:'14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}><ServerCog size={14} style={{display:'inline',marginRight:'6px'}}/>Ambiente de execução
            <select value={config.ambienteExecucao} onChange={(e)=>setConfig({...config, ambienteExecucao: e.target.value})} style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }}>
              <option value="edge_function">Edge Function (Recomendado)</option>
              <option value="backend_fastapi">Backend FastAPI/Python</option>
              <option value="servico_externo">Serviço Externo RPA</option>
            </select>
          </label>

          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}><Globe size={14} style={{display:'inline',marginRight:'6px'}}/>Endpoint de acionamento
            <input value={config.triggerEndpoint} onChange={(e)=>setConfig({...config, triggerEndpoint: e.target.value})} placeholder="/api/v1/trigger-rpa" style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </label>
        </div>

        <div style={{ marginTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}>RPA_SERVICE_URL (quando serviço externo)
            <input value={config.rpaServiceUrl} onChange={(e)=>setConfig({...config, rpaServiceUrl: e.target.value})} placeholder="https://rpa.example.com/execute" style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </label>
          <label style={{ fontSize:'0.82rem', color:'#5E6E82' }}>Nível de log
            <select value={config.logNivel} onChange={(e)=>setConfig({...config, logNivel: e.target.value})} style={{ width:'100%', marginTop:'6px', border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }}>
              <option>INFO</option><option>WARNING</option><option>ERROR</option><option>DEBUG</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop:'16px', borderTop:'1px solid #eef2f7', paddingTop:'12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <h3 style={{ margin:0, fontSize:'0.9rem', color:'#344050' }}><KeyRound size={14} style={{display:'inline',marginRight:'6px'}}/>Credenciais da Operadora</h3>
            <button type="button" onClick={addOperadora} style={{ border:'1px solid #2C7BE5', color:'#2C7BE5', background:'#fff', borderRadius:'6px', padding:'6px 10px', display:'flex', alignItems:'center', gap:'6px' }}><Plus size={13}/>Adicionar operadora</button>
          </div>

          {config.operadoras.map((op, idx) => (
            <div key={idx} style={{ display:'grid', gridTemplateColumns:'0.8fr 1fr 1fr 1fr auto', gap:'10px', marginBottom:'10px' }}>
              <input value={op.nome} onChange={(e)=>updateOperadora(idx, 'nome', e.target.value)} placeholder="Nome da operadora" style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
              <input value={op.url} onChange={(e)=>updateOperadora(idx, 'url', e.target.value)} placeholder="OPERADORAURL" style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
              <input value={op.usuario} onChange={(e)=>updateOperadora(idx, 'usuario', e.target.value)} placeholder="OPERADORAUSERNAME" style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
              <input type="password" value={op.senha} onChange={(e)=>updateOperadora(idx, 'senha', e.target.value)} placeholder="OPERADORA_PASSWORD" style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
              <button type="button" onClick={() => removeOperadora(idx)} disabled={config.operadoras.length === 1} style={{ border:'1px solid #ef4444', color:'#ef4444', background:'#fff', borderRadius:'6px', padding:'8px' }}><Trash2 size={14}/></button>
            </div>
          ))}
        </div>

        <div style={{ marginTop:'14px', borderTop:'1px solid #eef2f7', paddingTop:'12px' }}>
          <h3 style={{ margin:'0 0 10px', fontSize:'0.9rem', color:'#344050' }}><ShieldCheck size={14} style={{display:'inline',marginRight:'6px'}}/>Supabase (backend seguro)</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <input value={config.supabaseUrl} onChange={(e)=>setConfig({...config, supabaseUrl:e.target.value})} placeholder="SUPABASEURL" style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
            <input type="password" value={config.supabaseServiceRoleKey} onChange={(e)=>setConfig({...config, supabaseServiceRoleKey:e.target.value})} placeholder="SUPABASESERVICEROLEKEY" style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
            <input value={config.supabaseBucketBoletos} onChange={(e)=>setConfig({...config, supabaseBucketBoletos:e.target.value})} placeholder="Bucket de boletos" style={{ border:'1px solid #d8e2ef', borderRadius:'6px', padding:'8px' }} />
          </div>
        </div>

        <div style={{ marginTop:'12px', display:'grid', gap:'8px' }}>
          <label style={{ display:'flex', gap:'8px', alignItems:'center', color:'#344050' }}><input type="checkbox" checked={config.notificacoes} onChange={(e)=>setConfig({...config, notificacoes: e.target.checked})} /> Notificar falhas (e-mail/slack)</label>
          <label style={{ display:'flex', gap:'8px', alignItems:'center', color:'#344050' }}><input type="checkbox" checked={config.modoSeguro} onChange={(e)=>setConfig({...config, modoSeguro: e.target.checked})} /> Modo seguro habilitado</label>
        </div>

        <div style={{ marginTop:'12px', fontSize:'0.78rem', color: missingCount ? '#b45309' : '#15803d' }}>
          {missingCount ? `Campos obrigatórios pendentes: ${missingCount}` : 'Todos os campos obrigatórios foram preenchidos.'}
        </div>

        <button style={{ marginTop:'14px', background:'#2C7BE5', color:'#fff', border:'none', borderRadius:'6px', padding:'8px 12px', display:'flex', alignItems:'center', gap:'6px' }}>
          <Save size={14} /> Salvar parâmetros
        </button>
      </div>
    </div>
  );
};

export default RoboConfig;
