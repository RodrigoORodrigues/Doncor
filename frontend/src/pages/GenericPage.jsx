import React from 'react';
import { Construction } from 'lucide-react';

const GenericPage = ({ pageId, pageLabel }) => {
  const isSupport = pageId === "suporte";
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 200px)' }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '48px 64px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: '#4979bb15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Construction size={32} color="#4979bb" />
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#344050', margin: '0 0 8px' }}>
          {pageLabel}
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#8a8d93', margin: 0 }}>
          Esta funcionalidade está em desenvolvimento.
        </p>
        <p style={{ fontSize: '0.72rem', color: '#b0b7c3', margin: '8px 0 0' }}>
          Em breve estará disponível para uso.
        </p>
        {isSupport && (
          <a
            href="mailto:donfim@gmail.com?subject=Suporte%20Don%20Cor"
            style={{
              display: 'inline-block',
              marginTop: '16px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#4979bb',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            Enviar e-mail para suporte
          </a>
        )}

      </div>
    </div>
  );
};

export default GenericPage;
