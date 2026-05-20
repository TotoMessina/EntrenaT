import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  Sparkles, 
  Database,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function AuthScreen({ onLogin, onRegister, onOfflineClick }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor rellena todos los campos requeridos.');
      return;
    }

    if (activeTab === 'register') {
      if (password.length < 6) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas ingresadas no coinciden.');
        return;
      }
    }

    setLoading(true);
    try {
      if (activeTab === 'login') {
        const res = await onLogin(email.trim(), password);
        if (!res.success) {
          setErrorMsg(res.message || 'Error de credenciales. Por favor intenta de nuevo.');
        }
      } else {
        const res = await onRegister(email.trim(), password);
        if (res.success) {
          setSuccessMsg('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
          setActiveTab('login');
          setPassword('');
          setConfirmPassword('');
        } else {
          setErrorMsg(res.message || 'El registro falló. Verifica si el correo ya existe.');
        }
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor. Reintenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen-container fade-in">
      {/* Background orbital glowing spheres */}
      <div className="aurora-sphere sphere-primary"></div>
      <div className="aurora-sphere sphere-secondary"></div>
      <div className="aurora-sphere sphere-pink"></div>

      <div className="auth-card-wrapper">
        {/* Brand/App Title */}
        <div className="auth-brand">
          <div className="brand-logo-wrapper">
            <TrendingUp size={28} className="animate-pulse" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="brand-title gradient-text">FitAnalytics</h1>
          <p className="brand-subtitle">Plataforma Multi-inquilino de Alto Rendimiento</p>
        </div>

        {/* Floating Glass-Card */}
        <div className="glass-card auth-card">
          {/* Tab Selector */}
          <div className="auth-tabs">
            <button 
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              disabled={loading}
            >
              <LogIn size={16} />
              <span>Iniciar Sesión</span>
            </button>
            <button 
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              disabled={loading}
            >
              <UserPlus size={16} />
              <span>Crear Cuenta</span>
            </button>
          </div>

          <p className="auth-intro-text text-secondary text-xs">
            {activeTab === 'login' 
              ? 'Introduce tus credenciales para acceder a tus entrenamientos privados guardados en la nube.'
              : 'Regístrate para obtener una cuenta privada y respaldar tus progresos de running y gimnasio de forma indestructible.'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email input */}
            <div className="form-group">
              <label className="form-label">Dirección de Email</label>
              <div className="input-with-icon-container">
                <Mail className="input-icon-left" size={18} />
                <input 
                  type="email" 
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input input-icon-padding"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password input */}
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div className="input-with-icon-container">
                <Lock className="input-icon-left" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input input-icon-padding"
                  required
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password input (only register) */}
            {activeTab === 'register' && (
              <div className="form-group fade-in">
                <label className="form-label">Confirmar Contraseña</label>
                <div className="input-with-icon-container">
                  <Lock className="input-icon-left" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input input-icon-padding"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="auth-alert error fade-in">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert success fade-in">
                <Sparkles size={16} style={{ color: 'var(--color-running)' }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className={`btn ${activeTab === 'login' ? 'btn-primary' : 'btn-gym'} auth-submit-btn flex-center`}
              disabled={loading}
            >
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <span>{activeTab === 'login' ? 'Acceder a mi Cuenta' : 'Registrarme ahora'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Offline Guest Option */}
        <div className="auth-offline-block fade-in">
          <p className="text-secondary text-xs">¿No quieres sincronizar tus datos en la nube todavía?</p>
          <button onClick={onOfflineClick} className="auth-offline-btn flex-center">
            <Database size={14} />
            <span>Utilizar en Modo Local (Sin Cuenta)</span>
          </button>
        </div>
      </div>

      <style>{`
        .auth-screen-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: var(--bg-base);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow-y: auto;
          padding: 2rem 1rem;
        }

        /* Glowing Auroras */
        .aurora-sphere {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.15;
          z-index: 1;
          pointer-events: none;
        }

        .sphere-primary {
          width: 400px;
          height: 400px;
          background: var(--color-primary);
          top: 10%;
          left: 20%;
          animation: orbFloat 25s ease-in-out infinite alternate;
        }

        .sphere-secondary {
          width: 350px;
          height: 350px;
          background: var(--color-running);
          bottom: 15%;
          right: 15%;
          animation: orbFloat 20s ease-in-out infinite alternate-reverse;
        }

        .sphere-pink {
          width: 300px;
          height: 300px;
          background: var(--color-gym);
          top: 50%;
          left: 60%;
          animation: orbFloat 18s ease-in-out infinite alternate;
        }

        @keyframes orbFloat {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, -40px) scale(1.15); }
        }

        .auth-card-wrapper {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .auth-brand {
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .brand-logo-wrapper {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem auto;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
        }

        .brand-title {
          font-size: 2.1rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: 0.25rem;
        }

        .brand-subtitle {
          font-size: 0.8rem;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 600;
        }

        .auth-card {
          padding: 2.25rem 2rem;
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(14, 17, 26, 0.85);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7);
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.25);
          padding: 0.35rem;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          margin-bottom: 1.5rem;
        }

        .auth-tab-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .auth-tab-btn:hover {
          color: var(--text-primary);
        }

        .auth-tab-btn.active {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .auth-intro-text {
          text-align: center;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Input icons logic */
        .input-with-icon-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon-left {
          position: absolute;
          left: 1rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-icon-padding {
          padding-left: 2.75rem !important;
        }

        .password-toggle-btn {
          position: absolute;
          right: 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          border-radius: 4px;
          transition: color var(--transition-fast);
        }

        .password-toggle-btn:hover {
          color: var(--text-primary);
        }

        .auth-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 500;
          line-height: 1.4;
        }

        .auth-alert.error {
          background-color: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .auth-alert.success {
          background-color: rgba(16, 185, 129, 0.1);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .auth-submit-btn {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.85rem !important;
          font-size: 1rem !important;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255, 255, 255, 0.2);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Offline Guest option */
        .auth-offline-block {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .auth-offline-btn {
          align-self: center;
          background: transparent;
          border: 1px dashed var(--border-light);
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .auth-offline-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: rgba(139, 92, 246, 0.03);
        }
      `}</style>
    </div>
  );
}
