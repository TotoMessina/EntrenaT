import React, { useState } from 'react';
import { 
  Activity, 
  Dumbbell, 
  TrendingUp, 
  Sparkles, 
  Database,
  PlusCircle,
  Plus,
  Sun,
  Moon,
  LogOut,
  Award,
  Apple,
  Printer,
  Flame,
  MoreHorizontal,
  X,
  Zap,
  Users
} from 'lucide-react';
import { calculateAchievements, calculateActiveStreak } from '../utils/achievements';

export default function Sidebar({ activeTab, setActiveTab, onAddWorkoutClick, theme, setTheme, isSupabaseConnected, user, onLogout, workouts = [], onOpenReport, pendingRequestsCount = 0 }) {
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const achievements = calculateAchievements(workouts);
  const unlockedCount = achievements.reduce((acc, a) => {
    if (a.tier === 'bronze') return acc + 1;
    if (a.tier === 'silver') return acc + 2;
    if (a.tier === 'gold' || a.tier === 'maxed') return acc + 3;
    return acc;
  }, 0);
  const streak = calculateActiveStreak(workouts);

  // Desktop: all 8 items
  const menuItems = [
    { id: 'overview', label: 'Resumen', icon: Activity },
    { id: 'performance', label: 'Rendimiento', icon: Zap },
    { id: 'workouts', label: 'Historial', icon: Dumbbell },
    { id: 'analytics', label: 'Estadísticas', icon: TrendingUp },
    { id: 'nutrition', label: 'Nutrición', icon: Apple },
    { id: 'predictors', label: 'Calculadoras', icon: Sparkles },
    { id: 'achievements', label: 'Logros', icon: Award },
    { id: 'social', label: 'Comunidad', icon: Users },
    { id: 'data', label: 'Respaldos', icon: Database },
  ];

  // Mobile bottom bar: 3 core + FAB spacer + Más
  const mobileCoreItems = [
    { id: 'overview', label: 'Resumen', icon: Activity },
    { id: 'workouts', label: 'Historial', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrición', icon: Apple },
  ];

  // Items in the sliding bottom-sheet drawer
  const moreItems = [
    { id: 'performance', label: 'Rendimiento', icon: Zap },
    { id: 'analytics', label: 'Estadísticas', icon: TrendingUp },
    { id: 'predictors', label: 'Calculadoras', icon: Sparkles },
    { id: 'achievements', label: 'Logros', icon: Award },
    { id: 'social', label: 'Comunidad', icon: Users },
    { id: 'data', label: 'Respaldos', icon: Database },
  ];

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleMoreItemClick = (id) => {
    setActiveTab(id);
    setShowMoreSheet(false);
  };

  return (
    <>
      <aside className="sidebar glass-card">
        {/* ===== Desktop Sidebar Brand ===== */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <TrendingUp className="text-primary-glow animate-pulse" size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="brand-text-col">
            <span className="brand-name gradient-text">FitAnalytics</span>
            {streak > 0 && (
              <div className="streak-badge animate-fade-in" title={`${streak} Semanas Consecutivas entrenando (Mínimo 3 días)`}>
                <Flame size={12} className="flame-icon" color="#f97316" />
                <span>{streak} Semanas en Racha</span>
              </div>
            )}
          </div>
        </div>

        {/* ===== Desktop Full Nav (hidden on mobile via CSS) ===== */}
        <nav className="sidebar-nav sidebar-nav-desktop">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={20} />
                <span className="nav-label">{item.label}</span>
                {item.id === 'achievements' && unlockedCount > 0 && (
                  <span className="sidebar-badge-count animate-pulse">
                    {unlockedCount}
                  </span>
                )}
                {item.id === 'social' && pendingRequestsCount > 0 && (
                  <span className="sidebar-badge-count animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-running) 0%, #10b981 100%)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }}>
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ===== Mobile Bottom Bar Nav (visible only on mobile via CSS) ===== */}
        <nav className="sidebar-nav sidebar-nav-mobile">
          {/* Left 2 core items */}
          {mobileCoreItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={22} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Central FAB spacer slot */}
          <div className="nav-fab-slot" aria-hidden="true" />

          {/* Right core item (Nutrición) */}
          {mobileCoreItems.slice(2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={22} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Más / More button */}
          <button
            onClick={() => setShowMoreSheet(true)}
            className={`nav-item ${moreItems.some(m => m.id === activeTab) ? 'active' : ''}`}
          >
            <MoreHorizontal className="nav-icon" size={22} />
            <span className="nav-label">Más</span>
            {pendingRequestsCount > 0 && (
              <span className="sidebar-badge-count animate-pulse" style={{ background: 'linear-gradient(135deg, var(--color-running) 0%, #10b981 100%)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)' }}>
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </nav>

        {/* User profile card (Desktop only – hidden on mobile) */}
        {user && (
          <div className="user-profile-card">
            <div className="avatar-container" onClick={onLogout} title="Cerrar Sesión">
              <div className="avatar">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="avatar-logout-hover">
                <LogOut size={16} />
              </div>
            </div>
            <div className="user-info">
              <span className="email">{user.email}</span>
              <span className="badge">Usuario Premium</span>
            </div>
            <button onClick={onLogout} className="logout-button" title="Cerrar Sesión">
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Cloud & Theme Utilities */}
        <div className="sidebar-utilities">
          <div 
            className="supabase-status-badge" 
            title={isSupabaseConnected ? "Sincronizado con Supabase Cloud" : "Almacenamiento Local (Modo Offline)"}
          >
            <span className={`status-dot ${isSupabaseConnected ? 'connected' : 'local'}`}></span>
            <span className="status-label">
              {isSupabaseConnected ? 'Nube Activa' : 'Local'}
            </span>
          </div>

          <button 
            onClick={handleThemeToggle} 
            className="theme-switcher-btn"
            title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button 
            onClick={onOpenReport} 
            className="theme-switcher-btn"
            title="Generar Reporte PDF / Ficha de Entrenamiento"
          >
            <Printer size={18} />
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-primary w-full flex-center" onClick={onAddWorkoutClick}>
            <PlusCircle size={18} />
            <span>Añadir Sesión</span>
          </button>
        </div>

        <style>{`
          .sidebar {
            position: fixed;
            top: 1.5rem;
            left: 1.5rem;
            bottom: 1.5rem;
            width: 240px;
            display: flex;
            flex-direction: column;
            padding: 2rem 1.25rem;
            z-index: 100;
            border-radius: 20px;
            border: 1px solid var(--border-light);
          }

          .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 3rem;
            padding-left: 0.5rem;
          }

          .brand-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.25);
          }

          .brand-name {
            font-size: 1.3rem;
            font-weight: 800;
            letter-spacing: -0.03em;
          }

          .brand-text-col {
            display: flex;
            flex-direction: column;
          }

          .streak-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 2px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #f97316;
            background: rgba(249, 115, 22, 0.1);
            border: 1px solid rgba(249, 115, 22, 0.2);
            padding: 2px 6px;
            border-radius: 6px;
          }

          .flame-icon {
            animation: flicker 2s infinite ease-in-out;
          }

          @keyframes flicker {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.1); }
          }

          .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .nav-item {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            padding: 0.85rem 1rem;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            border-radius: 12px;
            font-family: var(--font-sans);
            font-size: 0.95rem;
            font-weight: 500;
            text-align: left;
            cursor: pointer;
            transition: all var(--transition-fast);
          }

          .nav-item:hover {
            background: rgba(255, 255, 255, 0.04);
            color: var(--text-primary);
            padding-left: 1.25rem;
          }

          .nav-item.active {
            background: rgba(139, 92, 246, 0.15);
            color: #ffffff;
            border-left: 3px solid var(--color-primary);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
          }

          .sidebar-badge-count {
            margin-left: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%);
            color: #ffffff;
            font-size: 0.72rem;
            font-weight: 800;
            min-width: 18px;
            height: 18px;
            border-radius: 9px;
            padding: 0 5px;
            box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.15);
            transition: transform var(--transition-fast);
          }

          .nav-item:hover .sidebar-badge-count {
            transform: scale(1.1);
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.7);
          }

          .nav-icon {
            flex-shrink: 0;
            transition: transform var(--transition-fast);
          }

          .nav-item.active .nav-icon {
            color: var(--color-primary);
            filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.5));
          }

          .nav-item:hover .nav-icon {
            transform: scale(1.1);
          }

          .sidebar-utilities {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.85rem 0.5rem;
            margin-top: auto;
            margin-bottom: 0.85rem;
            border-top: 1px solid var(--border-light);
            border-bottom: 1px solid var(--border-light);
            gap: 0.5rem;
          }

          .supabase-status-badge {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-light);
            padding: 0.35rem 0.6rem;
            border-radius: 8px;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-secondary);
            cursor: help;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
          }

          .status-dot.connected {
            background-color: var(--color-running);
            box-shadow: 0 0 8px var(--color-running);
          }

          .status-dot.local {
            background-color: var(--text-muted);
          }

          .theme-switcher-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 1px solid var(--border-light);
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all var(--transition-fast);
          }

          .theme-switcher-btn:hover {
            background: rgba(139, 92, 246, 0.1);
            color: var(--color-primary);
            border-color: rgba(139, 92, 246, 0.25);
          }

          .sidebar-footer {
            padding-top: 0.5rem;
          }

          .w-full {
            width: 100%;
          }

          .flex-center {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }

          .user-profile-card {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-light);
            padding: 0.75rem;
            border-radius: 12px;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
            transition: all var(--transition-fast);
          }

          .user-profile-card:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(139, 92, 246, 0.2);
          }

          .avatar-container {
            position: relative;
            width: 32px;
            height: 32px;
            flex-shrink: 0;
            cursor: pointer;
          }

          .avatar {
            width: 100%;
            height: 100%;
            border-radius: 8px;
            background: linear-gradient(135deg, var(--color-primary), #6d28d9);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.9rem;
            transition: all var(--transition-fast);
          }

          .avatar-logout-hover {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 8px;
            background: var(--color-running);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.8);
            transition: all var(--transition-fast);
          }

          .avatar-container:hover .avatar-logout-hover {
            opacity: 1;
            transform: scale(1);
          }

          .avatar-container:hover .avatar {
            opacity: 0;
            transform: scale(0.8);
          }

          .user-info {
            display: flex;
            flex-direction: column;
            min-width: 0;
            flex: 1;
          }

          .user-info .email {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .user-info .badge {
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--text-muted);
          }

          .logout-button {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all var(--transition-fast);
          }

          .logout-button:hover {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
          }

          /* Tablet: mini sidebar (icons only) */
          @media (max-width: 1024px) {
            .sidebar {
              width: 70px;
              padding: 2rem 0.5rem;
              align-items: center;
            }
            .brand-name, .nav-label, .sidebar-footer span, .status-label {
              display: none;
            }
            .sidebar-brand {
              padding: 0;
              margin-bottom: 2rem;
            }
            .nav-item {
              justify-content: center;
              padding: 0.85rem;
            }
            .nav-item:hover {
              padding-left: 0.85rem;
            }
            .user-profile-card {
              padding: 0.25rem;
              background: transparent;
              border: none;
              justify-content: center;
              width: 100%;
              margin-top: 1rem;
              margin-bottom: 0.5rem;
            }
            .user-info, .logout-button {
              display: none;
            }
            .sidebar-utilities {
              flex-direction: column;
              gap: 0.75rem;
              border: none;
              padding: 0.75rem 0;
              width: 100%;
            }
            .supabase-status-badge {
              padding: 0.4rem;
              border-radius: 8px;
              justify-content: center;
              width: 32px;
              height: 32px;
            }
            .sidebar-footer {
              width: 100%;
              display: flex;
              justify-content: center;
              padding-top: 1rem;
              border-top: 1px solid var(--border-light);
            }
            .btn {
              padding: 0.75rem;
              width: 42px;
              height: 42px;
              border-radius: 10px;
            }
          }

          /* Mobile: bottom bar */
          @media (max-width: 768px) {
            .sidebar {
              position: fixed;
              top: auto;
              left: 0;
              right: 0;
              bottom: 0;
              width: 100%;
              height: 65px;
              flex-direction: row;
              padding: 0;
              border-radius: 20px 20px 0 0;
              border: 1px solid var(--border-light);
              border-bottom: none;
              background: rgba(9, 10, 15, 0.95);
              backdrop-filter: blur(20px);
              z-index: 1000;
              align-items: stretch;
              overflow: visible;
            }

            /* Hide desktop elements */
            .sidebar-brand,
            .user-profile-card,
            .sidebar-utilities,
            .sidebar-footer {
              display: none !important;
            }

            /* Desktop nav hidden on mobile */
            .sidebar-nav-desktop {
              display: none !important;
            }

            /* Mobile nav fills the full bottom bar */
            .sidebar-nav-mobile {
              display: flex !important;
              flex-direction: row;
              gap: 0;
              margin: 0;
              width: 100%;
              height: 100%;
              justify-content: space-around;
              align-items: stretch;
            }

            .nav-item {
              flex: 1;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 3px;
              height: 100%;
              background: transparent !important;
              border-left: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              color: var(--text-muted);
              position: relative;
            }

            .nav-item.active {
              color: var(--color-primary);
            }

            .nav-item.active::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 20px;
              height: 2px;
              background: var(--color-primary);
              border-radius: 2px 2px 0 0;
              box-shadow: 0 0 6px rgba(139, 92, 246, 0.6);
            }

            .nav-item:hover {
              color: var(--text-primary);
              padding-left: 0;
            }

            .nav-label {
              display: block !important;
              font-size: 0.6rem;
              font-weight: 500;
            }

            .nav-icon {
              margin: 0;
              width: 22px;
              height: 22px;
            }

            .nav-item.active .nav-icon {
              filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.6));
            }

            /* FAB spacer in center of bottom nav */
            .nav-fab-slot {
              flex: 1;
              min-width: 60px;
              pointer-events: none;
            }

            .sidebar-badge-count {
              position: absolute;
              top: 6px;
              right: 50%;
              margin-right: -18px;
              min-width: 14px;
              height: 14px;
              font-size: 0.55rem;
            }
          }

          /* Desktop only: show desktop nav, hide mobile nav */
          @media (min-width: 769px) {
            .sidebar-nav-mobile {
              display: none !important;
            }
            .sidebar-nav-desktop {
              display: flex;
            }
          }
        `}</style>
      </aside>

      {/* ===== Global Floating Action Button (mobile only via CSS) ===== */}
      <button
        className="mobile-fab-btn"
        onClick={onAddWorkoutClick}
        title="Añadir Sesión"
        aria-label="Añadir Sesión"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* ===== Mobile More Sheet Backdrop ===== */}
      <div
        className={`mobile-more-sheet-overlay ${showMoreSheet ? 'open' : ''}`}
        onClick={() => setShowMoreSheet(false)}
      />

      {/* ===== Mobile More Sheet Drawer ===== */}
      <div className={`mobile-more-sheet ${showMoreSheet ? 'open' : ''}`}>
        <div className="mobile-more-sheet-header">
          <span className="mobile-more-sheet-title gradient-text">Más opciones</span>
          <button className="mobile-more-sheet-close" onClick={() => setShowMoreSheet(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="mobile-more-grid">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`mobile-more-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleMoreItemClick(item.id)}
                style={{ position: 'relative' }}
              >
                <Icon className="mobile-more-item-icon" size={20} />
                <span className="mobile-more-item-label">{item.label}</span>
                {item.id === 'social' && pendingRequestsCount > 0 && (
                  <span className="sidebar-badge-count animate-pulse" style={{ position: 'absolute', top: '10px', right: '12px', background: 'linear-gradient(135deg, var(--color-running) 0%, #10b981 100%)', boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)', margin: 0 }}>
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mobile-more-footer">
          {user ? (
            <button
              className="btn btn-danger w-full flex-center"
              onClick={() => { onLogout(); setShowMoreSheet(false); }}
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span
                className={`status-dot ${isSupabaseConnected ? 'connected' : 'local'}`}
                style={{ display: 'inline-block', marginRight: '0.4rem' }}
              ></span>
              {isSupabaseConnected ? 'Nube Activa' : 'Modo Local (Offline)'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
