import React, { useState } from 'react';
import { Target, Zap, Activity, Trophy, ShieldAlert, Sparkles, Medal } from 'lucide-react';
import TrainingPlanner from './TrainingPlanner';
import ShoeTracker from './ShoeTracker';
import ReadinessDashboard from './ReadinessDashboard';
import VdotCalculator from './VdotCalculator';
import IntervalBuilder from './IntervalBuilder';
import PersonalBests from './PersonalBests';
import ConcurrentInterference from './ConcurrentInterference';

export default function PerformanceHub({ 
  workouts = [], 
  profile = {}, 
  shoes = [], 
  onUpdateShoes,
  plans = [],
  onUpdatePlans,
  readinessLogs = [],
  onUpdateReadinessLogs,
  showAlert,
  showConfirm
}) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const saved = localStorage.getItem('performance_subtab');
    localStorage.removeItem('performance_subtab'); // Consume one-off deep-link
    return saved || 'planner';
  });

  const subTabs = [
    { id: 'planner', label: 'Planificador', icon: Target },
    { id: 'shoes', label: 'Zapatillas', icon: Zap },
    { id: 'readiness', label: 'Disposición', icon: Activity },
    { id: 'vdot', label: 'Ritmos VDOT', icon: Sparkles },
    { id: 'intervals', label: 'Consistencia', icon: Medal },
    { id: 'prs', label: 'Récords', icon: Trophy },
    { id: 'interference', label: 'Interferencia', icon: ShieldAlert }
  ];

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'planner':
        return (
          <TrainingPlanner 
            workouts={workouts} 
            profile={profile}
            plans={plans} 
            onUpdatePlans={onUpdatePlans} 
            readinessLogs={readinessLogs}
          />
        );
      case 'shoes':
        return (
          <ShoeTracker 
            workouts={workouts} 
            shoes={shoes} 
            onUpdateShoes={onUpdateShoes} 
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        );
      case 'readiness':
        return (
          <ReadinessDashboard 
            profile={profile} 
            readinessLogs={readinessLogs} 
            onUpdateReadinessLogs={onUpdateReadinessLogs} 
            workouts={workouts}
          />
        );
      case 'vdot':
        return (
          <VdotCalculator 
            workouts={workouts} 
            profile={profile} 
          />
        );
      case 'intervals':
        return (
          <IntervalBuilder 
            workouts={workouts} 
          />
        );
      case 'prs':
        return (
          <PersonalBests 
            workouts={workouts} 
          />
        );
      case 'interference':
        return (
          <ConcurrentInterference 
            workouts={workouts} 
            profile={profile} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="performance-hub-container animate-fade-in">
      {/* Sub-navigation Tabs Menu */}
      <div 
        className="performance-subtabs-nav glass-card" 
        style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          whiteSpace: 'nowrap',
          padding: '0.35rem', 
          borderRadius: '14px', 
          gap: '0.25rem',
          marginBottom: '1.25rem',
          scrollbarWidth: 'none', // Ocultar scroll en Firefox
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className="subtab-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1rem',
                border: 'none',
                borderRadius: '10px',
                background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(139,92,246,0.25)' : 'transparent'}`,
                color: isActive ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: isActive ? '700' : '500',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <Icon size={16} style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render active sub-tab content */}
      <div className="performance-subtab-content">
        {renderSubTabContent()}
      </div>

      {/* Estilos embebidos específicos de la navegación secundaria */}
      <style>{`
        /* Ocultar barra de scroll en Chrome/Safari */
        .performance-subtabs-nav::-webkit-scrollbar {
          display: none;
        }

        .subtab-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.02);
        }

        .subtab-item:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
