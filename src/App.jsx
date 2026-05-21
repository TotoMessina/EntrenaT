import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import WorkoutsLog from './components/WorkoutsLog';
import AddWorkoutForm from './components/AddWorkoutForm';
import AnalyticsView from './components/AnalyticsView';
import Predictors from './components/Predictors';
import DataManager from './components/DataManager';
import AuthScreen from './components/AuthScreen';
import { MOCK_WORKOUTS } from './mockData';
import { getSupabase, initSupabase, clearSupabase } from './utils/supabaseClient';
import AchievementsView from './components/AchievementsView';
import ConfettiCanvas from './components/ConfettiCanvas';
import { calculateAchievements, calculateActiveStreak } from './utils/achievements';
import { Award, Sun, Moon, Printer, Flame, TrendingUp } from 'lucide-react';
import NutritionView from './components/NutritionView';
import ReportModal from './components/ReportModal';
import PerformanceHub from './components/PerformanceHub';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [workouts, setWorkouts] = useState([]);
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const [addWorkoutPreset, setAddWorkoutPreset] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // --- SHOE TRACKER STATE ---
  const [shoes, setShoes] = useState(() => {
    const stored = localStorage.getItem('fitanalytics_shoes');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error("Error reading shoes", e); return []; }
    }
    return [];
  });

  // Persist shoes
  useEffect(() => {
    localStorage.setItem('fitanalytics_shoes', JSON.stringify(shoes));
  }, [shoes]);

  // --- TRAINING PLANS STATE ---
  const [plans, setPlans] = useState(() => {
    const stored = localStorage.getItem('fitanalytics_training_plans');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error("Error reading plans", e); return []; }
    }
    return [];
  });

  // Persist plans
  useEffect(() => {
    localStorage.setItem('fitanalytics_training_plans', JSON.stringify(plans));
  }, [plans]);

  // --- READINESS LOGS STATE ---
  const [readinessLogs, setReadinessLogs] = useState(() => {
    const stored = localStorage.getItem('fitanalytics_readiness_logs');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { console.error("Error reading readiness logs", e); return []; }
    }
    return [];
  });

  // Persist readiness logs
  useEffect(() => {
    localStorage.setItem('fitanalytics_readiness_logs', JSON.stringify(readinessLogs));
  }, [readinessLogs]);

  // --- NUTRITION STATE ---
  const [nutritionLogs, setNutritionLogs] = useState(() => {
    const stored = localStorage.getItem('fitanalytics_nutrition');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error reading nutrition logs", e);
        return [];
      }
    }
    return [];
  });

  // Persist nutrition state locally
  useEffect(() => {
    localStorage.setItem('fitanalytics_nutrition', JSON.stringify(nutritionLogs));
  }, [nutritionLogs]);

  const handleOpenAddWorkout = (preset = null) => {
    setAddWorkoutPreset(preset);
    setIsAddWorkoutOpen(true);
  };
  
  // --- THEME STATE ---
  const [theme, setTheme] = useState(() => localStorage.getItem('fitanalytics_theme') || 'dark');
  
  // --- SUPABASE CONNECTIVITY STATE ---
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  // --- INITIALIZE THEME ---
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.remove('theme-light');
    }
    localStorage.setItem('fitanalytics_theme', theme);
  }, [theme]);

  // --- GAMIFICATION & CONFETTI STATES ---
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const [profile, setProfile] = useState(() => {
    const age = Number(localStorage.getItem('fitanalytics_profile_age') || localStorage.getItem('fitanalytics_age')) || 25;
    const weight = Number(localStorage.getItem('fitanalytics_profile_weight')) || 75;
    const height = Number(localStorage.getItem('fitanalytics_profile_height')) || 175;
    const restingHR = Number(localStorage.getItem('fitanalytics_profile_resting_hr')) || 60;
    const gender = localStorage.getItem('fitanalytics_profile_gender') || 'male';
    return { age, weight, height, restingHR, gender };
  });

  // --- OBSERVADOR DINÁMICO DE LOGROS Y HETOS ---
  useEffect(() => {
    if (!workouts || workouts.length === 0) return;
    
    // Ejecutamos cálculo dinámico de logros con el perfil reactivo
    const currentAchievements = calculateAchievements(workouts, profile);
    
    let notified = [];
    try {
      notified = JSON.parse(localStorage.getItem('fitanalytics_notified_achievements') || '[]');
    } catch (e) {
      notified = [];
    }
    
    const newlyUnlocked = [];
    const updatedNotified = [...notified];
    let triggeredAny = false;
    
    currentAchievements.forEach(ach => {
      if (ach.isUnlocked && !notified.includes(ach.id)) {
        newlyUnlocked.push(ach);
        updatedNotified.push(ach.id);
        triggeredAny = true;
      }
    });
    
    if (triggeredAny) {
      // Guardar en almacenamiento persistente
      localStorage.setItem('fitanalytics_notified_achievements', JSON.stringify(updatedNotified));
      
      // Lanzar confeti premium
      setShowConfetti(true);
      
      // Mostrar Toast Premium flotante para el primer logro desbloqueado de la ráfaga
      if (newlyUnlocked.length > 0) {
        const medal = newlyUnlocked[0];
        const toastId = Date.now();
        setActiveToast({
          id: toastId,
          title: medal.title,
          subtitle: medal.subtitle,
          colorTheme: medal.colorTheme
        });
        
        // Desvanecimiento del toast a los 5 segundos
        setTimeout(() => {
          setActiveToast(prev => {
            if (prev && prev.id === toastId) {
              return null;
            }
            return prev;
          });
        }, 5000);
      }
    }
  }, [workouts, profile]);

  // --- LOCALSTORAGE & SUPABASE INITIALIZATION ---
  useEffect(() => {
    // Proactivamente configuramos tus credenciales de Supabase provistas
    const correctUrl = 'https://qxtgjxmuoxrwqboapbzd.supabase.co';
    const correctKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dGdqeG11b3hyd3Fib2FwYnpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTAyMjYsImV4cCI6MjA5NDc4NjIyNn0.qNHQA2qHFboQkPZTPARXAXOud4r868MYoW9TVimBxqM';

    if (!localStorage.getItem('fitanalytics_supabase_url')) {
      localStorage.setItem('fitanalytics_supabase_url', correctUrl);
    }
    if (!localStorage.getItem('fitanalytics_supabase_key')) {
      localStorage.setItem('fitanalytics_supabase_key', correctKey);
    }

    // 1. Load local workouts (fallback/offline cache)
    const stored = localStorage.getItem('fitanalytics_workouts');
    let initialWorkouts = [];
    if (stored) {
      try {
        initialWorkouts = JSON.parse(stored);
      } catch (e) {
        console.error("Error reading workouts from localstorage", e);
        initialWorkouts = MOCK_WORKOUTS;
        localStorage.setItem('fitanalytics_workouts', JSON.stringify(MOCK_WORKOUTS));
      }
    } else {
      initialWorkouts = MOCK_WORKOUTS;
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(MOCK_WORKOUTS));
    }
    setWorkouts(initialWorkouts);

    // Load local nutrition (fallback/offline cache)
    const storedNutrition = localStorage.getItem('fitanalytics_nutrition');
    let initialNutrition = [];
    if (storedNutrition) {
      try {
        initialNutrition = JSON.parse(storedNutrition);
      } catch (e) {
        console.error("Error reading nutrition from localstorage", e);
      }
    }
    setNutritionLogs(initialNutrition);

    // Get current local profile
    const initialProfile = {
      age: Number(localStorage.getItem('fitanalytics_profile_age') || localStorage.getItem('fitanalytics_age')) || 25,
      weight: Number(localStorage.getItem('fitanalytics_profile_weight')) || 75,
      height: Number(localStorage.getItem('fitanalytics_profile_height')) || 175,
      restingHR: Number(localStorage.getItem('fitanalytics_profile_resting_hr')) || 60,
      gender: localStorage.getItem('fitanalytics_profile_gender') || 'male'
    };
    setProfile(initialProfile);

    // Load local shoes (fallback/offline cache)
    const storedShoes = localStorage.getItem('fitanalytics_shoes');
    let initialShoes = [];
    if (storedShoes) {
      try {
        initialShoes = JSON.parse(storedShoes);
      } catch (e) {
        console.error("Error reading shoes from localstorage", e);
      }
    }
    setShoes(initialShoes);

    // Load local training plans (fallback/offline cache)
    const storedPlans = localStorage.getItem('fitanalytics_training_plans');
    let initialPlans = [];
    if (storedPlans) {
      try {
        initialPlans = JSON.parse(storedPlans);
      } catch (e) {
        console.error("Error reading plans from localstorage", e);
      }
    }
    setPlans(initialPlans);

    // Load local readiness logs (fallback/offline cache)
    const storedReadiness = localStorage.getItem('fitanalytics_readiness_logs');
    let initialReadiness = [];
    if (storedReadiness) {
      try {
        initialReadiness = JSON.parse(storedReadiness);
      } catch (e) {
        console.error("Error reading readiness logs from localstorage", e);
      }
    }
    setReadinessLogs(initialReadiness);

    // 2. Initialize Supabase Auth listeners
    const client = getSupabase();
    if (client) {
      setIsSupabaseConnected(true);

      // Check current session
      client.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user || null);
        if (s) {
          syncWithSupabase(client, initialWorkouts, s.user).then(mergedWorkouts => {
            setWorkouts(mergedWorkouts);
          });
          syncNutritionWithSupabase(client, initialNutrition, s.user).then(mergedNutrition => {
            setNutritionLogs(mergedNutrition);
          });
          syncProfileWithSupabase(client, initialProfile, s.user).then(mergedProfile => {
            setProfile(mergedProfile);
          });
          syncShoesWithSupabase(client, initialShoes, s.user).then(mergedShoes => {
            setShoes(mergedShoes);
          });
          syncPlansWithSupabase(client, initialPlans, s.user).then(mergedPlans => {
            setPlans(mergedPlans);
          });
          syncReadinessWithSupabase(client, initialReadiness, s.user).then(mergedReadiness => {
            setReadinessLogs(mergedReadiness);
          });
        }
      });

      // Listen to auth events
      const { data: { subscription } } = client.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (event === 'SIGNED_IN' && newSession) {
          syncWithSupabase(client, initialWorkouts, newSession.user).then(mergedWorkouts => {
            setWorkouts(mergedWorkouts);
          });
          syncNutritionWithSupabase(client, initialNutrition, newSession.user).then(mergedNutrition => {
            setNutritionLogs(mergedNutrition);
          });
          syncProfileWithSupabase(client, initialProfile, newSession.user).then(mergedProfile => {
            setProfile(mergedProfile);
          });
          syncShoesWithSupabase(client, initialShoes, newSession.user).then(mergedShoes => {
            setShoes(mergedShoes);
          });
          syncPlansWithSupabase(client, initialPlans, newSession.user).then(mergedPlans => {
            setPlans(mergedPlans);
          });
          syncReadinessWithSupabase(client, initialReadiness, newSession.user).then(mergedReadiness => {
            setReadinessLogs(mergedReadiness);
          });
        } else if (event === 'SIGNED_OUT') {
          // Revert back to local database view
          setWorkouts(initialWorkouts);
          setNutritionLogs(initialNutrition);
          setProfile(initialProfile);
          setShoes(initialShoes);
          setPlans(initialPlans);
          setReadinessLogs(initialReadiness);
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  // --- BIDIRECTIONAL SYNC LOGIC ---
  const syncWithSupabase = async (client, localWorkouts, activeUser) => {
    if (!activeUser) return localWorkouts;
    try {
      // Fetch user's remote entries (RLS automatically filters by active user_id)
      const { data: remoteData, error } = await client
        .from('workouts')
        .select('*');

      if (error) throw error;

      const localMap = new Map(localWorkouts.map(w => [w.id, w]));
      const remoteMap = new Map((remoteData || []).map(w => [w.id, w]));

      const merged = [];
      const toUpload = [];

      // Helper to identify default offline mock seed workouts
      const isMockWorkout = (id) => {
        const match = id.match(/^(run|gym)-(\d+)$/);
        if (match) {
          const num = parseInt(match[2], 10);
          return num < 1000;
        }
        return false;
      };

      // 1. Queue local items not present in Supabase for uploading
      for (const local of localWorkouts) {
        const remote = remoteMap.get(local.id);

        // Si es un entrenamiento de prueba (mock) offline y no está registrado en la nube, lo ignoramos por completo
        if (isMockWorkout(local.id) && !remote) {
          continue;
        }

        if (remote && remote.gpx_data && !local.gpxData) {
          local.gpxData = remote.gpx_data;
        }
        if (!remote) {
          toUpload.push({ ...local, user_id: activeUser.id });
        }
        merged.push(local);
      }

      // 2. Download remote items not present in Local Storage
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.id)) {
          merged.push({
            id: remote.id,
            type: remote.type,
            date: remote.date,
            distance: remote.distance ? Number(remote.distance) : 0,
            duration: remote.duration,
            terrain: remote.terrain,
            heartRate: remote.heartRate,
            rpe: remote.rpe,
            notes: remote.notes,
            muscleGroup: remote.muscleGroup,
            sessionName: remote.sessionName,
            exercises: remote.exercises,
            gpxData: remote.gpx_data,
            maxSpeed: remote.advanced_metrics?.maxSpeed || null,
            avgCadence: remote.advanced_metrics?.avgCadence || null,
            maxCadence: remote.advanced_metrics?.maxCadence || null,
            strideLength: remote.advanced_metrics?.strideLength || null,
            elevationGain: remote.advanced_metrics?.elevationGain || null,
            elevationLoss: remote.advanced_metrics?.elevationLoss || null,
            splits: remote.advanced_metrics?.splits || null,
            shoeId: remote.advanced_metrics?.shoeId || null
          });
        }
      }

      // 3. Perform bulk upsert to Supabase
      if (toUpload.length > 0) {
        const { error: uploadError } = await client
          .from('workouts')
          .upsert(toUpload.map(w => ({
            id: w.id,
            type: w.type,
            date: w.date,
            distance: w.distance,
            duration: w.duration,
            terrain: w.terrain,
            heartRate: w.heartRate,
            rpe: w.rpe,
            notes: w.notes,
            muscleGroup: w.muscleGroup,
            sessionName: w.sessionName,
            exercises: w.exercises,
            gpx_data: w.gpxData,
            advanced_metrics: (w.maxSpeed || w.avgCadence || w.strideLength || w.elevationGain || w.splits || w.shoeId || w.advanced_metrics?.shoeId) ? {
              maxSpeed: w.maxSpeed || w.advanced_metrics?.maxSpeed || null,
              avgCadence: w.avgCadence || w.advanced_metrics?.avgCadence || null,
              maxCadence: w.maxCadence || w.advanced_metrics?.maxCadence || null,
              strideLength: w.strideLength || w.advanced_metrics?.strideLength || null,
              elevationGain: w.elevationGain || w.advanced_metrics?.elevationGain || null,
              elevationLoss: w.elevationLoss || w.advanced_metrics?.elevationLoss || null,
              splits: w.splits || w.advanced_metrics?.splits || null,
              shoeId: w.shoeId || w.advanced_metrics?.shoeId || null
            } : null,
            user_id: activeUser.id
          })));

        if (uploadError) console.error("Supabase synchronization insert error:", uploadError);
      }

      // Sort chronological descending
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Save merged to local cache
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(merged));
      setIsSupabaseConnected(true); // Successfully synced!
      return merged;
    } catch (e) {
      console.error("Supabase bi-directional sync failed, running in local-only fallback mode:", e);
      setIsSupabaseConnected(false); // Enable offline indicator if tables/permissions aren't ready
      return localWorkouts;
    }
  };

  const syncNutritionWithSupabase = async (client, localNutrition, activeUser) => {
    if (!activeUser) return localNutrition;
    try {
      const { data: remoteData, error } = await client
        .from('nutrition')
        .select('*');

      if (error) throw error;

      const localMap = new Map(localNutrition.map(n => [n.id, n]));
      const remoteMap = new Map((remoteData || []).map(n => [n.id, n]));

      const merged = [];
      const toUpload = [];

      // 1. Process local logs
      for (const local of localNutrition) {
        const remote = remoteMap.get(local.id);
        if (!remote) {
          toUpload.push(local);
          merged.push(local);
        } else {
          // Merge meals inside the day chronologically/uniquely
          const mealMap = new Map();
          (local.meals || []).forEach(m => mealMap.set(m.id, m));
          (remote.meals || []).forEach(m => mealMap.set(m.id, m));

          const uniqueMeals = Array.from(mealMap.values());
          const mergedLog = {
            ...local,
            meals: uniqueMeals
          };
          merged.push(mergedLog);

          // If local or remote differs from merged, upload
          if ((local.meals || []).length !== uniqueMeals.length || (remote.meals || []).length !== uniqueMeals.length) {
            toUpload.push(mergedLog);
          }
        }
      }

      // 2. Process remote logs that are not in local storage
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.id)) {
          merged.push({
            id: remote.id,
            date: remote.date,
            meals: remote.meals || []
          });
        }
      }

      // 3. Upload to cloud
      if (toUpload.length > 0) {
        const { error: uploadError } = await client
          .from('nutrition')
          .upsert(toUpload.map(log => {
            const meals = log.meals || [];
            const totalCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
            const totalProtein = meals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
            const totalCarbs = meals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
            const totalFat = meals.reduce((sum, m) => sum + (Number(m.fat) || 0), 0);
            return {
              id: log.id,
              user_id: activeUser.id,
              date: log.date,
              calories: totalCalories,
              protein: totalProtein,
              carbs: totalCarbs,
              fat: totalFat,
              meals: meals
            };
          }));

        if (uploadError) throw uploadError;
      }

      // Sort descending chronological
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Save to local cache
      localStorage.setItem('fitanalytics_nutrition', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error("Supabase nutrition bi-directional sync failed:", e);
      return localNutrition;
    }
  };

  const syncProfileWithSupabase = async (client, localProfile, activeUser) => {
    if (!activeUser) return localProfile;
    try {
      const { data: remoteProfile, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', activeUser.id)
        .maybeSingle();

      if (error) throw error;

      if (remoteProfile) {
        // Download and sync locally
        const updated = {
          age: Number(remoteProfile.age) || 25,
          weight: Number(remoteProfile.weight) || 75,
          height: Number(remoteProfile.height) || 175,
          restingHR: Number(remoteProfile.restingHR) || 60,
          gender: remoteProfile.gender || 'male'
        };

        localStorage.setItem('fitanalytics_profile_age', updated.age.toString());
        localStorage.setItem('fitanalytics_age', updated.age.toString());
        localStorage.setItem('fitanalytics_profile_weight', updated.weight.toString());
        localStorage.setItem('fitanalytics_profile_height', updated.height.toString());
        localStorage.setItem('fitanalytics_profile_resting_hr', updated.restingHR.toString());
        localStorage.setItem('fitanalytics_profile_gender', updated.gender);

        return updated;
      } else {
        // Remote doesn't exist, upload local profile
        const { error: insertError } = await client
          .from('profiles')
          .insert({
            user_id: activeUser.id,
            age: Number(localProfile.age),
            weight: Number(localProfile.weight),
            height: Number(localProfile.height),
            "restingHR": Number(localProfile.restingHR),
            gender: localProfile.gender
          });

        if (insertError) throw insertError;
        return localProfile;
      }
    } catch (e) {
      console.error("Supabase profile sync failed:", e);
      return localProfile;
    }
  };

  const syncShoesWithSupabase = async (client, localShoes, activeUser) => {
    if (!activeUser) return localShoes;
    try {
      const { data: remoteData, error } = await client
        .from('shoes')
        .select('*');

      if (error) throw error;

      const localMap = new Map(localShoes.map(s => [s.id, s]));
      const remoteMap = new Map((remoteData || []).map(s => [s.id, s]));

      const merged = [];
      const toUpload = [];

      // 1. Process local shoes
      for (const local of localShoes) {
        const remote = remoteMap.get(local.id);
        if (!remote) {
          toUpload.push({
            id: local.id,
            user_id: activeUser.id,
            brand: local.brand,
            model: local.model,
            initial_km: Number(local.initialKm) || 0,
            max_km: Number(local.maxKm) || 800,
            buy_date: local.buyDate,
            is_active: local.isActive !== false
          });
        }
        merged.push(local);
      }

      // 2. Process remote shoes not in local
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.id)) {
          merged.push({
            id: remote.id,
            brand: remote.brand,
            model: remote.model,
            initialKm: Number(remote.initial_km) || 0,
            maxKm: Number(remote.max_km) || 800,
            buyDate: remote.buy_date,
            isActive: remote.is_active !== false
          });
        }
      }

      // 3. Upload missing to cloud
      if (toUpload.length > 0) {
        const { error: uploadError } = await client
          .from('shoes')
          .upsert(toUpload);

        if (uploadError) throw uploadError;
      }

      localStorage.setItem('fitanalytics_shoes', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error("Supabase shoes bi-directional sync failed:", e);
      return localShoes;
    }
  };

  const syncPlansWithSupabase = async (client, localPlans, activeUser) => {
    if (!activeUser) return localPlans;
    try {
      const { data: remoteData, error } = await client
        .from('training_plans')
        .select('*');

      if (error) throw error;

      const localMap = new Map(localPlans.map(p => [p.date, p]));
      const remoteMap = new Map((remoteData || []).map(p => [p.date, p]));

      const merged = [];
      const toUpload = [];

      // 1. Process local plans
      for (const local of localPlans) {
        const remote = remoteMap.get(local.date);
        if (!remote) {
          toUpload.push({
            date: local.date,
            user_id: activeUser.id,
            distance: Number(local.distance) || 0,
            session_type: local.sessionType || 'Regenerativo',
            note: local.note || ''
          });
        }
        merged.push(local);
      }

      // 2. Process remote plans not in local
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.date)) {
          merged.push({
            date: remote.date,
            distance: Number(remote.distance) || 0,
            sessionType: remote.session_type || 'Regenerativo',
            note: remote.note || ''
          });
        }
      }

      // 3. Upload missing to cloud
      if (toUpload.length > 0) {
        const { error: uploadError } = await client
          .from('training_plans')
          .upsert(toUpload);

        if (uploadError) throw uploadError;
      }

      localStorage.setItem('fitanalytics_training_plans', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error("Supabase training plans bi-directional sync failed:", e);
      return localPlans;
    }
  };

  const syncReadinessWithSupabase = async (client, localReadiness, activeUser) => {
    if (!activeUser) return localReadiness;
    try {
      const { data: remoteData, error } = await client
        .from('readiness_logs')
        .select('*');

      if (error) throw error;

      const localMap = new Map(localReadiness.map(l => [l.date, l]));
      const remoteMap = new Map((remoteData || []).map(l => [l.date, l]));

      const merged = [];
      const toUpload = [];

      // 1. Process local readiness logs
      for (const local of localReadiness) {
        const remote = remoteMap.get(local.date);
        if (!remote) {
          toUpload.push({
            date: local.date,
            user_id: activeUser.id,
            sleep: Number(local.sleep) || 4,
            soreness: Number(local.soreness) || 2,
            resting_hr: Number(local.restingHr) || 60,
            hrv: local.hrv ? Number(local.hrv) : null,
            notes: local.notes || ''
          });
        }
        merged.push(local);
      }

      // 2. Process remote logs not in local
      for (const remote of (remoteData || [])) {
        if (!localMap.has(remote.date)) {
          merged.push({
            date: remote.date,
            sleep: Number(remote.sleep) || 4,
            soreness: Number(remote.soreness) || 2,
            restingHr: Number(remote.resting_hr) || 60,
            hrv: remote.hrv ? Number(remote.hrv) : null,
            notes: remote.notes || ''
          });
        }
      }

      // 3. Upload missing to cloud
      if (toUpload.length > 0) {
        const { error: uploadError } = await client
          .from('readiness_logs')
          .upsert(toUpload);

        if (uploadError) throw uploadError;
      }

      localStorage.setItem('fitanalytics_readiness_logs', JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error("Supabase readiness logs bi-directional sync failed:", e);
      return localReadiness;
    }
  };

  // --- AUTH handlers ---
  const handleLogin = async (email, password) => {
    const client = getSupabase();
    if (!client) return { success: false, message: "Supabase no está inicializado." };
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error("Sign-in failed:", e);
      return { success: false, message: e.message || "Correo o contraseña incorrectos." };
    }
  };

  const handleRegister = async (email, password) => {
    const client = getSupabase();
    if (!client) return { success: false, message: "Supabase no está inicializado." };
    try {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error("Registration failed:", e);
      return { success: false, message: e.message || "Error al registrar usuario." };
    }
  };

  const handleLogout = async () => {
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.error("Sign-out failed:", e);
      }
    }
    setSession(null);
    setUser(null);
  };

  // --- CLOUD ACTION HANDLERS ---
  const handleConnectSupabase = async (url, key) => {
    try {
      const client = initSupabase(url, key);
      if (!client) {
        return { success: false, message: "La inicialización del cliente de Supabase falló." };
      }

      // Test database table existence or schema access
      const { error } = await client.from('workouts').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation "workouts" does not exist')) {
          return {
            success: false,
            message: "La conexión es válida, pero la tabla 'workouts' no existe en tu base de datos Supabase. Ejecuta la consulta SQL provista para crearla."
          };
        }
      }

      // Save credentials locally
      localStorage.setItem('fitanalytics_supabase_url', url);
      localStorage.setItem('fitanalytics_supabase_key', key);
      setIsSupabaseConnected(true);

      // Check for active session immediately
      const { data: { session: s } } = await client.auth.getSession();
      setSession(s);
      setUser(s?.user || null);

      if (s) {
        const merged = await syncWithSupabase(client, workouts, s.user);
        setWorkouts(merged);

        const mergedNutrition = await syncNutritionWithSupabase(client, nutritionLogs, s.user);
        setNutritionLogs(mergedNutrition);

        const mergedProfile = await syncProfileWithSupabase(client, profile, s.user);
        setProfile(mergedProfile);

        const mergedShoes = await syncShoesWithSupabase(client, shoes, s.user);
        setShoes(mergedShoes);

        const mergedPlans = await syncPlansWithSupabase(client, plans, s.user);
        setPlans(mergedPlans);

        const mergedReadiness = await syncReadinessWithSupabase(client, readinessLogs, s.user);
        setReadinessLogs(mergedReadiness);
      }

      return { success: true };
    } catch (e) {
      console.error("Failed to connect to Supabase database:", e);
      return { success: false, message: e.message || "Error de red al establecer comunicación con Supabase." };
    }
  };

  const handleDisconnectSupabase = () => {
    localStorage.removeItem('fitanalytics_supabase_url');
    localStorage.removeItem('fitanalytics_supabase_key');
    setIsSupabaseConnected(false);
    setSession(null);
    setUser(null);
    clearSupabase();
  };

  // --- ACTIONS ---
  const handleSaveWorkout = async (newWorkout) => {
    const updated = [newWorkout, ...workouts];
    setWorkouts(updated);
    localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));
    setIsAddWorkoutOpen(false);
    setAddWorkoutPreset(null);

    // Save to cloud if active and authenticated
    const client = getSupabase();
    if (client && user) {
      try {
        const payload = {
          id: newWorkout.id,
          type: newWorkout.type,
          date: newWorkout.date,
          distance: newWorkout.distance,
          duration: newWorkout.duration,
          terrain: newWorkout.terrain,
          heartRate: newWorkout.heartRate,
          rpe: newWorkout.rpe,
          notes: newWorkout.notes,
          muscleGroup: newWorkout.muscleGroup,
          sessionName: newWorkout.sessionName,
          exercises: newWorkout.exercises,
          gpx_data: newWorkout.gpxData,
          advanced_metrics: (newWorkout.maxSpeed || newWorkout.avgCadence || newWorkout.strideLength || newWorkout.elevationGain || newWorkout.splits || newWorkout.shoeId || newWorkout.advanced_metrics?.shoeId) ? {
            maxSpeed: newWorkout.maxSpeed || newWorkout.advanced_metrics?.maxSpeed || null,
            avgCadence: newWorkout.avgCadence || newWorkout.advanced_metrics?.avgCadence || null,
            maxCadence: newWorkout.maxCadence || newWorkout.advanced_metrics?.maxCadence || null,
            strideLength: newWorkout.strideLength || newWorkout.advanced_metrics?.strideLength || null,
            elevationGain: newWorkout.elevationGain || newWorkout.advanced_metrics?.elevationGain || null,
            elevationLoss: newWorkout.elevationLoss || newWorkout.advanced_metrics?.elevationLoss || null,
            splits: newWorkout.splits || newWorkout.advanced_metrics?.splits || null,
            shoeId: newWorkout.shoeId || newWorkout.advanced_metrics?.shoeId || null
          } : null,
          user_id: user.id
        };
        const { error } = await client.from('workouts').insert(payload);
        if (error) throw error;
      } catch (e) {
        console.error("Supabase insertion error. Item cached locally:", e);
      }
    }
  };

  const handleDeleteWorkout = async (id) => {
    const updated = workouts.filter(w => w.id !== id);
    setWorkouts(updated);
    localStorage.setItem('fitanalytics_workouts', JSON.stringify(updated));

    // Delete from cloud if active and authenticated
    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client.from('workouts').delete().eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error("Supabase deletion error:", e);
      }
    }
  };

  const handleUpdateWorkout = async (updatedWorkout) => {
    const updatedWorkouts = workouts.map(w => w.id === updatedWorkout.id ? updatedWorkout : w);
    setWorkouts(updatedWorkouts);
    localStorage.setItem('fitanalytics_workouts', JSON.stringify(updatedWorkouts));

    // Save to cloud if active and authenticated
    const client = getSupabase();
    if (client && user) {
      try {
        const payload = {
          id: updatedWorkout.id,
          type: updatedWorkout.type,
          date: updatedWorkout.date,
          distance: updatedWorkout.distance,
          duration: updatedWorkout.duration,
          terrain: updatedWorkout.terrain,
          heartRate: updatedWorkout.heartRate,
          rpe: updatedWorkout.rpe,
          notes: updatedWorkout.notes,
          muscleGroup: updatedWorkout.muscleGroup,
          sessionName: updatedWorkout.sessionName,
          exercises: updatedWorkout.exercises,
          gpx_data: updatedWorkout.gpxData,
          advanced_metrics: (updatedWorkout.maxSpeed || updatedWorkout.avgCadence || updatedWorkout.strideLength || updatedWorkout.elevationGain || updatedWorkout.splits || updatedWorkout.shoeId || updatedWorkout.advanced_metrics?.shoeId) ? {
            maxSpeed: updatedWorkout.maxSpeed || updatedWorkout.advanced_metrics?.maxSpeed || null,
            avgCadence: updatedWorkout.avgCadence || updatedWorkout.advanced_metrics?.avgCadence || null,
            maxCadence: updatedWorkout.maxCadence || updatedWorkout.advanced_metrics?.maxCadence || null,
            strideLength: updatedWorkout.strideLength || updatedWorkout.advanced_metrics?.strideLength || null,
            elevationGain: updatedWorkout.elevationGain || updatedWorkout.advanced_metrics?.elevationGain || null,
            elevationLoss: updatedWorkout.elevationLoss || updatedWorkout.advanced_metrics?.elevationLoss || null,
            splits: updatedWorkout.splits || updatedWorkout.advanced_metrics?.splits || null,
            shoeId: updatedWorkout.shoeId || updatedWorkout.advanced_metrics?.shoeId || null
          } : null,
          user_id: user.id
        };
        const { error } = await client.from('workouts').upsert(payload);
        if (error) throw error;
      } catch (e) {
        console.error("Supabase single update error:", e);
      }
    }
  };

  const handleUpdateNutrition = async (updatedLogs) => {
    setNutritionLogs(updatedLogs);
    localStorage.setItem('fitanalytics_nutrition', JSON.stringify(updatedLogs));

    const client = getSupabase();
    if (client && user) {
      try {
        if (updatedLogs.length > 0) {
          const { error } = await client
            .from('nutrition')
            .upsert(updatedLogs.map(log => {
              const meals = log.meals || [];
              const totalCalories = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
              const totalProtein = meals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
              const totalCarbs = meals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
              const totalFat = meals.reduce((sum, m) => sum + (Number(m.fat) || 0), 0);
              return {
                id: log.id,
                user_id: user.id,
                date: log.date,
                calories: totalCalories,
                protein: totalProtein,
                carbs: totalCarbs,
                fat: totalFat,
                meals: meals
              };
            }));
          if (error) throw error;
        } else {
          const { error } = await client
            .from('nutrition')
            .delete()
            .eq('user_id', user.id);
          if (error) throw error;
        }
      } catch (e) {
        console.error("Supabase nutrition update error:", e);
      }
    }
  };

  const handleUpdateShoes = async (updatedShoes) => {
    setShoes(updatedShoes);
    localStorage.setItem('fitanalytics_shoes', JSON.stringify(updatedShoes));

    const client = getSupabase();
    if (client && user) {
      try {
        const updatedIds = new Set(updatedShoes.map(s => s.id));
        const deletedShoes = shoes.filter(s => !updatedIds.has(s.id));

        for (const del of deletedShoes) {
          await client.from('shoes').delete().eq('id', del.id);
        }

        if (updatedShoes.length > 0) {
          const { error } = await client
            .from('shoes')
            .upsert(updatedShoes.map(s => ({
              id: s.id,
              user_id: user.id,
              brand: s.brand,
              model: s.model,
              initial_km: Number(s.initialKm) || 0,
              max_km: Number(s.maxKm) || 800,
              buy_date: s.buyDate,
              is_active: s.isActive !== false
            })));
          if (error) throw error;
        }
      } catch (e) {
        console.error("Supabase shoes update error:", e);
      }
    }
  };

  const handleUpdatePlans = async (updatedPlans) => {
    setPlans(updatedPlans);
    localStorage.setItem('fitanalytics_training_plans', JSON.stringify(updatedPlans));

    const client = getSupabase();
    if (client && user) {
      try {
        const updatedDates = new Set(updatedPlans.map(p => p.date));
        const deletedPlans = plans.filter(p => !updatedDates.has(p.date));

        for (const del of deletedPlans) {
          await client.from('training_plans').delete().eq('date', del.date);
        }

        if (updatedPlans.length > 0) {
          const { error } = await client
            .from('training_plans')
            .upsert(updatedPlans.map(p => ({
              date: p.date,
              user_id: user.id,
              distance: Number(p.distance) || 0,
              session_type: p.sessionType || 'Regenerativo',
              note: p.note || ''
            })));
          if (error) throw error;
        }
      } catch (e) {
        console.error("Supabase plans update error:", e);
      }
    }
  };

  const handleUpdateReadinessLogs = async (updatedReadiness) => {
    setReadinessLogs(updatedReadiness);
    localStorage.setItem('fitanalytics_readiness_logs', JSON.stringify(updatedReadiness));

    const client = getSupabase();
    if (client && user) {
      try {
        const updatedDates = new Set(updatedReadiness.map(l => l.date));
        const deletedLogs = readinessLogs.filter(l => !updatedDates.has(l.date));

        for (const del of deletedLogs) {
          await client.from('readiness_logs').delete().eq('date', del.date);
        }

        if (updatedReadiness.length > 0) {
          const { error } = await client
            .from('readiness_logs')
            .upsert(updatedReadiness.map(l => ({
              date: l.date,
              user_id: user.id,
              sleep: Number(l.sleep) || 4,
              soreness: Number(l.soreness) || 2,
              resting_hr: Number(l.restingHr) || 60,
              hrv: l.hrv ? Number(l.hrv) : null,
              notes: l.notes || ''
            })));
          if (error) throw error;
        }
      } catch (e) {
        console.error("Supabase readiness logs update error:", e);
      }
    }
  };

  const handleProfileChange = async (newProfile) => {
    setProfile(newProfile);
    localStorage.setItem('fitanalytics_profile_age', newProfile.age.toString());
    localStorage.setItem('fitanalytics_age', newProfile.age.toString());
    localStorage.setItem('fitanalytics_profile_weight', newProfile.weight.toString());
    localStorage.setItem('fitanalytics_profile_height', newProfile.height.toString());
    localStorage.setItem('fitanalytics_profile_resting_hr', newProfile.restingHR.toString());
    localStorage.setItem('fitanalytics_profile_gender', newProfile.gender);

    const client = getSupabase();
    if (client && user) {
      try {
        const { error } = await client
          .from('profiles')
          .upsert({
            user_id: user.id,
            age: Number(newProfile.age),
            weight: Number(newProfile.weight),
            height: Number(newProfile.height),
            "restingHR": Number(newProfile.restingHR),
            gender: newProfile.gender,
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
      } catch (e) {
        console.error("Supabase profile upsert error:", e);
      }
    }
  };

  const handleUpdateAllWorkouts = async (allWorkouts) => {
    setWorkouts(allWorkouts);
    localStorage.setItem('fitanalytics_workouts', JSON.stringify(allWorkouts));

    // Mass sync to cloud if active and authenticated
    const client = getSupabase();
    if (client && user) {
      try {
        if (allWorkouts.length === 0) {
          // Complete remote wipe
          const { error } = await client
            .from('workouts')
            .delete()
            .neq('id', 'dummy_value_to_trigger_all');
          if (error) throw error;
        } else {
          // Clean backup restoration: clear remote and insert restored values to avoid orphans
          const { error: delError } = await client
            .from('workouts')
            .delete()
            .neq('id', 'dummy_value_to_trigger_all');
          if (delError) throw delError;

          const { error: insError } = await client
            .from('workouts')
            .insert(allWorkouts.map(w => ({
              id: w.id,
              type: w.type,
              date: w.date,
              distance: w.distance,
              duration: w.duration,
              terrain: w.terrain,
              heartRate: w.heartRate,
              rpe: w.rpe,
              notes: w.notes,
              muscleGroup: w.muscleGroup,
              sessionName: w.sessionName,
              exercises: w.exercises,
              gpx_data: w.gpxData,
              advanced_metrics: (w.maxSpeed || w.avgCadence || w.strideLength || w.elevationGain || w.splits || w.shoeId || w.advanced_metrics?.shoeId) ? {
                maxSpeed: w.maxSpeed || w.advanced_metrics?.maxSpeed || null,
                avgCadence: w.avgCadence || w.advanced_metrics?.avgCadence || null,
                maxCadence: w.maxCadence || w.advanced_metrics?.maxCadence || null,
                strideLength: w.strideLength || w.advanced_metrics?.strideLength || null,
                elevationGain: w.elevationGain || w.advanced_metrics?.elevationGain || null,
                elevationLoss: w.elevationLoss || w.advanced_metrics?.elevationLoss || null,
                splits: w.splits || w.advanced_metrics?.splits || null,
                shoeId: w.shoeId || w.advanced_metrics?.shoeId || null
              } : null,
              user_id: user.id
            })));
          if (insError) throw insError;
        }
      } catch (e) {
        console.error("Supabase bulk update error:", e);
      }
    }
  };

  const handleResetMockData = async () => {
    if (confirm("¿Estás seguro de que deseas restablecer los datos de demostración? Esto borrará tus entrenamientos actuales.")) {
      localStorage.setItem('fitanalytics_workouts', JSON.stringify(MOCK_WORKOUTS));
      setWorkouts(MOCK_WORKOUTS);

      const client = getSupabase();
      if (client && user) {
        try {
          // Reset cloud database
          const { error: delError } = await client.from('workouts').delete().neq('id', 'dummy_value_to_trigger_all');
          if (delError) throw delError;

          // Re-insert seeds with user_id
          const { error: insError } = await client.from('workouts').insert(
            MOCK_WORKOUTS.map(w => ({
              id: w.id,
              type: w.type,
              date: w.date,
              distance: w.distance,
              duration: w.duration,
              terrain: w.terrain,
              heartRate: w.heartRate,
              rpe: w.rpe,
              notes: w.notes,
              muscleGroup: w.muscleGroup,
              sessionName: w.sessionName,
              exercises: w.exercises,
              gpx_data: w.gpxData || null,
              user_id: user.id
            }))
          );
          if (insError) throw insError;

          alert("¡Datos de demostración cargados localmente y sincronizados en Supabase!");
        } catch (e) {
          console.error("Supabase mock re-seed failed:", e);
          alert("Datos cargados localmente en el navegador, pero falló la sincronización con la base de datos remota: " + e.message);
        }
      } else {
        alert("¡Datos de demostración cargados exitosamente!");
      }
    }
  };

  // --- RENDERING TABS ---
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
            onDeleteWorkout={handleDeleteWorkout} 
            onUpdateWorkout={handleUpdateWorkout}
            onUpdateAllWorkouts={handleUpdateAllWorkouts}
          />
        );
      case 'analytics':
        return <AnalyticsView workouts={workouts} theme={theme} />;
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

  // Render AuthScreen if cloud sync is connected but user is not logged in
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
          {/* Cloud status */}
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
      />

      {/* Main page content area */}
      <main className="main-content">
        {renderTabContent()}
      </main>

      {/* Pop-up slideover form for adding workouts */}
      {isAddWorkoutOpen && (
        <AddWorkoutForm 
          onSaveWorkout={handleSaveWorkout} 
          onClose={() => {
            setIsAddWorkoutOpen(false);
            setAddWorkoutPreset(null);
          }} 
          preset={addWorkoutPreset}
          workouts={workouts}
          shoes={shoes}
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
          <style>{`
            .achievement-toast-container {
              position: fixed;
              bottom: 2rem;
              right: 2rem;
              z-index: 10005;
              display: flex;
              align-items: center;
              gap: 1.15rem;
              background: var(--bg-surface);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(var(--toast-rgb), 0.35);
              padding: 1.2rem 1.6rem;
              border-radius: 16px;
              box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 20px rgba(var(--toast-rgb), 0.2);
              max-width: 380px;
              cursor: pointer;
              animation: toast-slide-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .achievement-toast-container:hover {
              transform: translateY(-2px) scale(1.02);
              box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5), 0 0 30px rgba(var(--toast-rgb), 0.35);
            }

            .theme-running {
              --toast-color: var(--color-running);
              --toast-rgb: 16, 185, 129;
            }

            .theme-gym {
              --toast-color: var(--color-gym);
              --toast-rgb: 236, 72, 153;
            }

            .theme-primary {
              --toast-color: var(--color-primary);
              --toast-rgb: 139, 92, 246;
            }

            .toast-glow {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              border-radius: 16px;
              background: radial-gradient(circle at 10% 20%, rgba(var(--toast-rgb), 0.08) 0%, transparent 60%);
              pointer-events: none;
            }

            .toast-icon-wrapper {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 44px;
              height: 44px;
              border-radius: 12px;
              background: rgba(var(--toast-rgb), 0.15);
              border: 1px solid rgba(var(--toast-rgb), 0.3);
              color: var(--toast-color);
              flex-shrink: 0;
            }

            .toast-medal-icon {
              filter: drop-shadow(0 0 4px var(--toast-color));
            }

            .toast-text-content {
              display: flex;
              flex-direction: column;
              gap: 0.15rem;
              min-width: 0;
            }

            .toast-alert-title {
              font-size: 0.72rem;
              font-weight: 800;
              letter-spacing: 0.08em;
              color: var(--toast-color);
              text-transform: uppercase;
            }

            .toast-medal-title {
              font-size: 1.15rem;
              font-weight: 800;
              color: var(--text-primary);
              letter-spacing: -0.02em;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .toast-medal-subtitle {
              font-size: 0.8rem;
              color: var(--text-secondary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            @keyframes toast-slide-in {
              from {
                transform: translateY(80px) scale(0.9);
                opacity: 0;
              }
              to {
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }

            @media (max-width: 768px) {
              .achievement-toast-container {
                bottom: 1.5rem;
                right: 1.5rem;
                left: 1.5rem;
                max-width: none;
              }
            }
          `}</style>
        </div>
      )}
    </div>
    {isReportOpen && (
      <ReportModal 
        workouts={workouts}
        profile={profile}
        onClose={() => setIsReportOpen(false)}
      />
    )}
    </>
  );
}

