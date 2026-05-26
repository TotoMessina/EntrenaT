import React, { useState, useRef } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { timeStringToSeconds, secondsToTimeString, calculate1RM } from '../utils/calculators';
import { TrendingUp, Dumbbell, PieChart, BarChart2, Trophy, Award, Crown, Zap, ChevronRight, Flame, ShieldCheck, Lock, Activity, Calendar, Timer, Sparkles } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Start of week helper
const getStartOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export default function AnalyticsView({ workouts, theme, profile }) {
  const runningWorkouts = workouts
    .filter(w => w.type === 'running')
    .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
    
  const gymWorkouts = workouts
    .filter(w => w.type === 'gym')
    .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));

  // --- CONFIGURING THEME-RESPONSIVE COLORS ---
  const isLight = theme === 'light';
  const gridColor = isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.05)';
  const textColor = isLight ? '#475569' : '#9ca3af'; // Slate 600 or Gray 400
  const legendColor = isLight ? '#1e293b' : '#e5e7eb'; // Slate 800 or Gray 200
  const doughnutBorderColor = isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.1)';

  // --- RUNNING VOLUME HISTORICAL COMPARATOR STATES & COMPUTATIONS ---
  const [volumeTimeframe, setVolumeTimeframe] = useState('semana'); // 'semana', 'mes', 'año'
  const [volumeBenchmark, setVolumeBenchmark] = useState('personal-goal'); // 'prev-period', 'personal-goal', 'amateur', 'boston', 'elite'
  
  // --- RUNNING PERIOD TO PERIOD DAY-BY-DAY COMPARATOR STATES & COMPUTATIONS ---
  const [compTimeframe, setCompTimeframe] = useState('semana'); // 'semana', 'mes'
  const [selectedPeriodA, setSelectedPeriodA] = useState('');
  const [selectedPeriodB, setSelectedPeriodB] = useState('');

  // --- VO2MAX ESTIMATOR COMPUTATIONS (DERIVED FROM PROFILE & AGE) ---
  const userAge = profile?.age || Number(localStorage.getItem('fitanalytics_age')) || 25;
  const hrMax = Math.round(208 - 0.7 * userAge);
  const hrRest = profile?.restingHR || Number(localStorage.getItem('fitanalytics_hr_rest')) || 60;

  // Generate lists of available periods dynamically (scans user workouts for active periods)
  const getAvailableWeeks = () => {
    const uniqueWeeks = new Set();
    
    // Scan runningWorkouts and get unique start of week strings
    runningWorkouts.forEach(w => {
      if (w.date) {
        const wStart = getStartOfWeek(new Date(w.date + 'T00:00:00'));
        uniqueWeeks.add(wStart);
      }
    });

    // Also ensure the current week is included in the list so there's always an active option
    const currentWeekStart = getStartOfWeek(new Date());
    uniqueWeeks.add(currentWeekStart);

    // Convert Set to array and sort from newest to oldest
    const sortedWeeks = Array.from(uniqueWeeks).sort((a, b) => new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00'));

    // Map to the formatted list
    return sortedWeeks.map(startStr => {
      const start = new Date(startStr + 'T00:00:00');
      const end = new Date(startStr + 'T00:00:00');
      end.setDate(start.getDate() + 6);
      return {
        value: startStr,
        label: `Semana: ${start.getDate()}/${start.getMonth() + 1} al ${end.getDate()}/${end.getMonth() + 1}`
      };
    });
  };

  const getAvailableMonths = () => {
    const uniqueMonths = new Set();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Scan runningWorkouts and get unique YYYY-MM strings
    runningWorkouts.forEach(w => {
      if (w.date) {
        const parts = w.date.split('-');
        if (parts.length >= 2) {
          uniqueMonths.add(`${parts[0]}-${parts[1]}`); // e.g. "2026-05"
        }
      }
    });

    // Also ensure current month is included
    const today = new Date();
    const currentMonthVal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    uniqueMonths.add(currentMonthVal);

    // Convert Set to array and sort from newest to oldest
    const sortedMonths = Array.from(uniqueMonths).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      return new Date(yearB, monthB - 1, 1) - new Date(yearA, monthA - 1, 1);
    });

    // Map to formatted list
    return sortedMonths.map(monthStr => {
      const parts = monthStr.split('-');
      const year = parseInt(parts[0]);
      const mIndex = parseInt(parts[1]) - 1;
      return {
        year,
        month: mIndex,
        value: monthStr,
        label: `${monthNames[mIndex]} ${year}`
      };
    });
  };

  const availableWeeks = getAvailableWeeks();
  const availableMonths = getAvailableMonths();

  // Handle initialization and changes of timeframe
  const handleCompTimeframeChange = (val) => {
    setCompTimeframe(val);
    if (val === 'semana' && availableWeeks.length > 0) {
      setSelectedPeriodA(availableWeeks[0].value);
      setSelectedPeriodB(availableWeeks[1]?.value || availableWeeks[0].value);
    } else if (val === 'mes' && availableMonths.length > 0) {
      setSelectedPeriodA(availableMonths[0].value);
      setSelectedPeriodB(availableMonths[1]?.value || availableMonths[0].value);
    }
  };

  // Auto initialize selectedPeriodA & B once lists are computed
  React.useEffect(() => {
    if (!selectedPeriodA || !selectedPeriodB) {
      if (compTimeframe === 'semana' && availableWeeks.length > 0) {
        if (!selectedPeriodA) setSelectedPeriodA(availableWeeks[0].value);
        if (!selectedPeriodB) setSelectedPeriodB(availableWeeks[1]?.value || availableWeeks[0].value);
      } else if (compTimeframe === 'mes' && availableMonths.length > 0) {
        if (!selectedPeriodA) setSelectedPeriodA(availableMonths[0].value);
        if (!selectedPeriodB) setSelectedPeriodB(availableMonths[1]?.value || availableMonths[0].value);
      }
    }
  }, [compTimeframe, availableWeeks, availableMonths]);

  // Compute Monday-first index
  const getMondayFirstIndex = (d) => {
    const day = d.getDay();
    return day === 0 ? 6 : day - 1;
  };

  // Get previous week start date string
  const getPrevWeekStart = (weekStartStr) => {
    const d = new Date(weekStartStr + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };

  // Get previous month string
  const getPrevMonthValue = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const weekStartA = compTimeframe === 'semana' ? (selectedPeriodA || (availableWeeks[0]?.value || '')) : '';
  const weekStartB = compTimeframe === 'semana' ? (selectedPeriodB || (availableWeeks[1]?.value || availableWeeks[0]?.value || '')) : '';

  const monthStartA = compTimeframe === 'mes' ? (selectedPeriodA || (availableMonths[0]?.value || '')) : '';
  const monthStartB = compTimeframe === 'mes' ? (selectedPeriodB || (availableMonths[1]?.value || availableMonths[0]?.value || '')) : '';

  // Helper to compute stats for a specific running period A or B
  const computePeriodStats = (startStr) => {
    let totalDist = 0;
    let totalDurationSecs = 0;
    let activitiesCount = 0;

    if (!startStr) {
      return { totalDist, avgPaceStr: '--:--', totalDurationStr: '0m', avgSpeed: 0, activitiesCount };
    }

    let start, end;
    let isMonth = compTimeframe === 'mes';

    if (!isMonth) {
      start = new Date(startStr + 'T00:00:00');
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else {
      const parts = startStr.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0); // last day of the month
    }

    runningWorkouts.forEach(w => {
      const wDate = new Date(w.date + 'T00:00:00');
      if (wDate >= start && wDate <= end) {
        totalDist += Number(w.distance) || 0;
        totalDurationSecs += timeStringToSeconds(w.duration) || 0;
        activitiesCount += 1;
      }
    });

    // Compute average pace (minutes per km)
    let avgPaceStr = '--:--';
    if (totalDist > 0 && totalDurationSecs > 0) {
      const avgPaceSecs = totalDurationSecs / totalDist;
      const mins = Math.floor(avgPaceSecs / 60);
      const secs = Math.round(avgPaceSecs % 60);
      avgPaceStr = `${mins}:${String(secs).padStart(2, '0')}`;
    }

    // Compute total duration string (e.g. "3h 45m" or "45m")
    let totalDurationStr = '0m';
    if (totalDurationSecs > 0) {
      const hrs = Math.floor(totalDurationSecs / 3600);
      const mins = Math.floor((totalDurationSecs % 3600) / 60);
      if (hrs > 0) {
        totalDurationStr = `${hrs}h ${mins}m`;
      } else {
        totalDurationStr = `${mins}m`;
      }
    }

    // Compute average speed (km/h)
    let avgSpeed = 0;
    if (totalDurationSecs > 0) {
      avgSpeed = (totalDist / (totalDurationSecs / 3600));
    }

    return {
      totalDist: Math.round(totalDist * 10) / 10,
      avgPaceStr,
      totalDurationStr,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      activitiesCount
    };
  };

  const statsA = computePeriodStats(compTimeframe === 'semana' ? weekStartA : monthStartA);
  const statsB = computePeriodStats(compTimeframe === 'semana' ? weekStartB : monthStartB);

  // --- VO2MAX HISTORICAL ESTIMATOR AGGREGATIONS ---
  const getVO2MaxData = () => {
    const months = [];
    const today = new Date();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        vo2Sum: 0,
        count: 0
      });
    }

    runningWorkouts.forEach(w => {
      const wDate = new Date(w.date + 'T00:00:00');
      const match = months.find(m => m.year === wDate.getFullYear() && m.month === wDate.getMonth());
      if (match) {
        const durationMins = timeStringToSeconds(w.duration) / 60;
        const dist = Number(w.distance) || 0;
        
        // VO2Max Active calculation (only for running workouts of at least 10 minutes)
        if (durationMins >= 10 && dist > 0) {
          const speedMeterPerMin = (dist * 1000) / durationMins;
          const acsmVO2 = 3.5 + 0.2 * speedMeterPerMin;
          
          let workoutVO2 = acsmVO2;
          
          // If workout has Heart Rate, apply cardiac efficiency scaling
          const wAvgHR = Number(w.heartRate || w.avgHr || w.hr || 0);
          if (wAvgHR > 0 && hrMax > 0) {
            // Scale based on HR intensity
            workoutVO2 = acsmVO2 * (hrMax / wAvgHR);
          }
          
          match.vo2Sum += workoutVO2;
          match.count += 1;
        }
      }
    });

    return months.map(m => {
      return {
        label: m.label,
        vo2: m.count > 0 ? Math.round((m.vo2Sum / m.count) * 10) / 10 : 0
      };
    });
  };

  const vo2MonthlyData = getVO2MaxData();
  const vo2Labels = vo2MonthlyData.map(d => d.label);
  const vo2Values = vo2MonthlyData.map(d => d.vo2);

  const uthVO2Max = hrRest > 0 ? Math.round((15.3 * (hrMax / hrRest)) * 10) / 10 : 0;

  const currentVO2Max = (() => {
    for (let i = vo2MonthlyData.length - 1; i >= 0; i--) {
      if (vo2MonthlyData[i].vo2 > 0) return vo2MonthlyData[i].vo2;
    }
    return uthVO2Max;
  })();

  const getVO2MaxCategory = (val) => {
    if (val >= 52) return { text: 'Élite 👑', color: '#a855f7', desc: 'Capacidad aeróbica excepcional de atleta profesional.' };
    if (val >= 44) return { text: 'Excelente ⚡', color: '#10b981', desc: 'Excelente condición cardiovascular. Muy por encima de la media.' };
    if (val >= 35) return { text: 'Aceptable 🏃', color: '#f59e0b', desc: 'Condición física moderada. Buen trabajo aeróbico base.' };
    return { text: 'Pobre ⚠️', color: '#ef4444', desc: 'Rendimiento aeróbico bajo. Se recomienda aumentar el volumen en Zona 2.' };
  };
  const vo2Category = getVO2MaxCategory(currentVO2Max);

  const vo2ChartData = {
    labels: vo2Labels,
    datasets: [
      {
        label: 'VO2Max Activo (Carrera)',
        data: vo2Values.map(v => v === 0 ? null : v),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#ec4899',
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
        spanGaps: true
      },
      {
        label: 'Potencial Fisiológico (Uth Formula)',
        data: Array(vo2Labels.length).fill(uthVO2Max),
        borderColor: '#a855f7',
        borderWidth: 2,
        borderDash: [6, 6],
        pointRadius: 0,
        fill: false
      }
    ]
  };

  const vo2ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: legendColor,
          font: { family: 'Outfit', size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.raw} mL/kg/min`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'VO2Max (mL/kg/min)', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  const getWeeklyDayComparison = () => {
    const distA = Array(7).fill(0);
    const distB = Array(7).fill(0);
    if (!weekStartA) return { distA, distB };
    
    const startA = new Date(weekStartA + 'T00:00:00');
    const endA = new Date(startA);
    endA.setDate(startA.getDate() + 6);
    
    const startB = new Date(weekStartB + 'T00:00:00');
    const endB = new Date(startB);
    endB.setDate(startB.getDate() + 6);

    runningWorkouts.forEach(w => {
      const wDate = new Date(w.date + 'T00:00:00');
      const dist = Number(w.distance) || 0;
      
      if (wDate >= startA && wDate <= endA) {
        const idx = getMondayFirstIndex(wDate);
        distA[idx] += dist;
      } else if (wDate >= startB && wDate <= endB) {
        const idx = getMondayFirstIndex(wDate);
        distB[idx] += dist;
      }
    });

    return { distA: distA.map(v => Math.round(v * 10) / 10), distB: distB.map(v => Math.round(v * 10) / 10) };
  };

  const getMonthlyDayComparison = () => {
    const distA = Array(31).fill(0);
    const distB = Array(31).fill(0);
    if (!monthStartA) return { distA, distB };

    const partsA = monthStartA.split('-');
    const yearA = parseInt(partsA[0]);
    const mIndexA = parseInt(partsA[1]) - 1;

    const partsB = monthStartB.split('-');
    const yearB = parseInt(partsB[0]);
    const mIndexB = parseInt(partsB[1]) - 1;

    runningWorkouts.forEach(w => {
      const wDate = new Date(w.date + 'T00:00:00');
      const dist = Number(w.distance) || 0;
      const day = wDate.getDate();
      
      if (wDate.getFullYear() === yearA && wDate.getMonth() === mIndexA) {
        distA[day - 1] += dist;
      } else if (wDate.getFullYear() === yearB && wDate.getMonth() === mIndexB) {
        distB[day - 1] += dist;
      }
    });

    return { distA: distA.map(v => Math.round(v * 10) / 10), distB: distB.map(v => Math.round(v * 10) / 10) };
  };

  const comparisonData = compTimeframe === 'semana' ? getWeeklyDayComparison() : getMonthlyDayComparison();
  const comparisonLabels = compTimeframe === 'semana'
    ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    : Array.from({ length: 31 }, (_, i) => `Día ${i + 1}`);

  const activeLabelA = compTimeframe === 'semana'
    ? (() => {
        if (!weekStartA) return 'Semana A';
        const start = new Date(weekStartA + 'T00:00:00');
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `Semana A (${start.getDate()}/${start.getMonth()+1} al ${end.getDate()}/${end.getMonth()+1})`;
      })()
    : (() => {
        if (!monthStartA) return 'Mes A';
        const parts = monthStartA.split('-');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `Mes A (${monthNames[parseInt(parts[1]) - 1]} ${parts[0]})`;
      })();

  const activeLabelB = compTimeframe === 'semana'
    ? (() => {
        if (!weekStartB) return 'Semana B';
        const start = new Date(weekStartB + 'T00:00:00');
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `Semana B (${start.getDate()}/${start.getMonth()+1} al ${end.getDate()}/${end.getMonth()+1})`;
      })()
    : (() => {
        if (!monthStartB) return 'Mes B';
        const parts = monthStartB.split('-');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `Mes B (${monthNames[parseInt(parts[1]) - 1]} ${parts[0]})`;
      })();

  const compChartData = {
    labels: comparisonLabels,
    datasets: [
      {
        label: activeLabelA,
        data: comparisonData.distA,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35
      },
      {
        label: activeLabelB,
        data: comparisonData.distB,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderWidth: 2.5,
        borderDash: [5, 5],
        pointBackgroundColor: '#3b82f6',
        pointRadius: 3,
        fill: true,
        tension: 0.35
      }
    ]
  };

  const compChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: legendColor,
          font: { family: 'Outfit', size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` Volumen: ${context.raw} km`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Kilómetros Corridos (km)', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };
  const [weeklyGoal, setWeeklyGoal] = useState(() => Number(localStorage.getItem('fitanalytics_weekly_km_goal') || '40'));
  const [monthlyGoal, setMonthlyGoal] = useState(() => Number(localStorage.getItem('fitanalytics_monthly_km_goal') || '160'));
  const [yearlyGoal, setYearlyGoal] = useState(() => Number(localStorage.getItem('fitanalytics_yearly_km_goal') || '1500'));



  // Grouping periods
  const getVolumeData = () => {
    if (volumeTimeframe === 'semana') {
      const weeks = [];
      const today = new Date();
      for (let i = 7; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - (i * 7));
        const startStr = getStartOfWeek(d);
        weeks.push({
          startStr,
          label: (() => {
            const start = new Date(startStr + 'T00:00:00');
            const end = new Date(startStr + 'T00:00:00');
            end.setDate(start.getDate() + 6);
            return `${start.getDate()}/${start.getMonth() + 1}`;
          })(),
          distance: 0,
          runsCount: 0
        });
      }
      runningWorkouts.forEach(w => {
        const wStart = getStartOfWeek(new Date(w.date + 'T00:00:00'));
        const match = weeks.find(wk => wk.startStr === wStart);
        if (match) {
          match.distance += Number(w.distance) || 0;
          match.runsCount += 1;
        }
      });
      return weeks;
    } else if (volumeTimeframe === 'mes') {
      const months = [];
      const today = new Date();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(today.getMonth() - i);
        months.push({
          year: d.getFullYear(),
          month: d.getMonth(),
          label: `${monthNames[d.getMonth()]}`,
          distance: 0,
          runsCount: 0
        });
      }
      runningWorkouts.forEach(w => {
        const wDate = new Date(w.date + 'T00:00:00');
        const match = months.find(m => m.year === wDate.getFullYear() && m.month === wDate.getMonth());
        if (match) {
          match.distance += Number(w.distance) || 0;
          match.runsCount += 1;
        }
      });
      return months;
    } else {
      const years = [];
      const today = new Date();
      for (let i = 2; i >= 0; i--) {
        const yr = today.getFullYear() - i;
        years.push({
          year: yr,
          label: `${yr}`,
          distance: 0,
          runsCount: 0
        });
      }
      runningWorkouts.forEach(w => {
        const wDate = new Date(w.date + 'T00:00:00');
        const match = years.find(y => y.year === wDate.getFullYear());
        if (match) {
          match.distance += Number(w.distance) || 0;
          match.runsCount += 1;
        }
      });
      return years;
    }
  };

  const volumePeriods = getVolumeData();
  const volumeLabels = volumePeriods.map(p => p.label);
  const volumeValues = volumePeriods.map(p => Math.round(p.distance * 10) / 10);

  // Compute Benchmark target value for each period
  const getBenchmarkValues = () => {
    return volumePeriods.map((p, idx) => {
      if (volumeBenchmark === 'prev-period') {
        if (idx === 0) return 0;
        return Math.round(volumePeriods[idx - 1].distance * 10) / 10;
      }
      if (volumeBenchmark === 'personal-goal') {
        if (volumeTimeframe === 'semana') return weeklyGoal;
        if (volumeTimeframe === 'mes') return monthlyGoal;
        return yearlyGoal;
      }
      // Fixed benchmarks
      if (volumeTimeframe === 'semana') {
        if (volumeBenchmark === 'amateur') return 20;
        if (volumeBenchmark === 'boston') return 60;
        return 100; // elite
      } else if (volumeTimeframe === 'mes') {
        if (volumeBenchmark === 'amateur') return 80;
        if (volumeBenchmark === 'boston') return 250;
        return 400; // elite
      } else {
        if (volumeBenchmark === 'amateur') return 1000;
        if (volumeBenchmark === 'boston') return 3000;
        return 5000; // elite
      }
    });
  };

  const benchmarkValues = getBenchmarkValues();

  // Active period stats
  const activePeriodIndex = volumePeriods.length - 1;
  const activeDistance = activePeriodIndex >= 0 ? volumePeriods[activePeriodIndex].distance : 0;
  const activeRuns = activePeriodIndex >= 0 ? volumePeriods[activePeriodIndex].runsCount : 0;
  const activeBenchmark = activePeriodIndex >= 0 ? benchmarkValues[activePeriodIndex] : 0;
  
  // Percent change vs benchmark
  const activeDiffPercent = activeBenchmark > 0 
    ? Math.round(((activeDistance - activeBenchmark) / activeBenchmark) * 100)
    : 0;

  // Average per day/month
  const activeDailyAverage = volumeTimeframe === 'semana' 
    ? Math.round((activeDistance / 7) * 10) / 10
    : volumeTimeframe === 'mes'
      ? Math.round((activeDistance / 30) * 10) / 10
      : Math.round((activeDistance / 12) * 10) / 10; // per month

  const activePacePerRun = activeRuns > 0
    ? Math.round((activeDistance / activeRuns) * 10) / 10
    : 0;



  const volumeChartData = {
    labels: volumeLabels,
    datasets: [
      {
        type: 'bar',
        label: 'Tu Carga (km)',
        data: volumeValues,
        backgroundColor: 'rgba(16, 185, 129, 0.35)',
        borderColor: '#10b981',
        borderWidth: 2,
        borderRadius: 5,
        order: 2
      },
      {
        type: 'line',
        label: (() => {
          if (volumeBenchmark === 'prev-period') return 'Período Previo';
          if (volumeBenchmark === 'personal-goal') return 'Objetivo Personal';
          if (volumeBenchmark === 'amateur') return 'Benchmark Amateur';
          if (volumeBenchmark === 'boston') return 'Benchmark Boston';
          return 'Benchmark Élite';
        })(),
        data: benchmarkValues,
        borderColor: '#a855f7',
        borderWidth: 2.5,
        borderDash: [5, 5],
        pointBackgroundColor: '#a855f7',
        pointRadius: 3,
        fill: false,
        tension: 0.1,
        order: 1
      }
    ]
  };

  const volumeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: legendColor,
          font: { family: 'Outfit', size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.raw} km`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Distancia Acumulada (km)', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 1. RUNNING PACE CHART DATA ---
  const runningDates = runningWorkouts.map(w => {
    return new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  });

  const runningPacesDecimal = runningWorkouts.map(w => {
    const paceSecs = timeStringToSeconds(w.duration) / Number(w.distance);
    return Math.round((paceSecs / 60) * 100) / 100; // minutes as decimal (e.g. 5.5 = 5:30)
  });

  const runningChartData = {
    labels: runningDates,
    datasets: [
      {
        label: 'Ritmo Medio (min/km)',
        data: runningPacesDecimal,
        borderColor: '#10b981',
        backgroundColor: isLight ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      }
    ]
  };

  const runningChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const decimalMins = context.raw;
            const mins = Math.floor(decimalMins);
            const secs = Math.round((decimalMins - mins) * 60);
            return ` Ritmo: ${mins}:${String(secs).padStart(2, '0')} min/km`;
          }
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (value) => {
            const mins = Math.floor(value);
            const secs = Math.round((value - mins) * 60);
            return `${mins}:${String(secs).padStart(2, '0')}`;
          }
        },
        title: { display: true, text: 'Minutos / km', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 2. GYM SESSION VOLUME CHART DATA ---
  const gymDates = gymWorkouts.map(w => {
    return new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  });

  const gymVolumes = gymWorkouts.map(w => {
    return w.exercises?.reduce((sum, ex) => {
      if (Array.isArray(ex.sets)) {
        return sum + ex.sets.reduce((exSum, s) => {
          if (s.done !== false) {
            const weightVal = parseFloat(s.weight) || 0;
            const repsVal = parseFloat(s.reps) || 0;
            return exSum + (weightVal * repsVal);
          }
          return exSum;
        }, 0);
      } else {
        const setsVal = Number(ex.sets) || 0;
        const repsVal = Number(ex.reps) || 0;
        const weightVal = Number(ex.weight) || 0;
        return sum + (setsVal * repsVal * weightVal);
      }
    }, 0) || 0;
  });

  const gymVolumeData = {
    labels: gymDates,
    datasets: [
      {
        label: 'Volumen Levantado (kg)',
        data: gymVolumes,
        backgroundColor: isLight ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.3)',
        borderColor: '#ec4899',
        borderWidth: 2,
        borderRadius: 6,
      }
    ]
  };

  const gymVolumeOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Volumen: ${context.raw.toLocaleString('es-ES')} kg`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Carga Acumulada (kg)', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 3. MUSCLE GROUP SETS DOUGHNUT CHART ---
  const computeMuscleGroupDistribution = () => {
    const counts = {
      Pectoral: 0,
      Espalda: 0,
      Hombros: 0,
      Bíceps: 0,
      Tríceps: 0,
      Antebrazo: 0,
      Core: 0,
      Cuádriceps: 0,
      Isquiotibiales: 0,
      Gemelos: 0,
      Glúteos: 0,
      Cuello: 0,
      // Legacy groups for backwards compatibility
      Pierna: 0,
      Brazos: 0,
      'Full Body': 0
    };

    workouts.forEach(w => {
      if (w.type === 'gym') {
        const totalSets = w.exercises?.reduce((sum, ex) => {
          if (Array.isArray(ex.sets)) {
            return sum + ex.sets.length;
          }
          return sum + (Number(ex.sets) || 0);
        }, 0) || 0;

        if (w.trainedMuscles && w.trainedMuscles.length > 0) {
          w.trainedMuscles.forEach(m => {
            if (counts[m] !== undefined) {
              counts[m] += totalSets;
            } else {
              counts[m] = totalSets;
            }
          });
        } else {
          const group = w.muscleGroup || 'Full Body';
          if (counts[group] !== undefined) {
            counts[group] += totalSets;
          } else {
            counts[group] = totalSets;
          }
        }
      }
    });

    return counts;
  };

  const muscleCounts = computeMuscleGroupDistribution();
  const muscleLabels = Object.keys(muscleCounts).filter(k => muscleCounts[k] > 0);
  const muscleValues = muscleLabels.map(k => muscleCounts[k]);

  const muscleColorsMap = {
    Pectoral: 'rgba(244, 63, 94, 0.7)',        // Rose/Neon Red-Pink
    Espalda: 'rgba(59, 130, 246, 0.7)',         // Blue
    Hombros: 'rgba(245, 158, 11, 0.7)',         // Orange
    Bíceps: 'rgba(168, 85, 247, 0.7)',          // Purple
    Tríceps: 'rgba(236, 72, 153, 0.7)',         // Pink
    Antebrazo: 'rgba(139, 92, 246, 0.7)',        // Violet
    Core: 'rgba(239, 68, 68, 0.7)',             // Red
    Cuádriceps: 'rgba(16, 185, 129, 0.7)',      // Emerald Green
    Isquiotibiales: 'rgba(20, 184, 166, 0.7)',  // Teal
    Gemelos: 'rgba(45, 212, 191, 0.7)',         // Light Teal/Cyan
    Glúteos: 'rgba(251, 113, 133, 0.7)',        // Light Rose
    Cuello: 'rgba(251, 191, 36, 0.7)',          // Amber/Yellow
    // Legacy mapping support
    Pierna: 'rgba(5, 150, 105, 0.7)',           // Dark Green
    Brazos: 'rgba(124, 58, 237, 0.7)',          // Dark Violet
    'Full Body': 'rgba(107, 114, 128, 0.7)'     // Gray
  };

  const muscleColors = muscleLabels.map(label => muscleColorsMap[label] || 'rgba(156, 163, 175, 0.7)');

  const muscleDoughnutData = {
    labels: muscleLabels,
    datasets: [
      {
        data: muscleValues,
        backgroundColor: muscleColors,
        borderColor: doughnutBorderColor,
        borderWidth: 1.5,
        hoverOffset: 4,
      }
    ]
  };

  const muscleDoughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: legendColor,
          font: { family: 'Outfit', size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} series`
        }
      }
    }
  };

  // --- 4. 1RM PROGRESSION PER EXERCISE ---
  const getAllExerciseNames = () => {
    const names = new Set();
    workouts.forEach(w => {
      if (w.type === 'gym' && w.exercises) {
        w.exercises.forEach(ex => {
          if (ex.name) names.add(ex.name.trim());
        });
      }
    });
    return Array.from(names);
  };

  const allExercises = getAllExerciseNames();
  
  const getInitialExercise = (list) => {
    if (list.includes("Press de Banca Plano")) return "Press de Banca Plano";
    if (list.includes("Press de Banca")) return "Press de Banca";
    return list[0] || "";
  };

  const [selectedExercise, setSelectedExercise] = useState(getInitialExercise(allExercises));
  const chartRef = useRef(null);

  // Helper function to dynamically locate the peak historical 1RM lifting record
  const getBest1RMRecord = (exerciseKeywords) => {
    let bestRecord = null;
    
    workouts.forEach(w => {
      if (w.type === 'gym' && w.exercises) {
        w.exercises.forEach(ex => {
          if (ex.name) {
            const matchesKeyword = exerciseKeywords.some(keyword => 
              ex.name.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (matchesKeyword) {
              if (Array.isArray(ex.sets)) {
                ex.sets.forEach(s => {
                  if (s.done !== false) {
                    const weightVal = parseFloat(s.weight) || 0;
                    const repsVal = parseFloat(s.reps) || 0;
                    const oneRepMax = calculate1RM(weightVal, repsVal, s.rpe || ex.rpe);
                    if (oneRepMax > 0) {
                      if (!bestRecord || oneRepMax > bestRecord.oneRepMax) {
                        bestRecord = {
                          exerciseName: ex.name,
                          oneRepMax: Math.round(oneRepMax * 10) / 10,
                          weight: weightVal,
                          reps: repsVal,
                          rpe: s.rpe || ex.rpe,
                          date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })
                        };
                      }
                    }
                  }
                });
              } else {
                const oneRepMax = calculate1RM(ex.weight, ex.reps, ex.rpe || w.rpe);
                if (oneRepMax > 0) {
                  if (!bestRecord || oneRepMax > bestRecord.oneRepMax) {
                    bestRecord = {
                      exerciseName: ex.name,
                      oneRepMax: Math.round(oneRepMax * 10) / 10,
                      weight: ex.weight,
                      reps: ex.reps,
                      rpe: ex.rpe || w.rpe,
                      date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })
                    };
                  }
                }
              }
            }
          }
        });
      }
    });
    
    return bestRecord;
  };

  // Compute records for three core strength milestones
  const benchPressPR = getBest1RMRecord(['banca', 'bench press']);
  const squatPR = getBest1RMRecord(['sentadilla', 'squat']);
  const deadliftPR = getBest1RMRecord(['peso muerto', 'deadlift']);

  // Compute Running PRs (Strava style)
  const getRunningPR = (targetDistanceKm) => {
    let bestRecord = null;
    let bestPace = Infinity; // seconds per km
    
    runningWorkouts.forEach(w => {
      const dist = Number(w.distance || 0);
      if (dist >= targetDistanceKm) {
        const paceSecs = timeStringToSeconds(w.duration) / dist;
        if (paceSecs < bestPace) {
          bestPace = paceSecs;
          // Projected time for the target distance
          const projectedTimeSecs = paceSecs * targetDistanceKm;
          
          bestRecord = {
            projectedTime: secondsToTimeString(projectedTimeSecs),
            actualPace: secondsToTimeString(paceSecs),
            date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            }),
            sourceDistance: dist.toFixed(2),
            sourceDuration: w.duration
          };
        }
      }
    });
    return bestRecord;
  };

  const pr1K = getRunningPR(1);
  const pr5K = getRunningPR(5);
  const pr10K = getRunningPR(10);
  const pr21K = getRunningPR(21.1);

  const handleViewProgression = (exerciseName) => {
    setSelectedExercise(exerciseName);
    setTimeout(() => {
      chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const get1RMDataPoints = () => {
    if (!selectedExercise) return { dates: [], values: [] };
    
    const points = [];
    workouts
      .filter(w => w.type === 'gym' && w.exercises)
      .sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'))
      .forEach(w => {
        const matchingEx = w.exercises.find(ex => ex.name.trim() === selectedExercise);
        if (matchingEx) {
          let oneRepMax = 0;
          if (Array.isArray(matchingEx.sets)) {
            matchingEx.sets.forEach(s => {
              if (s.done !== false) {
                const calculated1RM = calculate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0, s.rpe || matchingEx.rpe);
                if (calculated1RM > oneRepMax) {
                  oneRepMax = calculated1RM;
                }
              }
            });
          } else {
            oneRepMax = calculate1RM(matchingEx.weight, matchingEx.reps, matchingEx.rpe || w.rpe);
          }
          
          if (oneRepMax > 0) {
            points.push({
              date: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
              oneRepMax: Math.round(oneRepMax * 10) / 10
            });
          }
        }
      });

    return {
      dates: points.map(pt => pt.date),
      values: points.map(pt => pt.oneRepMax)
    };
  };

  const progressPoints = get1RMDataPoints();

  const progressChartData = {
    labels: progressPoints.dates,
    datasets: [
      {
        label: `1RM Estimado de ${selectedExercise} (kg)`,
        data: progressPoints.values,
        borderColor: '#8b5cf6',
        backgroundColor: isLight ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.25,
      }
    ]
  };

  const progressChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` 1RM Estimado: ${context.raw} kg`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Peso Máximo Estimado (1RM - kg)', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 5. LIFETIME STATS ---
  const totalRunningKm = Math.round(runningWorkouts.reduce((sum, w) => sum + Number(w.distance || 0), 0) * 10) / 10;
  const totalGymVolumeKg = gymVolumes.reduce((sum, vol) => sum + vol, 0);
  const totalGymTonnageTons = Math.round((totalGymVolumeKg / 1000) * 10) / 10;
  
  const totalCardioSeconds = runningWorkouts.reduce((sum, w) => sum + timeStringToSeconds(w.duration), 0);
  const totalCardioHours = Math.floor(totalCardioSeconds / 3600);
  const totalCardioMinutes = Math.floor((totalCardioSeconds % 3600) / 60);
  const totalCardioFormatted = `${totalCardioHours}h ${totalCardioMinutes}m`;
  
  let avgWorkoutsPerWeek = 0;
  if (workouts.length > 0) {
    const dates = workouts.map(w => new Date(w.date + 'T00:00:00')).sort((a, b) => a - b);
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const diffTime = Math.abs(lastDate - firstDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const diffWeeks = Math.max(1, diffDays / 7);
    avgWorkoutsPerWeek = Math.round((workouts.length / diffWeeks) * 10) / 10;
  }

  // --- 6. SECOND-TIER STRENGTH RECORDS ---
  const overheadPressPR = getBest1RMRecord(['militar', 'overhead', 'shoulder press', 'press militar']);
  const pullupsPR = getBest1RMRecord(['dominada', 'pull-up', 'pullup', 'chin-up']);
  const bicepsCurlPR = getBest1RMRecord(['curl de biceps', 'curl de bíceps', 'biceps curl', 'curl biceps']);

  // --- 7. CARDIOVASCULAR EFFICIENCY INDEX CHART ---
  const runningWithHR = runningWorkouts.filter(w => {
    const dist = Number(w.distance || 0);
    const hrs = w.heartRate ? Number(w.heartRate) : 0;
    const secs = timeStringToSeconds(w.duration);
    return dist > 0 && hrs > 0 && secs > 0;
  });

  const efficiencyDates = runningWithHR.map(w => {
    return new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  });

  const efficiencyValues = runningWithHR.map(w => {
    const distMeters = Number(w.distance) * 1000;
    const secs = timeStringToSeconds(w.duration);
    const speedMps = distMeters / secs;
    const hr = Number(w.heartRate);
    const eff = (speedMps / hr) * 1000;
    return Math.round(eff * 100) / 100;
  });

  const efficiencyChartData = {
    labels: efficiencyDates,
    datasets: [
      {
        label: 'Índice de Eficiencia (m/s por latido * 1000)',
        data: efficiencyValues,
        borderColor: '#06b6d4',
        backgroundColor: isLight ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      }
    ]
  };

  const efficiencyChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Eficiencia: ${context.raw} pts`
        }
      }
    },
    scales: {
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor },
        title: { display: true, text: 'Eficiencia Fisiológica', color: textColor }
      },
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      }
    }
  };

  // --- 8. GAMIFIED CYBERPUNK MILESTONES ---
  const hasRayoVerde = runningWorkouts.some(w => {
    const dist = Number(w.distance || 0);
    if (dist >= 5) {
      const paceSecs = timeStringToSeconds(w.duration) / dist;
      return paceSecs <= 300; // <= 5:00 min/km
    }
    return false;
  });

  const hasEspirituErrante = runningWorkouts.some(w => Number(w.distance || 0) >= 12);
  const hasHerculesAcero = gymVolumes.some(vol => vol >= 3000);
  const hasMonarcaPesoMuerto = deadliftPR && deadliftPR.oneRepMax >= 100;
  const hasAbsorbenteHierro = totalGymVolumeKg >= 15000;
  const hasCorazonTitanio = totalRunningKm >= 80;

  const milestones = [
    {
      id: 'rayo-verde',
      title: 'Rayo Verde',
      desc: 'Correr 5K o más a un ritmo promedio inferior a 5:00 min/km.',
      unlocked: hasRayoVerde,
      icon: Flame,
      color: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.35)',
    },
    {
      id: 'espiritu-errante',
      title: 'Espíritu Errante',
      desc: 'Completar una carrera de fondo de al menos 12 kilómetros.',
      unlocked: hasEspirituErrante,
      icon: Sparkles,
      color: '#3b82f6',
      glowColor: 'rgba(59, 130, 246, 0.35)',
    },
    {
      id: 'hercules-acero',
      title: 'Hércules de Acero',
      desc: 'Levantar un volumen de al menos 3,000 kg en una sola sesión de gimnasio.',
      unlocked: hasHerculesAcero,
      icon: Trophy,
      color: '#ec4899',
      glowColor: 'rgba(236, 72, 153, 0.35)',
    },
    {
      id: 'monarca-peso-muerto',
      title: 'Monarca del Peso Muerto',
      desc: 'Alcanzar un 1RM estimado en Peso Muerto de 100 kg o superior.',
      unlocked: hasMonarcaPesoMuerto,
      icon: Crown,
      color: '#8b5cf6',
      glowColor: 'rgba(139, 92, 246, 0.35)',
    },
    {
      id: 'absorbente-hierro',
      title: 'Absorbente de Hierro',
      desc: 'Acumular un volumen total de gimnasio de 15,000 kg o más.',
      unlocked: hasAbsorbenteHierro,
      icon: Dumbbell,
      color: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)',
    },
    {
      id: 'corazon-titanio',
      title: 'Corazón de Titanio',
      desc: 'Acumular una distancia total de running de 80 kilómetros o más.',
      unlocked: hasCorazonTitanio,
      icon: Activity,
      color: '#06b6d4',
      glowColor: 'rgba(6, 182, 212, 0.35)',
    }
  ];

  return (
    <div className="analytics-container fade-in">
      <header className="analytics-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold">Estadísticas y Progreso</h1>
          <p className="text-secondary text-sm">Visualiza tus mejoras acumuladas, patrones de entrenamiento y sobrecarga progresiva.</p>
        </div>
      </header>

      {workouts.length > 0 && (
        <section className="lifetime-stats-section fade-in mb-6">
          <div className="lifetime-stats-grid">
            <div className="glass-card stats-mini-card km-run">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Distancia Running Acumulada</span>
                <Activity size={16} style={{ color: 'var(--color-running)' }} />
              </div>
              <div className="stats-mini-value">{totalRunningKm} <span className="stats-mini-unit">km</span></div>
              <p className="stats-mini-desc">Kilómetros totales recorridos a pie</p>
            </div>

            <div className="glass-card stats-mini-card gym-ton">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Tonelaje Gimnasio Acumulado</span>
                <Flame size={16} style={{ color: 'var(--color-gym)' }} />
              </div>
              <div className="stats-mini-value">{totalGymTonnageTons} <span className="stats-mini-unit">Tn</span></div>
              <p className="stats-mini-desc">Carga de entrenamiento total levantada</p>
            </div>

            <div className="glass-card stats-mini-card hours-card">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Tiempo Total de Cardio</span>
                <Timer size={16} style={{ color: 'var(--color-running)' }} />
              </div>
              <div className="stats-mini-value">{totalCardioFormatted}</div>
              <p className="stats-mini-desc">Tiempo acumulado en suela de carrera</p>
            </div>

            <div className="glass-card stats-mini-card consistency-card">
              <div className="stats-mini-header">
                <span className="stats-mini-label">Consistencia Global</span>
                <Calendar size={16} className="text-primary-glow" />
              </div>
              <div className="stats-mini-value">{avgWorkoutsPerWeek} <span className="stats-mini-unit">ses/sem</span></div>
              <p className="stats-mini-desc">Frecuencia de entrenamiento semanal</p>
            </div>
          </div>
        </section>
      )}

      {workouts.length === 0 ? (
        <div className="glass-card empty-state-analytics">
          <PieChart size={48} className="text-muted mb-3" />
          <h3>Sin suficientes datos</h3>
          <p className="text-secondary">Carga entrenamientos en la pestaña del historial o agregando una sesión para generar las analíticas.</p>
        </div>
      ) : (
        <>
          {/* Section: Fuerza y Récords Personales (Salón de la Fama) */}
          <section className="pr-section fade-in mb-6">
            <h2 className="section-subtitle flex-center mb-3">
              <Trophy size={20} style={{ color: 'var(--color-primary)' }} />
              Salón de la Fama de Fuerza (Récords Históricos 1RM)
            </h2>
            <p className="text-secondary text-xs mb-4">
              Estos son tus levantamientos máximos absolutos (1RM estimado) detectados automáticamente en tu historial para ejercicios emblemáticos de fuerza.
            </p>
            
            <div className="pr-cards-grid">
              {/* Card 1: Press de Banca */}
              <div className="glass-card pr-card pr-bench">
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center">
                    <Crown size={20} />
                  </div>
                  <span className="pr-card-badge">Empuje</span>
                </div>
                <h3 className="pr-exercise-title">Press de Banca</h3>
                {benchPressPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value">{benchPressPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{benchPressPR.weight} kg x {benchPressPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {benchPressPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(benchPressPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas en Press de Banca aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 2: Sentadilla */}
              <div className="glass-card pr-card pr-squat">
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center">
                    <Trophy size={20} />
                  </div>
                  <span className="pr-card-badge">Tren Inferior</span>
                </div>
                <h3 className="pr-exercise-title">Sentadilla</h3>
                {squatPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value">{squatPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{squatPR.weight} kg x {squatPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {squatPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(squatPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas en Sentadillas aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 3: Peso Muerto */}
              <div className="glass-card pr-card pr-deadlift">
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center">
                    <Award size={20} />
                  </div>
                  <span className="pr-card-badge">Cadena Posterior</span>
                </div>
                <h3 className="pr-exercise-title">Peso Muerto</h3>
                {deadliftPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value">{deadliftPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{deadliftPR.weight} kg x {deadliftPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {deadliftPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(deadliftPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas en Peso Muerto aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>
            </div>

            <h3 className="section-subtitle-secondary flex-center mt-6 mb-3" style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600, gap: '0.4rem', marginTop: '1.75rem' }}>
              <Dumbbell size={16} style={{ color: 'var(--color-primary)' }} />
              Récords Secundarios de Fuerza (Aislamiento y Accesorios)
            </h3>
            
            <div className="pr-cards-grid secondary-pr-grid mb-6">
              {/* Card 4: Press Militar */}
              <div className="glass-card pr-card pr-military" style={{ minHeight: '220px' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <Flame size={18} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Hombros</span>
                </div>
                <h3 className="pr-exercise-title">Press Militar</h3>
                {overheadPressPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ fontSize: '1.85rem' }}>{overheadPressPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{overheadPressPR.weight} kg x {overheadPressPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {overheadPressPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(overheadPressPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 5: Dominadas */}
              <div className="glass-card pr-card pr-pullups" style={{ minHeight: '220px' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                    <Crown size={18} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Espalda / Tirón</span>
                </div>
                <h3 className="pr-exercise-title">Dominadas</h3>
                {pullupsPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ fontSize: '1.85rem' }}>{pullupsPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{pullupsPR.weight} kg x {pullupsPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {pullupsPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(pullupsPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>

              {/* Card 6: Curl de Bíceps */}
              <div className="glass-card pr-card pr-biceps" style={{ minHeight: '220px' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                    <Sparkles size={18} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>Brazos</span>
                </div>
                <h3 className="pr-exercise-title">Curl de Bíceps</h3>
                {bicepsCurlPR ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ fontSize: '1.85rem' }}>{bicepsCurlPR.oneRepMax} <span className="pr-unit">kg</span></div>
                    <div className="pr-detail-pill">{bicepsCurlPR.weight} kg x {bicepsCurlPR.reps} reps</div>
                    <div className="pr-date-row">
                      <Zap size={10} className="text-primary-glow" />
                      <span>Logrado el {bicepsCurlPR.date}</span>
                    </div>
                    <button 
                      onClick={() => handleViewProgression(bicepsCurlPR.exerciseName)}
                      className="btn btn-pr-action flex-center mt-3"
                    >
                      <span>Evolución Temporal</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="pr-stats-empty">
                    <p className="text-muted text-2xs mt-2 mb-3">Sin marcas registradas aún.</p>
                    <div className="pr-detail-pill disabled">-- kg</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section: Running Personal Bests (Strava Style) */}
          <section className="pr-section fade-in mb-6">
            <h2 className="section-subtitle flex-center mb-3">
              <Award size={20} style={{ color: 'var(--color-running)' }} />
              Mejores Tiempos Estimados (Running)
            </h2>
            <p className="text-secondary text-xs mb-4">
              Tus récords personales proyectados (PBs) basados en el ritmo medio de tus mejores carreras para distancias populares.
            </p>
            
            <div className="pr-cards-grid">
              {/* 5K Card */}
              <div className="glass-card pr-card pr-run" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                    <Zap size={20} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>5 Kilómetros</span>
                </div>
                <h3 className="pr-exercise-title">Récord de 5K</h3>
                {pr5K ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ color: '#10b981' }}>{pr5K.projectedTime} <span className="pr-unit" style={{ color: '#10b981', opacity: 0.7 }}>hh:mm:ss</span></div>
                    <div className="pr-detail-pill" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>Ritmo: {pr5K.actualPace} /km</div>
                    <div className="pr-date-row">
                      <Zap size={10} style={{ color: '#10b981' }} />
                      <span>Logrado el {pr5K.date}</span>
                    </div>
                  </div>
                ) : (
                   <div className="pr-stats-empty">
                     <p className="text-muted text-2xs mt-2 mb-3">Registra una carrera de al menos 5K.</p>
                     <div className="pr-detail-pill disabled">--:--:--</div>
                   </div>
                )}
              </div>

              {/* 10K Card */}
              <div className="glass-card pr-card pr-run" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                    <Trophy size={20} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>10 Kilómetros</span>
                </div>
                <h3 className="pr-exercise-title">Récord de 10K</h3>
                {pr10K ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ color: '#3b82f6' }}>{pr10K.projectedTime} <span className="pr-unit" style={{ color: '#3b82f6', opacity: 0.7 }}>hh:mm:ss</span></div>
                    <div className="pr-detail-pill" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>Ritmo: {pr10K.actualPace} /km</div>
                    <div className="pr-date-row">
                      <Zap size={10} style={{ color: '#3b82f6' }} />
                      <span>Logrado el {pr10K.date}</span>
                    </div>
                  </div>
                ) : (
                   <div className="pr-stats-empty">
                     <p className="text-muted text-2xs mt-2 mb-3">Registra una carrera de al menos 10K.</p>
                     <div className="pr-detail-pill disabled">--:--:--</div>
                   </div>
                )}
              </div>

              {/* 21K Card */}
              <div className="glass-card pr-card pr-run" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                <div className="pr-card-header-row">
                  <div className="pr-icon-glow flex-center" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                    <Crown size={20} />
                  </div>
                  <span className="pr-card-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>Medio Maratón</span>
                </div>
                <h3 className="pr-exercise-title">Récord de 21K</h3>
                {pr21K ? (
                  <div className="pr-stats-area">
                    <div className="pr-1rm-value" style={{ color: '#8b5cf6' }}>{pr21K.projectedTime} <span className="pr-unit" style={{ color: '#8b5cf6', opacity: 0.7 }}>hh:mm:ss</span></div>
                    <div className="pr-detail-pill" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>Ritmo: {pr21K.actualPace} /km</div>
                    <div className="pr-date-row">
                      <Zap size={10} style={{ color: '#8b5cf6' }} />
                      <span>Logrado el {pr21K.date}</span>
                    </div>
                  </div>
                ) : (
                   <div className="pr-stats-empty">
                     <p className="text-muted text-2xs mt-2 mb-3">Registra una carrera de al menos 21.1K.</p>
                     <div className="pr-detail-pill disabled">--:--:--</div>
                   </div>
                )}
              </div>
            </div>
          </section>

          {/* ========================================== */}
          {/* RUNNING VOLUME ANALYZER & BENCHMARKER CARD */}
          {/* ========================================== */}
          <section className="volume-analyzer-section fade-in mb-6" style={{ marginTop: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
              <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                <div>
                  <h3 className="chart-title flex-center" style={{ fontSize: '1.15rem', fontWeight: '800', gap: '6px', color: 'var(--text-primary)' }}>
                    <Activity size={20} className="running-text" /> 
                    Comparador y Analizador de Carga (Kilometraje)
                  </h3>
                  <span className="text-secondary text-xs">Analiza la progresión de tu volumen y compáralo con tus objetivos o marcas de referencia.</span>
                </div>
                
                {/* Timeframe Controls */}
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    type="button"
                    onClick={() => setVolumeTimeframe('semana')}
                    className={`time-badge-btn ${volumeTimeframe === 'semana' ? 'active-running' : ''}`}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: 'none',
                      background: volumeTimeframe === 'semana' ? 'var(--color-running)' : 'transparent',
                      color: volumeTimeframe === 'semana' ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Semanal
                  </button>
                  <button
                    type="button"
                    onClick={() => setVolumeTimeframe('mes')}
                    className={`time-badge-btn ${volumeTimeframe === 'mes' ? 'active-running' : ''}`}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: 'none',
                      background: volumeTimeframe === 'mes' ? 'var(--color-running)' : 'transparent',
                      color: volumeTimeframe === 'mes' ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setVolumeTimeframe('año')}
                    className={`time-badge-btn ${volumeTimeframe === 'año' ? 'active-running' : ''}`}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: 'none',
                      background: volumeTimeframe === 'año' ? 'var(--color-running)' : 'transparent',
                      color: volumeTimeframe === 'año' ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Anual
                  </button>
                </div>
              </div>

              {/* Benchmarking controls & dynamically customized goal input */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="toolbar-label" style={{ fontSize: '0.7rem' }}>Comparar tu volumen contra:</label>
                  <select
                    value={volumeBenchmark}
                    onChange={(e) => setVolumeBenchmark(e.target.value)}
                    className="toolbar-select"
                    style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    <option value="prev-period">🔄 Período Previo (Semana/Mes/Año anterior)</option>
                    <option value="personal-goal">🎯 Objetivo Personal de Carga</option>
                    <option value="amateur">🏃 Corredor Amateur (20 km/sem)</option>
                    <option value="boston">⚡ Benchmark Maratonista Boston (60 km/sem)</option>
                    <option value="elite">👑 Benchmark Corredor Élite / Ultramaratón (100 km/sem)</option>
                  </select>
                </div>

                {volumeBenchmark === 'personal-goal' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label className="toolbar-label" style={{ fontSize: '0.7rem' }}>
                      Definir Objetivo {volumeTimeframe === 'semana' ? 'Semanal' : volumeTimeframe === 'mes' ? 'Mensual' : 'Anual'} (km):
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="1"
                        value={volumeTimeframe === 'semana' ? weeklyGoal : volumeTimeframe === 'mes' ? monthlyGoal : yearlyGoal}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          if (volumeTimeframe === 'semana') {
                            setWeeklyGoal(val);
                            localStorage.setItem('fitanalytics_weekly_km_goal', val.toString());
                          } else if (volumeTimeframe === 'mes') {
                            setMonthlyGoal(val);
                            localStorage.setItem('fitanalytics_monthly_km_goal', val.toString());
                          } else {
                            setYearlyGoal(val);
                            localStorage.setItem('fitanalytics_yearly_km_goal', val.toString());
                          }
                        }}
                        className="toolbar-input"
                        style={{ maxWidth: '120px', padding: '0.55rem 0.85rem' }}
                      />
                      <span className="text-secondary text-sm">km</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.75rem', alignItems: 'stretch' }} className="volume-grid-layout">
                {/* Left Side: The Mixed Chart */}
                <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', position: 'relative', minHeight: '330px' }}>
                  {runningWorkouts.length === 0 ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Registra tu primer entrenamiento de running para comenzar a trazar las estadísticas.
                    </div>
                  ) : (
                    <Bar data={volumeChartData} options={volumeChartOptions} />
                  )}
                </div>

                {/* Right Side: Scientific statistics details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
                  <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <span className="toolbar-label" style={{ fontSize: '0.68rem', display: 'block', marginBottom: '4px' }}>
                        Carga en el período activo
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--color-running)', lineHeight: 1 }}>
                          {activeDistance.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          km totales
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {activeRuns} corridas registradas en este bloque
                      </span>
                    </div>

                    {/* Benchmark Deviation Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
                      <span className="toolbar-label" style={{ fontSize: '0.68rem' }}>Desviación vs. Referencia</span>
                      {activeBenchmark > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            background: activeDiffPercent >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: activeDiffPercent >= 0 ? '#10b981' : '#f87171',
                            border: activeDiffPercent >= 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            {activeDiffPercent >= 0 ? `▲ +${activeDiffPercent}%` : `▼ ${activeDiffPercent}%`}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {activeDiffPercent >= 0 
                              ? '¡Superaste el objetivo de volumen!' 
                              : 'Por debajo del volumen de referencia'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin referencia anterior disponible</span>
                      )}
                    </div>

                    {/* Scientific summaries / day average */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {volumeTimeframe === 'año' ? 'Promedio mensual:' : 'Promedio diario:'}
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {activeDailyAverage} km / {volumeTimeframe === 'año' ? 'mes' : 'día'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Promedio por corrida:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{activePacePerRun} km</strong>
                      </div>
                    </div>
                  </div>

                  {/* Scientific training advice */}
                  <div style={{
                    borderLeft: '3px solid var(--color-running)',
                    background: 'rgba(16, 185, 129, 0.03)',
                    padding: '0.85rem 1rem',
                    borderRadius: '4px 8px 8px 4px',
                    fontSize: '0.72rem',
                    lineHeight: '1.35',
                    color: 'var(--text-secondary)'
                  }}>
                    <strong>💡 Consejo Fisiológico:</strong>
                    {volumeTimeframe === 'semana' ? (
                      ' Trata de no incrementar tu volumen semanal total más de un 10% de semana a semana para mitigar el riesgo de lesiones de tendón de Aquiles y fascitis plantar.'
                    ) : (
                      ' Los bloques de gran volumen aeróbico consolidan tu base cardiovascular. El 80% de tus corridas mensuales deben transcurrir en tu Zona 2 aeróbica.'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================== */}
          {/* DETAILED DAY-BY-DAY RUNNING COMPARATOR CARD */}
          {/* ========================================== */}
          <section className="volume-comparator-section fade-in mb-6" style={{ marginTop: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
              <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                <div>
                  <h3 className="chart-title flex-center" style={{ fontSize: '1.15rem', fontWeight: '800', gap: '6px', color: 'var(--text-primary)' }}>
                    <Activity size={20} className="running-text" /> 
                    Comparador Detallado de Períodos y Distribución Diaria
                  </h3>
                  <span className="text-secondary text-xs">Compara día a día cómo distribuiste tus kilómetros en dos semanas o meses sucesivos.</span>
                </div>
                
                {/* Timeframe Controls */}
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.2)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    type="button"
                    onClick={() => handleCompTimeframeChange('semana')}
                    className={`time-badge-btn ${compTimeframe === 'semana' ? 'active-running' : ''}`}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: 'none',
                      background: compTimeframe === 'semana' ? 'var(--color-running)' : 'transparent',
                      color: compTimeframe === 'semana' ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Semanal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompTimeframeChange('mes')}
                    className={`time-badge-btn ${compTimeframe === 'mes' ? 'active-running' : ''}`}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      borderRadius: '6px',
                      border: 'none',
                      background: compTimeframe === 'mes' ? 'var(--color-running)' : 'transparent',
                      color: compTimeframe === 'mes' ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Mensual
                  </button>
                </div>
              </div>

              {/* Selection inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="toolbar-label" style={{ fontSize: '0.7rem' }}>Seleccionar Período A (Principal):</label>
                  <select
                    value={selectedPeriodA}
                    onChange={(e) => setSelectedPeriodA(e.target.value)}
                    className="toolbar-select"
                    style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    {compTimeframe === 'semana'
                      ? availableWeeks.map(wk => <option key={wk.value} value={wk.value}>{wk.label}</option>)
                      : availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="toolbar-label" style={{ fontSize: '0.7rem' }}>Seleccionar Período B (Comparación):</label>
                  <select
                    value={selectedPeriodB}
                    onChange={(e) => setSelectedPeriodB(e.target.value)}
                    className="toolbar-select"
                    style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    {compTimeframe === 'semana'
                      ? availableWeeks.map(wk => <option key={wk.value} value={wk.value}>{wk.label}</option>)
                      : availableMonths.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Comparative Summary KPIs */}
              <div className="comp-kpis-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                {/* KPI 1: Kilómetros Totales */}
                <div className="comp-kpi-card glass-card" style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>Distancia Total</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>{statsA.totalDist} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>km</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período A</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#3b82f6' }}>{statsB.totalDist} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>km</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período B</span>
                    </div>
                  </div>
                  <div style={{
                    borderTop: '1px dashed rgba(255,255,255,0.05)',
                    paddingTop: '6px',
                    marginTop: '2px',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    color: (statsA.totalDist - statsB.totalDist) >= 0 ? '#10b981' : '#f87171',
                    fontWeight: '700'
                  }}>
                    { (statsA.totalDist - statsB.totalDist) >= 0 
                      ? `▲ +${(statsA.totalDist - statsB.totalDist).toFixed(1)} km` 
                      : `▼ ${(statsA.totalDist - statsB.totalDist).toFixed(1)} km`
                    }
                  </div>
                </div>

                {/* KPI 2: Ritmo Promedio */}
                <div className="comp-kpi-card glass-card" style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>Ritmo Promedio</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>{statsA.avgPaceStr} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>/km</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período A</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#3b82f6' }}>{statsB.avgPaceStr} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>/km</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período B</span>
                    </div>
                  </div>
                  <div style={{
                    borderTop: '1px dashed rgba(255,255,255,0.05)',
                    paddingTop: '6px',
                    marginTop: '2px',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontWeight: '600'
                  }}>
                    ⏱️ Comparación de Ritmos
                  </div>
                </div>

                {/* KPI 3: Tiempo Entrenando */}
                <div className="comp-kpi-card glass-card" style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>Tiempo Total</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>{statsA.totalDurationStr}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período A</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#3b82f6' }}>{statsB.totalDurationStr}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período B</span>
                    </div>
                  </div>
                  <div style={{
                    borderTop: '1px dashed rgba(255,255,255,0.05)',
                    paddingTop: '6px',
                    marginTop: '2px',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontWeight: '600'
                  }}>
                    🕒 Tiempo de Trabajo
                  </div>
                </div>

                {/* KPI 4: Velocidad Media */}
                <div className="comp-kpi-card glass-card" style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>Velocidad Media</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>{statsA.avgSpeed} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>km/h</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período A</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#3b82f6' }}>{statsB.avgSpeed} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>km/h</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período B</span>
                    </div>
                  </div>
                  <div style={{
                    borderTop: '1px dashed rgba(255,255,255,0.05)',
                    paddingTop: '6px',
                    marginTop: '2px',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    color: (statsA.avgSpeed - statsB.avgSpeed) >= 0 ? '#10b981' : '#f87171',
                    fontWeight: '700'
                  }}>
                    { (statsA.avgSpeed - statsB.avgSpeed) >= 0 
                      ? `▲ +${(statsA.avgSpeed - statsB.avgSpeed).toFixed(1)} km/h` 
                      : `▼ ${(statsA.avgSpeed - statsB.avgSpeed).toFixed(1)} km/h`
                    }
                  </div>
                </div>

                {/* KPI 5: Cantidad de Actividades */}
                <div className="comp-kpi-card glass-card" style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.05em' }}>Actividades</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#10b981' }}>{statsA.activitiesCount} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>runs</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período A</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#3b82f6' }}>{statsB.activitiesCount} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>runs</span></span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Período B</span>
                    </div>
                  </div>
                  <div style={{
                    borderTop: '1px dashed rgba(255,255,255,0.05)',
                    paddingTop: '6px',
                    marginTop: '2px',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    color: (statsA.activitiesCount - statsB.activitiesCount) >= 0 ? '#10b981' : '#f87171',
                    fontWeight: '700'
                  }}>
                    { (statsA.activitiesCount - statsB.activitiesCount) >= 0 
                      ? `▲ +${statsA.activitiesCount - statsB.activitiesCount} runs` 
                      : `▼ ${statsA.activitiesCount - statsB.activitiesCount} runs`
                    }
                  </div>
                </div>
              </div>

              {/* Main content grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.75rem', alignItems: 'stretch' }} className="volume-grid-layout">
                {/* Left Column: Line Chart Overlay */}
                <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', position: 'relative', minHeight: '330px' }}>
                  {runningWorkouts.length === 0 ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Registra corridas para ver la distribución diaria.
                    </div>
                  ) : (
                    <Line data={compChartData} options={compChartOptions} />
                  )}
                </div>

                {/* Right Column: Comparative List/KPIs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="volume-grid-layout">
                  <div className="glass-card custom-exercise-dropdown" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '330px', overflowY: 'auto' }}>
                    <span className="toolbar-label" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                      Desglose Comparativo por Día
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {comparisonLabels.map((dayLabel, idx) => {
                        const valA = comparisonData.distA[idx] || 0;
                        const valB = comparisonData.distB[idx] || 0;
                        if (compTimeframe === 'mes' && valA === 0 && valB === 0) return null; // hide empty days in monthly view for neatness
                        
                        const diff = valA - valB;
                        
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-primary)' }}>{dayLabel}</span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {activeLabelA.split(' ')[0]}: <strong>{valA}k</strong> vs {activeLabelB.split(' ')[0]}: <strong>{valB}k</strong>
                              </span>
                            </div>
                            
                            {diff !== 0 ? (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                color: diff > 0 ? '#10b981' : '#f87171'
                              }}>
                                {diff > 0 ? `+${diff.toFixed(1)}k` : `${diff.toFixed(1)}k`}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>=</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================== */}
          {/* VO2MAX HISTORICAL ESTIMATOR & TRACKER CARD */}
          {/* ========================================== */}
          <section className="vo2max-section fade-in mb-6" style={{ marginTop: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
              <div className="chart-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                <div>
                  <h3 className="chart-title flex-center" style={{ fontSize: '1.15rem', fontWeight: '800', gap: '6px', color: 'var(--text-primary)' }}>
                    <Activity size={20} style={{ color: '#ec4899' }} /> 
                    Estimador y Progresión de VO2Max Histórico
                  </h3>
                  <span className="text-secondary text-xs">Monitorea tu volumen máximo de oxígeno asimilado (mL/kg/min) frente a tu potencial fisiológico teórico.</span>
                </div>
                
                {/* Profile-derived physiological indicators */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    👤 Edad: <strong style={{ color: '#fff' }}>{userAge}a</strong>
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    💓 FCmáx Est: <strong style={{ color: '#ec4899' }}>{hrMax} ppm</strong>
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    🛌 FCreposo: <strong style={{ color: '#a855f7' }}>{hrRest} ppm</strong>
                  </span>
                </div>
              </div>

              {/* Main content layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.75rem', alignItems: 'stretch' }} className="volume-grid-layout">
                {/* Left Side: VO2Max Line Chart */}
                <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', position: 'relative', minHeight: '330px' }}>
                  {runningWorkouts.length === 0 ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Registra corridas para comenzar a trazar tu VO2Max activo.
                    </div>
                  ) : (
                    <Line data={vo2ChartData} options={vo2ChartOptions} />
                  )}
                </div>

                {/* Right Side: Scientific statistics details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
                  <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <span className="toolbar-label" style={{ fontSize: '0.68rem', display: 'block', marginBottom: '4px' }}>
                        Consumo de Oxígeno Actual (Último Mes Activo)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '2.1rem', fontWeight: 900, color: '#ec4899', lineHeight: 1 }}>
                          {currentVO2Max.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          mL/kg/min
                        </span>
                      </div>
                      
                      {/* Classification Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          background: `${vo2Category.color}18`,
                          color: vo2Category.color,
                          border: `1px solid ${vo2Category.color}35`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Rango: {vo2Category.text}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px', lineHeight: '1.3' }}>
                        {vo2Category.desc}
                      </span>
                    </div>

                    {/* Physiology & Uth estimation detail */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.85rem' }}>
                      <span className="toolbar-label" style={{ fontSize: '0.68rem' }}>Potencial Fisiológico Teórico</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Fórmula Uth-Sørensen:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{uthVO2Max} mL/kg/min</strong>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                        Estima tu techo aeróbico genético aproximado cruzando tu frecuencia cardíaca máxima y tu pulso en reposo.
                      </span>
                    </div>
                  </div>

                  {/* Scientific training advice */}
                  <div style={{
                    borderLeft: '3px solid #ec4899',
                    background: 'rgba(236, 72, 153, 0.03)',
                    padding: '0.85rem 1rem',
                    borderRadius: '4px 8px 8px 4px',
                    fontSize: '0.72rem',
                    lineHeight: '1.35',
                    color: 'var(--text-secondary)'
                  }}>
                    <strong>💡 Consejo Fisiológico de VO2Max:</strong>
                    {currentVO2Max < 44 ? (
                      ' Para elevar tu VO2Max de forma segura, el volumen es la clave. Entrena en Zona 2 el 80% de tus sesiones semanales para expandir la densidad capilar de tus piernas.'
                    ) : (
                      ' Excelente base aeróbica. Para seguir progresando tu VO2Max, introduce una sesión semanal de intervalos duros (ej: 4x4 minutos al 90-95% HRmax con 3 minutos de recuperación).'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="analytics-grid">
          
          {/* Chart 1: Running Pace (Min/Km) */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <TrendingUp size={18} className="running-text" /> 
                Progreso de Ritmo (Running)
              </h3>
              <span className="text-muted text-xs">Paso medio por corrida (menor es mejor)</span>
            </div>
            <div className="chart-wrapper-canvas">
              {runningWorkouts.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 corridas para trazar la curva de progresión.</div>
              ) : (
                <Line data={runningChartData} options={runningChartOptions} />
              )}
            </div>
          </div>

          {/* Chart 5: Cardiovascular Efficiency Index */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <Activity size={18} style={{ color: '#06b6d4' }} /> 
                Índice de Eficiencia Cardiovascular (Carrera)
              </h3>
              <span className="text-muted text-xs">Fórmula: Velocidad (m/s) / Pulso medio × 1000 (mayor es mejor)</span>
            </div>
            <div className="chart-wrapper-canvas">
              {runningWithHR.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 corridas con sensor de pulso para evaluar tu eficiencia.</div>
              ) : (
                <Line data={efficiencyChartData} options={efficiencyChartOptions} />
              )}
            </div>
          </div>

          {/* Chart 2: Gym Volume (Kg) */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <BarChart2 size={18} className="gym-text" /> 
                Volumen Levantado por Sesión (Gimnasio)
              </h3>
              <span className="text-muted text-xs">Suma de: Series x Reps x Peso levantado</span>
            </div>
            <div className="chart-wrapper-canvas">
              {gymWorkouts.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 entrenamientos de gimnasio para evaluar tu volumen acumulado.</div>
              ) : (
                <Bar data={gymVolumeData} options={gymVolumeOptions} />
              )}
            </div>
          </div>

          {/* Chart 3: Muscle groups doughnut */}
          <div className="glass-card chart-card">
            <div className="chart-card-header">
              <h3 className="chart-title flex-center">
                <PieChart size={18} style={{ color: 'var(--color-primary)' }} /> 
                Volumen de Trabajo por Grupo Muscular
              </h3>
              <span className="text-muted text-xs">Porcentaje de series totales completadas por zona</span>
            </div>
            <div className="chart-wrapper-canvas flex-center-content">
              {muscleLabels.length === 0 ? (
                <div className="empty-chart-notice">Carga entrenamientos en gimnasio con grupos musculares especificados.</div>
              ) : (
                <div className="doughnut-sizing">
                  <Doughnut data={muscleDoughnutData} options={muscleDoughnutOptions} />
                </div>
              )}
            </div>
          </div>

          {/* Chart 4: 1RM progress of selected exercise */}
          <div ref={chartRef} className="glass-card chart-card">
            <div className="chart-card-header flex-between-row">
              <div>
                <h3 className="chart-title flex-center">
                  <Dumbbell size={18} style={{ color: 'var(--color-primary)' }} /> 
                  Progresión de Fuerza (1RM)
                </h3>
                <span className="text-muted text-xs">Historial de carga máxima teórica (Epley)</span>
              </div>
              
              {allExercises.length > 0 && (
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="exercise-chart-select"
                >
                  {allExercises.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="chart-wrapper-canvas">
              {!selectedExercise ? (
                <div className="empty-chart-notice">No se encontraron ejercicios en tu historial de gimnasio.</div>
              ) : progressPoints.values.length < 2 ? (
                <div className="empty-chart-notice">Registra al menos 2 sesiones con el ejercicio '{selectedExercise}' para graficar el avance.</div>
              ) : (
                <Line data={progressChartData} options={progressChartOptions} />
              )}
            </div>
          </div>

        </div>

        {/* Section: Hitos y Logros de Rendimiento */}
        <section className="milestones-section fade-in mt-6" style={{ marginTop: '2rem' }}>
          <h2 className="section-subtitle flex-center mb-3">
            <Award size={20} style={{ color: 'var(--color-primary)' }} />
            Hitos y Logros de Rendimiento (Gamificación)
          </h2>
          <p className="text-secondary text-xs mb-4">
            Desbloquea insignias holográficas de élite completando hazañas reales de entrenamiento registradas en tu historial.
          </p>

          <div className="milestones-grid">
            {milestones.map(m => {
              const IconComponent = m.icon;
              return (
                <div 
                  key={m.id} 
                  className={`glass-card milestone-badge-card ${m.unlocked ? 'unlocked' : 'locked'}`}
                  style={{ 
                    '--milestone-color': m.color,
                    '--milestone-glow': m.glowColor
                  }}
                >
                  <div className="milestone-badge-glow-effect"></div>
                  <div className="milestone-card-inner">
                    <div className="milestone-icon-wrapper">
                      {m.unlocked ? (
                        <IconComponent size={24} className="milestone-icon" />
                      ) : (
                        <Lock size={20} className="milestone-lock-icon" />
                      )}
                    </div>
                    <div className="milestone-info">
                      <h4 className="milestone-title flex-center">
                        {m.title}
                        {m.unlocked && <span className="milestone-unlocked-tag">Desbloqueado</span>}
                      </h4>
                      <p className="milestone-desc">{m.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </>
      )}

      <style>{`
        .toolbar-select {
          width: 100%;
          padding: 0.6rem 2.2rem 0.6rem 1rem;
          background: rgba(9, 10, 15, 0.7) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 10px;
          color: var(--text-primary) !important;
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.6)' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'%3E%3C/path%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 0.75rem center !important;
          background-size: 0.85rem !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .toolbar-select:hover {
          border-color: rgba(16, 185, 129, 0.4) !important;
          background-color: rgba(9, 10, 15, 0.85) !important;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.15);
        }

        .toolbar-select:focus {
          outline: none;
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
          background-color: rgba(9, 10, 15, 0.95) !important;
        }

        .theme-light .toolbar-select {
          background-color: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(15, 23, 42, 0.12) !important;
          color: #1e293b !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(15,23,42,0.6)' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'%3E%3C/path%3E%3C/svg%3E") !important;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }

        .theme-light .toolbar-select:hover {
          border-color: rgba(16, 185, 129, 0.5) !important;
          background-color: #ffffff !important;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.15);
        }

        .theme-light .toolbar-select:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
        }

        @media (max-width: 900px) {
          .volume-grid-layout {
            grid-template-columns: 1fr !important;
          }
        }

        .analytics-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .analytics-header {
          margin-bottom: 0.5rem;
        }

        .text-3xl {
          font-size: 1.85rem;
          font-weight: 800;
        }

        .text-secondary {
          color: var(--text-secondary);
        }

        .text-sm {
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }

        .text-xs {
          font-size: 0.75rem;
        }

        .mb-3 {
          margin-bottom: 0.75rem;
        }

        /* Chart card styling */
        .chart-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-height: 380px;
        }

        .chart-card-header {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .flex-between-row {
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .chart-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          gap: 0.4rem;
        }

        .chart-wrapper-canvas {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 250px;
        }

        .flex-center-content {
          justify-content: center;
        }

        .doughnut-sizing {
          width: 80%;
          max-width: 280px;
        }

        .empty-chart-notice {
          font-size: 0.85rem;
          color: var(--text-muted);
          text-align: center;
          padding: 2rem;
          border: 1px dashed var(--border-light);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
          width: 100%;
        }

        .empty-state-analytics {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state-analytics h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        /* Personal Records (PR) Hall of Fame styles */
        .pr-section {
          width: 100%;
        }

        .pr-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .pr-card {
          padding: 1.5rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: all var(--transition-medium);
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          min-height: 250px;
        }

        .pr-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }

        /* Specific card variants and glow effects */
        .pr-bench {
          border-color: rgba(236, 72, 153, 0.12);
        }
        .pr-bench:hover {
          border-color: rgba(236, 72, 153, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(236, 72, 153, 0.15);
        }
        .pr-bench .pr-icon-glow {
          background: rgba(236, 72, 153, 0.1);
          color: #ec4899;
          border: 1px solid rgba(236, 72, 153, 0.25);
        }
        .pr-bench .pr-card-badge {
          background: rgba(236, 72, 153, 0.1);
          color: #ec4899;
        }

        .pr-squat {
          border-color: rgba(16, 185, 129, 0.12);
        }
        .pr-squat:hover {
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .pr-squat .pr-icon-glow {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .pr-squat .pr-card-badge {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .pr-deadlift {
          border-color: rgba(139, 92, 246, 0.12);
        }
        .pr-deadlift:hover {
          border-color: rgba(139, 92, 246, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.15);
        }
        .pr-deadlift .pr-icon-glow {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
          border: 1px solid rgba(139, 92, 246, 0.25);
        }
        .pr-deadlift .pr-card-badge {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        .pr-run:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
        }

        /* Elements styling */
        .pr-card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .pr-icon-glow {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pr-card-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
        }

        .pr-exercise-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
          margin-top: 0;
        }

        .pr-stats-area {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .pr-1rm-value {
          font-family: var(--font-sans);
          font-size: 2.15rem;
          font-weight: 900;
          color: var(--text-primary);
          line-height: 1;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: baseline;
        }

        .pr-unit {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-left: 0.25rem;
        }

        .pr-detail-pill {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          padding: 0.3rem 0.65rem;
          border-radius: 8px;
          color: var(--text-secondary);
          width: fit-content;
          margin-bottom: 0.75rem;
        }

        .pr-detail-pill.disabled {
          background: transparent;
          border-style: dashed;
          color: var(--text-muted);
        }

        .pr-date-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-bottom: auto;
        }

        .btn-pr-action {
          width: 100%;
          justify-content: space-between;
          padding: 0.5rem 0.85rem;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .btn-pr-action:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
        }

        .pr-stats-empty {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          flex: 1;
        }

        .text-2xs {
          font-size: 0.7rem;
        }

        /* Exercise Select inside Chart header */
        .exercise-chart-select {
          padding: 0.4rem 0.75rem;
          background-color: rgba(9, 10, 15, 0.8);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          max-width: 180px;
        }

        .exercise-chart-select:focus {
          outline: none;
          border-color: var(--color-primary);
        }

        /* Lifetime Stats Grid */
        .lifetime-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .stats-mini-card {
          padding: 1.25rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          transition: all var(--transition-medium);
        }

        .stats-mini-card:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.025);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .km-run:hover {
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(16, 185, 129, 0.1);
        }

        .gym-ton:hover {
          border-color: rgba(236, 72, 153, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(236, 72, 153, 0.1);
        }

        .hours-card:hover {
          border-color: rgba(14, 165, 233, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(14, 165, 233, 0.1);
        }

        .consistency-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(139, 92, 246, 0.1);
        }

        .stats-mini-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stats-mini-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .stats-mini-value {
          font-size: 1.85rem;
          font-weight: 900;
          color: var(--text-primary);
          font-family: var(--font-sans);
          line-height: 1;
        }

        .stats-mini-unit {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-muted);
          margin-left: 0.15rem;
        }

        .stats-mini-desc {
          font-size: 0.65rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* Secondary PR Cards hover effects */
        .pr-military {
          border-color: rgba(245, 158, 11, 0.12);
        }
        .pr-military:hover {
          border-color: rgba(245, 158, 11, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.15);
        }
        .pr-pullups {
          border-color: rgba(59, 130, 246, 0.12);
        }
        .pr-pullups:hover {
          border-color: rgba(59, 130, 246, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.15);
        }
        .pr-biceps {
          border-color: rgba(168, 85, 247, 0.12);
        }
        .pr-biceps:hover {
          border-color: rgba(168, 85, 247, 0.35);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.15);
        }

        /* Milestones Section */
        .milestones-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .milestone-badge-card {
          padding: 1.25rem;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-light);
          transition: all var(--transition-medium);
        }

        .milestone-badge-card.unlocked {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .milestone-badge-card.unlocked:hover {
          transform: translateY(-5px) scale(1.01);
          border-color: var(--milestone-color);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px var(--milestone-glow);
        }

        .milestone-badge-card.locked {
          filter: grayscale(0.8) opacity(0.55);
          background: rgba(0, 0, 0, 0.15);
          border-style: dashed;
        }

        .milestone-badge-glow-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 10% 10%, var(--milestone-glow) 0%, transparent 60%);
          opacity: 0;
          transition: opacity var(--transition-medium);
          pointer-events: none;
        }

        .milestone-badge-card.unlocked:hover .milestone-badge-glow-effect {
          opacity: 0.6;
        }

        .milestone-card-inner {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 2;
        }

        .milestone-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          transition: all var(--transition-medium);
        }

        .milestone-badge-card.unlocked .milestone-icon-wrapper {
          color: var(--milestone-color);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 10px var(--milestone-glow);
        }

        .milestone-badge-card.unlocked:hover .milestone-icon-wrapper {
          transform: rotate(8deg) scale(1.1);
        }

        .milestone-lock-icon {
          color: var(--text-muted);
        }

        .milestone-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .milestone-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          gap: 0.5rem;
        }

        .milestone-unlocked-tag {
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .milestone-desc {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
