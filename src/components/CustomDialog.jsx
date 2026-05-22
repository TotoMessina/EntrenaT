import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert, Trash2 } from 'lucide-react';

/**
 * CustomDialog — Glassmorphism modal dynamically adjusting icons, glow colors,
 * and layouts depending on type, title, and theme options.
 * Resolves the async promise initialized in useAppData context.
 */
export default function CustomDialog({ dialog, setDialog }) {
  if (!dialog) return null;

  const { type, title, message, resolve } = dialog;

  const handleCancel = () => {
    setDialog(null);
    resolve(false);
  };

  const handleConfirm = () => {
    setDialog(null);
    resolve(true);
  };

  // Determine icon and color scheme based on title/message content
  let icon = <Info size={36} style={{ color: 'var(--color-primary)' }} />;
  let glowColor = 'var(--color-primary-glow)';
  let accentColor = 'var(--color-primary)';
  
  const titleLower = (title || '').toLowerCase();
  const messageLower = (message || '').toLowerCase();

  if (titleLower.includes('eliminar') || titleLower.includes('borrar') || titleLower.includes('quitar') || messageLower.includes('borrar') || messageLower.includes('eliminar')) {
    icon = <Trash2 size={36} style={{ color: '#ef4444' }} />;
    glowColor = 'rgba(239, 68, 68, 0.25)';
    accentColor = '#ef4444';
  } else if (titleLower.includes('restablecer') || titleLower.includes('reiniciar') || titleLower.includes('cuidado') || titleLower.includes('advertencia') || titleLower.includes('alerta') || titleLower.includes('error')) {
    icon = <AlertTriangle className="animate-pulse" size={36} style={{ color: '#fbbf24' }} />;
    glowColor = 'rgba(251, 191, 36, 0.25)';
    accentColor = '#fbbf24';
  } else if (titleLower.includes('exito') || titleLower.includes('éxito') || titleLower.includes('guardado') || titleLower.includes('correcto') || titleLower.includes('sincronizado')) {
    icon = <CheckCircle2 size={36} style={{ color: '#10b981' }} />;
    glowColor = 'rgba(16, 185, 129, 0.25)';
    accentColor = '#10b981';
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 4, 6, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999, // extremely high to overlay even PDF Report
        padding: '1.5rem',
        animation: 'fadeInDialog 0.2s ease-out'
      }}
      onClick={handleCancel}
    >
      <style>{`
        @keyframes fadeInDialog {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUpDialog {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          border: `1px solid var(--border-light)`,
          borderTop: `4px solid ${accentColor}`,
          boxShadow: `0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 32px ${glowColor}`,
          animation: 'scaleUpDialog 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          background: 'var(--bg-surface-solid)',
          borderRadius: '20px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: `inset 0 0 10px rgba(255,255,255,0.01)`
          }}
        >
          {icon}
        </div>

        <h3 
          style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}
        >
          {title}
        </h3>

        <p 
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            marginBottom: '1.75rem',
            whiteSpace: 'pre-wrap'
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          {type === 'confirm' && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '0.7rem', fontSize: '0.875rem', borderRadius: '12px' }}
              onClick={handleCancel}
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              padding: '0.7rem',
              fontSize: '0.875rem',
              borderRadius: '12px',
              backgroundColor: accentColor,
              color: '#ffffff',
              boxShadow: `0 4px 12px ${glowColor}`,
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            onClick={handleConfirm}
          >
            {type === 'confirm' ? 'Confirmar' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}
