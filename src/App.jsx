import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import WorkoutsLog from './components/WorkoutsLog';
import AddWorkoutForm from './components/AddWorkoutForm';
import AnalyticsView from './components/AnalyticsView';
import Predictors from './components/Predictors';
import DataManager from './components/DataManager';
import AuthScreen from './components/AuthScreen';
import AchievementsView from './components/AchievementsView';
import ConfettiCanvas from './components/ConfettiCanvas';
import NutritionView from './components/NutritionView';
import ReportModal from './components/ReportModal';
import PerformanceHub from './components/PerformanceHub';
import SocialHub from './components/SocialHub';
import { useAppData } from './hooks/useAppData';
import { calculateActiveStreak } from './utils/achievements';
import CustomDialog from './components/CustomDialog';
import { Award, Sun, Moon, Printer, Flame, TrendingUp } from 'lucide-react';

/**
 * App — Componente raíz de la aplicación.
 *
 * Solo contiene estado y lógica de UI (navegación, tema, modales).
 * Todo el estado de datos, sincronización y CRUD está en el hook useAppData.
 *
 * HIGH-01: Reducido de 1,632 líneas a ~280 líneas.
 */
export default function App() {

  // ── Estado de datos (gestionado por useAppData hook) ──
  const {
    workouts, shoes, plans, readinessLogs, nutritionLogs, profile,
    isSupabaseConnected, session, user,
    showConfetti, setShowConfetti,
    activeToast, setActiveToast,
    dialog, setDialog, showAlert, showConfirm,
    handleLogin, handleRegister, handleLogout,
    handleConnectSupabase, handleDisconnectSupabase,
    handleSaveWorkout, handleDeleteWorkout, handleUpdateWorkout,
    handleUpdateNutrition, handleUpdateShoes, handleUpdatePlans,
    handleUpdateReadinessLogs, handleProfileChange,
    handleUpdateAllWorkouts, handleResetMockData,
    // COMUNIDAD
    searchUsers, sendFriendRequest, acceptFriendRequest, removeFriend, fetchFriendsList, fetchFriendData, fetchSocialFeed, toggleKudo, addComment,
    // INTEGRACIÓN STRAVA
    saveStravaCredentials, getStravaConnection, disconnectStrava, exchangeStravaCode, syncRecentStravaActivities,
  } = useAppData();

  // ── Estado de UI puro (navegación, tema, modales) ──
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const [addWorkoutPreset, setAddWorkoutPreset] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('fitanalytics_theme') || 'dark');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Escuchar solicitudes pendientes en segundo plano
  useEffect(() => {
    let active = true;
    const updateCount = async () => {
      try {
        const list = await fetchFriendsList();
        if (active) {
          const incomingPending = list.filter(f => f.status === 'pending' && !f.isSender).length;
          setPendingRequestsCount(incomingPending);
        }
      } catch (e) {
        console.error('Failed to get pending requests count:', e);
      }
    };
    
    updateCount();
    const interval = setInterval(updateCount, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchFriendsList, activeTab]);

  const handleOpenAddWorkout = (preset = null) => {
    setAddWorkoutPreset(preset);
    setIsAddWorkoutOpen(true);
  };

  // ── Aplicación de tema ──
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('theme-light');
    else root.classList.remove('theme-light');
    localStorage.setItem('fitanalytics_theme', theme);
  }, [theme]);

  // ── Render de pestañas ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            workouts={workouts}
            setActiveTab={setActiveTab}
            onAddWorkoutClick={handleOpenAddWorkout}
            onOpenReport={() => setIsReportOpen(true)}
          />
        );
      case 'workouts':
        return (
          <WorkoutsLog
            workouts={workouts}
            shoes={shoes}
            onDeleteWorkout={handleDeleteWorkout}
            onUpdateWorkout={handleUpdateWorkout}
            onUpdateAllWorkouts={handleUpdateAllWorkouts}
            onEditWorkout={handleOpenAddWorkout}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        );
      case 'analytics':
        return <AnalyticsView workouts={workouts} theme={theme} profile={profile} />;
      case 'nutrition':
        return (
          <NutritionView
            nutritionLogs={nutritionLogs}
            onUpdateNutrition={handleUpdateNutrition}
            profile={profile}
          />
        );
      case 'performance':
        return (
          <PerformanceHub
            workouts={workouts}
            profile={profile}
            shoes={shoes}
            onUpdateShoes={handleUpdateShoes}
            plans={plans}
            onUpdatePlans={handleUpdatePlans}
            readinessLogs={readinessLogs}
            onUpdateReadinessLogs={handleUpdateReadinessLogs}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        );
      case 'predictors':
        return <Predictors workouts={workouts} profile={profile} />;
      case 'achievements':
        return (
          <AchievementsView
            workouts={workouts}
            profile={profile}
            onProfileChange={handleProfileChange}
            setShowConfetti={setShowConfetti}
            onSaveWorkout={handleSaveWorkout}
            setActiveToast={setActiveToast}
          />
        );
      case 'social':
        return (
          <SocialHub
            user={user}
            searchUsers={searchUsers}
            sendFriendRequest={sendFriendRequest}
            acceptFriendRequest={acceptFriendRequest}
            removeFriend={removeFriend}
            fetchFriendsList={fetchFriendsList}
            fetchFriendData={fetchFriendData}
            fetchSocialFeed={fetchSocialFeed}
            toggleKudo={toggleKudo}
            addComment={addComment}
            profile={profile}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        );
      case 'data':
        return (
          <DataManager
            workouts={workouts}
            isSupabaseConnected={isSupabaseConnected}
            onConnectSupabase={handleConnectSupabase}
            onDisconnectSupabase={handleDisconnectSupabase}
            onUpdateAllWorkouts={handleUpdateAllWorkouts}
            onResetMockData={handleResetMockData}
            user={user}
            onLogout={handleLogout}
            onOpenReport={() => setIsReportOpen(true)}
            saveStravaCredentials={saveStravaCredentials}
            getStravaConnection={getStravaConnection}
            disconnectStrava={disconnectStrava}
            exchangeStravaCode={exchangeStravaCode}
            syncRecentStravaActivities={syncRecentStravaActivities}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        );
      default:
        return (
          <Overview
            workouts={workouts}
            setActiveTab={setActiveTab}
            onAddWorkoutClick={() => setIsAddWorkoutOpen(true)}
          />
        );
    }
  };

  // ── AuthScreen si está conectado pero sin sesión ──
  if (isSupabaseConnected && !session) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        onOfflineClick={handleDisconnectSupabase}
      />
    );
  }

  const streak = calculateActiveStreak(workouts);

  return (
    <>
      <div className="app-container">

        {/* === Mobile Top Header (visible only under 768px via CSS) === */}
        <header className="mobile-header">
          <div className="mobile-header-brand">
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <span className="brand-title gradient-text">FitAnalytics</span>
            {streak > 0 && (
              <div className="mobile-streak-badge">
                <Flame size={10} color="#f97316" />
                <span>{streak}🔥</span>
              </div>
            )}
          </div>
          <div className="mobile-header-actions">
            {/* Cloud status dot */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}
              title={isSupabaseConnected ? 'Nube Activa' : 'Modo Local'}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                background: isSupabaseConnected ? 'var(--color-running)' : 'var(--text-muted)',
                boxShadow: isSupabaseConnected ? '0 0 6px var(--color-running)' : 'none'
              }} />
            </div>
            {/* Theme toggle */}
            <button
              className="mobile-header-btn"
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {/* PDF Report */}
            <button
              className="mobile-header-btn"
              onClick={() => setIsReportOpen(true)}
              title="Generar Reporte"
            >
              <Printer size={16} />
            </button>
            {/* User avatar */}
            {user && (
              <div
                className="mobile-avatar"
                onClick={handleLogout}
                title="Cerrar Sesión"
              >
                {user.email.charAt(0).toUpperCase()}
                <span
                  className="mobile-avatar-sync"
                  style={{ background: isSupabaseConnected ? 'var(--color-running)' : 'var(--text-muted)' }}
                />
              </div>
            )}
          </div>
        </header>

        {/* Sidebar navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAddWorkoutClick={() => handleOpenAddWorkout()}
          theme={theme}
          setTheme={setTheme}
          isSupabaseConnected={isSupabaseConnected}
          user={user}
          onLogout={handleLogout}
          workouts={workouts}
          onOpenReport={() => setIsReportOpen(true)}
          pendingRequestsCount={pendingRequestsCount}
        />

        {/* Main page content area */}
        <main className="main-content">
          {renderTabContent()}
        </main>

        {/* Pop-up slideover form for adding workouts */}
        {isAddWorkoutOpen && (
          <AddWorkoutForm
            onSaveWorkout={handleSaveWorkout}
            onUpdateWorkout={handleUpdateWorkout}
            onClose={() => {
              setIsAddWorkoutOpen(false);
              setAddWorkoutPreset(null);
            }}
            preset={addWorkoutPreset}
            workouts={workouts}
            shoes={shoes}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}

        {/* Confetti & Particle system overlay */}
        {showConfetti && (
          <ConfettiCanvas onComplete={() => setShowConfetti(false)} />
        )}

        {/* Floating Premium Toast notification */}
        {activeToast && (
          <div
            className={`achievement-toast-container theme-${activeToast.colorTheme}`}
            onClick={() => setActiveToast(null)}
          >
            <div className="toast-glow"></div>
            <div className="toast-icon-wrapper">
              <Award size={24} className="toast-medal-icon animate-pulse" />
            </div>
            <div className="toast-text-content">
              <span className="toast-alert-title">¡MEDALLA DESBLOQUEADA!</span>
              <h4 className="toast-medal-title">{activeToast.title}</h4>
              <p className="toast-medal-subtitle">{activeToast.subtitle}</p>
            </div>
          </div>
        )}

      </div>

      {/* Report Modal (fuera del app-container para z-index correcto) */}
      {isReportOpen && (
        <ReportModal
          workouts={workouts}
          profile={profile}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Global Interactive Custom Dialog Modal */}
      <CustomDialog dialog={dialog} setDialog={setDialog} />
    </>
  );
}
