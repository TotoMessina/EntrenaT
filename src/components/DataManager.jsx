import React, { useRef, useState } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Database,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  Printer,
  ArrowRight,
  ChevronRight,
  X,
  Check,
  ChevronLeft,
  FileText,
  Calendar,
  Dumbbell,
  Flame,
  Plus
} from 'lucide-react';

export default function DataManager({ 
  workouts, 
  isSupabaseConnected, 
  onConnectSupabase, 
  onDisconnectSupabase, 
  onUpdateAllWorkouts, 
  onResetMockData,
  user,
  onLogout,
  onOpenReport,
  showAlert,
  showConfirm
}) {
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);

  // --- LOCAL FORM STATES FOR SUPABASE ---
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [importMode, setImportMode] = useState('merge');
  const [showTemplateInstructions, setShowTemplateInstructions] = useState(false);

  // --- IMPORT WIZARD STATES ---
  const [csvFile, setCsvFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRawRows, setCsvRawRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [showMapper, setShowMapper] = useState(false);
  const [previewWorkouts, setPreviewWorkouts] = useState([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // --- CONNECT HANDLER ---
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setStatusMsg({ type: 'error', text: 'Por favor, ingresa tanto la URL del proyecto como la Anon Key.' });
      return;
    }
    setLoading(true);
    setStatusMsg({ type: 'info', text: 'Conectando y sincronizando con Supabase Cloud...' });
    
    const res = await onConnectSupabase(supabaseUrl.trim(), supabaseKey.trim());
    setLoading(false);
    
    if (res.success) {
      setStatusMsg({ type: 'success', text: '¡Conexión establecida con éxito! Todos tus entrenamientos se han sincronizado bidireccionalmente.' });
      setSupabaseUrl('');
      setSupabaseKey('');
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  // --- EXPORT TO JSON ---
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(workouts, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `fitanalytics_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // --- EXPORT TO CSV (Flat file for Excel/Sheets) ---
  const handleExportCSV = () => {
    const headers = [
      'Fecha', 
      'Tipo_Actividad', 
      'Nombre_Sesion_Gym', 
      'Grupo_Muscular_Gym', 
      'Ejercicio_Gym', 
      'Series_Gym', 
      'Repeticiones_Gym', 
      'Peso_kg_Gym', 
      'RPE_Gym',
      'Distancia_km_Running', 
      'Duracion_Running', 
      'Frecuencia_Cardiaca_Running', 
      'Notas_Comentarios'
    ];

    const csvRows = [headers.join(',')];

    workouts.forEach(w => {
      const date = w.date;
      const type = w.type;
      const notes = `"${(w.notes || '').replace(/"/g, '""')}"`;

      if (type === 'running') {
        const row = [
          date,
          'Running',
          '', 
          '', 
          '', 
          '', 
          '', 
          '', 
          w.rpe || '', 
          w.distance,
          w.duration,
          w.heartRate || '',
          notes
        ];
        csvRows.push(row.join(','));
      } else if (type === 'gym') {
        const sessionName = `"${(w.sessionName || '').replace(/"/g, '""')}"`;
        const muscleGroup = w.muscleGroup || '';
        
        if (w.exercises && w.exercises.length > 0) {
          w.exercises.forEach(ex => {
            const exName = `"${(ex.name || '').replace(/"/g, '""')}"`;
            const row = [
              date,
              'Gimnasio',
              sessionName,
              muscleGroup,
              exName,
              ex.sets,
              ex.reps,
              ex.weight,
              ex.rpe || '',
              '', 
              '', 
              '', 
              notes
            ];
            csvRows.push(row.join(','));
          });
        } else {
          const row = [
            date,
            'Gimnasio',
            sessionName,
            muscleGroup,
            '', '', '', '', '', '', '', '',
            notes
          ];
          csvRows.push(row.join(','));
        }
      }
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
    const downloadName = `fitanalytics_data_${new Date().toISOString().split('T')[0]}.csv`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', csvContent);
    linkElement.setAttribute('download', downloadName);
    linkElement.click();
  };

  // --- DOWNLOAD CSV TEMPLATE ---
  const handleDownloadTemplate = () => {
    const headers = [
      'Fecha', 
      'Tipo_Actividad', 
      'Nombre_Sesion_Gym', 
      'Grupo_Muscular_Gym', 
      'Ejercicio_Gym', 
      'Series_Gym', 
      'Repeticiones_Gym', 
      'Peso_kg_Gym', 
      'RPE_Gym',
      'Distancia_km_Running', 
      'Duracion_Running', 
      'Frecuencia_Cardiaca_Running', 
      'Notas_Comentarios'
    ];

    const templateRows = [
      headers.join(','),
      '2026-05-18,Gimnasio,Empuje de Pecho,Pectoral,Press de Banca,4,10,80,8,,,"Excelente contraccion, RIR 2 estimado."',
      '2026-05-18,Gimnasio,Empuje de Pecho,Pectoral,Aperturas con Mancuernas,3,12,18,7,,,"Foco en estiramiento y control."',
      '2026-05-19,Running,,,,,,,7,8.5,00:45:00,148,"Entrenamiento en Zona 2 aerobica"'
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(templateRows.join('\n'));
    const downloadName = 'fitanalytics_plantilla_entrenamientos.csv';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', csvContent);
    linkElement.setAttribute('download', downloadName);
    linkElement.click();
  };

  // --- IMPORT FROM JSON ---
  const handleImportJSON = (e) => {
    const fileReader = new FileReader();
    const file = e.target.files[0];
    
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        
        if (!Array.isArray(parsedData)) {
          throw new Error("El archivo no contiene un formato de lista válido.");
        }

        const isValid = parsedData.every(w => {
          return w.id && w.type && w.date && (w.type === 'running' || w.type === 'gym');
        });

        if (!isValid) {
          throw new Error("Algunos registros no cumplen con el formato requerido (ID, Tipo, Fecha).");
        }

        const confirmed = showConfirm
          ? await showConfirm("Importar Respaldo JSON", `Se han detectado ${parsedData.length} entrenamientos en el respaldo. ¿Deseas sobreescribir la base de datos actual?`)
          : confirm(`Se han detectado ${parsedData.length} entrenamientos en el respaldo. ¿Deseas sobreescribir la base de datos actual?`);

        if (confirmed) {
          onUpdateAllWorkouts(parsedData);
          if (showAlert) {
            await showAlert("Importación Exitosa", "¡Importación exitosa! Se han restaurado tus datos correctamente.");
          } else {
            alert("¡Importación exitosa! Se han restaurado tus datos correctamente.");
          }
        }
      } catch (error) {
        if (showAlert) {
          await showAlert("Error de Importación", `Error al importar respaldo: ${error.message}`);
        } else {
          alert(`Error al importar respaldo: ${error.message}`);
        }
      }
    };

    fileReader.readAsText(file);
    e.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // --- DRAG & DROP HANDLERS ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.csv')) {
        processCSVFile(file);
      } else {
        if (showAlert) {
          await showAlert("Archivo No Válido", "Por favor, sube un archivo en formato CSV válido (.csv).");
        } else {
          alert("Por favor, sube un archivo en formato CSV válido (.csv).");
        }
      }
    }
  };

  // --- NORMALIZE HEADER HELPER ---
  const normalizeHeader = (h) => {
    return h.replace(/^\uFEFF/, '') // Remove UTF-8 BOM explicitly
            .replace(/^"|"$/g, '')  // Remove wrapping quotes
            .toLowerCase()
            .trim()
            .replace(/[\s_]/g, '')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
  };

  // --- PROCESS CSV FILE AND LOAD HEADERS/ROWS FOR MAPPING ---
  const processCSVFile = (file) => {
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      try {
        const text = event.target.result;
        if (!text || text.trim() === '') {
          throw new Error("El archivo seleccionado está vacío.");
        }

        // Detect if it's a binary XLSX/ZIP Excel file instead of CSV
        if (text.startsWith('PK\u0003\u0004') || text.includes('Worksheets/') || text.includes('[Content_Types].xml') || text.includes('xl/')) {
          throw new Error("Has seleccionado una planilla de Excel binaria (.xlsx). Debes exportar la hoja de cálculo a formato '.CSV' (Valores separados por comas) desde Excel o Google Sheets para poder importarla de forma masiva.");
        }

        // Detect separator by scanning up to the first 15 lines
        const linesToScan = text.split('\n').slice(0, 15);
        let totalCommas = 0;
        let totalSemis = 0;
        let totalTabs = 0;
        
        linesToScan.forEach(line => {
          totalCommas += (line.match(/,/g) || []).length;
          totalSemis += (line.match(/;/g) || []).length;
          totalTabs += (line.match(/\t/g) || []).length;
        });
        
        let sep = ',';
        if (totalSemis > totalCommas && totalSemis > totalTabs) {
          sep = ';';
        } else if (totalTabs > totalCommas && totalTabs > totalSemis) {
          sep = '\t';
        }

        // Robust CSV line parser with quotes handling
        const parseCSVLines = (csvText) => {
          const lines = [];
          let row = [""];
          let inQuotes = false;

          for (let i = 0; i < csvText.length; i++) {
            const c = csvText[i];
            const next = csvText[i + 1];
            
            if (c === '"') {
              if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (c === sep && !inQuotes) {
              row.push('');
            } else if ((c === '\r' || c === '\n') && !inQuotes) {
              if (c === '\r' && next === '\n') {
                i++;
              }
              lines.push(row);
              row = [''];
            } else {
              row[row.length - 1] += c;
            }
          }
          if (row.length > 1 || row[0] !== '') {
            lines.push(row);
          }
          return lines;
        };

        const rows = parseCSVLines(text);
        if (rows.length < 2) {
          throw new Error("El archivo no contiene suficientes registros para procesar.");
        }

        // Find the actual header row
        let headerRowIndex = -1;
        for (let r = 0; r < Math.min(rows.length, 15); r++) {
          const row = rows[r];
          if (row && row.filter(val => val.trim() !== '').length >= 2) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1) {
          headerRowIndex = 0;
        }

        const headers = rows[headerRowIndex].map(h => h.trim());
        const rawRows = rows.slice(headerRowIndex + 1).filter(r => r.length > 0 && r.some(val => val.trim() !== ''));

        // Perform smart auto-mapping
        const initialMapping = {};
        const normalizedHeaders = headers.map(h => normalizeHeader(h));

        const getColIndex = (aliases) => {
          return normalizedHeaders.findIndex(h => aliases.includes(h));
        };

        initialMapping.date = getColIndex(['fecha', 'date', 'day', 'dia', 'dates', 'fechas', 'fechaentrenamiento', 'fechadeentrenamiento']);
        initialMapping.type = getColIndex(['tipoactividad', 'tipo', 'type', 'activity', 'actividad', 'workouttype', 'activitytype', 'tipodeactividad', 'tipodeentrenamiento', 'tipoentrenamiento', 'deporte', 'sport', 'categoria', 'category']);
        initialMapping.sessionName = getColIndex(['nombresesiongym', 'sesion', 'nombre', 'session', 'name', 'workout', 'sessionname', 'workoutname', 'sesiongym', 'nombresesion', 'nombredelasesion', 'nombresesiondegym']);
        initialMapping.muscleGroup = getColIndex(['grupomusculargym', 'grupomuscular', 'grupo', 'muscle', 'musclegroup', 'target', 'musculo', 'grupoactivo']);
        initialMapping.exerciseName = getColIndex(['ejerciciogym', 'ejercicio', 'exercise', 'exercisename', 'movimiento', 'movement', 'nombreejercicio', 'nombredelejercicio']);
        initialMapping.sets = getColIndex(['seriesgym', 'series', 'sets', 'seriesfuerza', 'set', 'serie']);
        initialMapping.reps = getColIndex(['repeticionesgym', 'repeticiones', 'reps', 'repeticionesfuerza', 'repeticion', 'rep']);
        initialMapping.weight = getColIndex(['pesokggym', 'peso', 'pesokg', 'weight', 'weightkg', 'carga', 'pesousado']);
        initialMapping.rpe = getColIndex(['rpegym', 'rpe', 'intensidad', 'esfuerzo', 'effort', 'rir', 'rpefuerza']);
        initialMapping.distance = getColIndex(['distanciakmrunning', 'distancia', 'distanciakm', 'distance', 'distancekm', 'dist', 'distanciakmrunning']);
        initialMapping.duration = getColIndex(['duracionrunning', 'duracion', 'duration', 'time', 'tiempo', 'tiempotranscurrido']);
        initialMapping.heartRate = getColIndex(['frecuenciacardiacarunning', 'frecuenciacardiaca', 'pulsaciones', 'hr', 'bpm', 'heartrate', 'pulse', 'promediopulsaciones']);
        initialMapping.notes = getColIndex(['notascomentarios', 'notas', 'comentarios', 'notes', 'comments', 'comentario', 'descripcion', 'description', 'nota']);

        setCsvHeaders(headers);
        setCsvRawRows(rawRows);
        setColumnMapping(initialMapping);
        setCsvFile(file);
        setShowMapper(true);
        setPreviewWorkouts([]);
        setSelectedPreviewIds(new Set());

      } catch (err) {
        if (showAlert) {
          await showAlert("Error de Archivo CSV", `Error al procesar el archivo CSV: ${err.message}`);
        } else {
          alert(`Error al procesar el archivo CSV: ${err.message}`);
        }
      }
    };
    fileReader.readAsText(file, 'utf-8');
  };

  // --- GENERATE PREVIEW FROM MAPPING ---
  const generatePreview = async () => {
    if (columnMapping.date === -1 || columnMapping.type === -1 || columnMapping.date === undefined || columnMapping.type === undefined) {
      if (showAlert) {
        await showAlert("Asociación Obligatoria", "Por favor, asocia obligatoriamente las columnas de 'Fecha' y 'Tipo de Actividad'.");
      } else {
        alert("Por favor, asocia obligatoriamente las columnas de 'Fecha' y 'Tipo de Actividad'.");
      }
      return;
    }

    // Auto-detect regional date format
    let isUSDateFormat = false;
    const dateIdx = columnMapping.date;
    for (let i = 0; i < csvRawRows.length; i++) {
      const row = csvRawRows[i];
      let rawDate = row[dateIdx] ? row[dateIdx].trim() : '';
      if (!rawDate) continue;
      let cleanDate = rawDate.split(' ')[0].trim();
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(cleanDate)) {
        const parts = cleanDate.split(/[\/\-]/);
        if (parts.length >= 2) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          if (p1 > 12 && p0 <= 12) {
            isUSDateFormat = true;
            break;
          }
          if (p0 > 12 && p1 <= 12) {
            isUSDateFormat = false;
            break;
          }
        }
      }
    }

    const parsedWorkouts = [];

    for (let i = 0; i < csvRawRows.length; i++) {
      const row = csvRawRows[i];
      if (row.length === 0 || row.every(val => val.trim() === '')) continue;

      let rawDate = row[columnMapping.date] ? row[columnMapping.date].trim() : '';
      let rawType = columnMapping.type !== -1 && row[columnMapping.type] ? row[columnMapping.type].trim().toLowerCase() : '';
      let rawSessionName = columnMapping.sessionName !== -1 && row[columnMapping.sessionName] ? row[columnMapping.sessionName].trim() : '';
      let rawMuscleGroup = columnMapping.muscleGroup !== -1 && row[columnMapping.muscleGroup] ? row[columnMapping.muscleGroup].trim() : '';
      let rawExerciseName = columnMapping.exerciseName !== -1 && row[columnMapping.exerciseName] ? row[columnMapping.exerciseName].trim() : '';
      let rawSets = columnMapping.sets !== -1 && row[columnMapping.sets] ? row[columnMapping.sets].trim() : '';
      let rawReps = columnMapping.reps !== -1 && row[columnMapping.reps] ? row[columnMapping.reps].trim() : '';
      let rawWeight = columnMapping.weight !== -1 && row[columnMapping.weight] ? row[columnMapping.weight].trim() : '';
      let rawRpe = columnMapping.rpe !== -1 && row[columnMapping.rpe] ? row[columnMapping.rpe].trim() : '';
      let rawDistance = columnMapping.distance !== -1 && row[columnMapping.distance] ? row[columnMapping.distance].trim() : '';
      let rawDuration = columnMapping.duration !== -1 && row[columnMapping.duration] ? row[columnMapping.duration].trim() : '';
      let rawHr = columnMapping.heartRate !== -1 && row[columnMapping.heartRate] ? row[columnMapping.heartRate].trim() : '';
      let rawNotes = columnMapping.notes !== -1 && row[columnMapping.notes] ? row[columnMapping.notes].trim() : '';

      if (!rawDate || !rawType) continue;

      // Date parsing
      let cleanDate = rawDate.split(' ')[0].trim();
      let isDateInvalid = false;
      
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(cleanDate)) {
        const parts = cleanDate.split(/[\/\-]/);
        const first = parts[0].padStart(2, '0');
        const second = parts[1].padStart(2, '0');
        const day = isUSDateFormat ? second : first;
        const month = isUSDateFormat ? first : second;
        const year = parts[2];
        cleanDate = `${year}-${month}-${day}`;
      } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2}$/.test(cleanDate)) {
        const parts = cleanDate.split(/[\/\-]/);
        const first = parts[0].padStart(2, '0');
        const second = parts[1].padStart(2, '0');
        const day = isUSDateFormat ? second : first;
        const month = isUSDateFormat ? first : second;
        const year = `20${parts[2]}`;
        cleanDate = `${year}-${month}-${day}`;
      } else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(cleanDate)) {
        const parts = cleanDate.split(/[\/\-]/);
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        cleanDate = `${year}-${month}-${day}`;
      }

      // Check date validity
      const timeTest = new Date(cleanDate + 'T00:00:00').getTime();
      if (isNaN(timeTest)) {
        isDateInvalid = true;
      }

      // Type normalization
      let cleanType = 'gym';
      if (rawType.includes('run') || rawType.includes('carrera') || rawType.includes('cardio')) {
        cleanType = 'running';
      }

      if (cleanType === 'running') {
        let duration = '00:30:00';
        if (rawDuration) {
          const parts = rawDuration.split(':');
          if (parts.length === 3) {
            duration = parts.map(p => p.padStart(2, '0')).join(':');
          } else if (parts.length === 2) {
            duration = `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
          } else if (!isNaN(Number(rawDuration))) {
            const mins = Number(rawDuration);
            const h = Math.floor(mins / 60);
            const m = Math.floor(mins % 60);
            duration = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
          }
        }

        // Check duplicate
        const isDuplicate = workouts.some(oldW => 
          oldW.type === 'running' && 
          oldW.date === cleanDate && 
          Math.abs((Number(oldW.distance) || 0) - (parseFloat(rawDistance) || 0)) < 0.02 &&
          oldW.duration === duration
        );

        parsedWorkouts.push({
          id: `run-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'running',
          date: cleanDate,
          distance: parseFloat(rawDistance) || 0,
          duration,
          heartRate: rawHr ? parseInt(rawHr) : null,
          rpe: rawRpe ? parseInt(rawRpe) : null,
          terrain: 'Asfalto',
          notes: rawNotes,
          isDuplicate,
          isDateInvalid
        });
      } else {
        const exercise = {
          name: rawExerciseName || 'Ejercicio',
          sets: parseInt(rawSets) || 4,
          reps: parseInt(rawReps) || 10,
          weight: parseFloat(rawWeight) || 0,
          rpe: rawRpe ? parseInt(rawRpe) : 8
        };

        const sessionName = rawSessionName || 'Entrenamiento de Fuerza';
        const muscleGroup = rawMuscleGroup || 'Full Body';

        const existingGym = parsedWorkouts.find(w => 
          w.type === 'gym' && 
          w.date === cleanDate && 
          w.sessionName.toLowerCase().trim() === sessionName.toLowerCase().trim()
        );

        if (existingGym) {
          existingGym.exercises.push(exercise);
          if (rawNotes && !existingGym.notes.includes(rawNotes)) {
            existingGym.notes = existingGym.notes ? `${existingGym.notes}\n${rawNotes}` : rawNotes;
          }
        } else {
          // Check duplicate
          const isDuplicate = workouts.some(oldW => 
            oldW.type === 'gym' && 
            oldW.date === cleanDate && 
            oldW.sessionName.toLowerCase().trim() === sessionName.toLowerCase().trim()
          );

          parsedWorkouts.push({
            id: `gym-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'gym',
            date: cleanDate,
            sessionName,
            muscleGroup,
            exercises: [exercise],
            notes: rawNotes,
            isDuplicate,
            isDateInvalid
          });
        }
      }
    }

    if (parsedWorkouts.length === 0) {
      if (showAlert) {
        await showAlert("Error de Parseo", "No se lograron parsear registros válidos. Verifica el mapeo de columnas.");
      } else {
        alert("No se lograron parsear registros válidos. Verifica el mapeo de columnas.");
      }
      return;
    }

    // Initialize selection: select non-duplicates and non-invalid dates
    const initialSelected = new Set(
      parsedWorkouts
        .filter(w => !w.isDuplicate && !w.isDateInvalid)
        .map(w => w.id)
    );

    setPreviewWorkouts(parsedWorkouts);
    setSelectedPreviewIds(initialSelected);
    setShowMapper(false);
  };

  // --- CONFIRM AND SAVE IMPORT ---
  const handleConfirmImport = async () => {
    if (selectedPreviewIds.size === 0) {
      if (showAlert) {
        await showAlert("Ningún Entrenamiento Seleccionado", "Por favor, selecciona al menos un entrenamiento para importar.");
      } else {
        alert("Por favor, selecciona al menos un entrenamiento para importar.");
      }
      return;
    }

    const workoutsToImport = previewWorkouts.filter(w => selectedPreviewIds.has(w.id));
    
    // Clean up preview-only fields
    const cleanedWorkouts = workoutsToImport.map(w => {
      const { isDuplicate, isDateInvalid, ...rest } = w;
      return rest;
    });

    let mergedList = [];
    if (importMode === 'overwrite') {
      mergedList = cleanedWorkouts;
    } else {
      // Merge mode
      mergedList = [...workouts, ...cleanedWorkouts];
    }

    // Sort descending chronologically
    mergedList.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));

    onUpdateAllWorkouts(mergedList);
    
    if (showAlert) {
      await showAlert("Carga Masiva Exitosa", `¡Carga masiva completada con éxito! Se han importado ${cleanedWorkouts.length} entrenamientos.`);
    } else {
      alert(`¡Carga masiva completada con éxito! Se han importado ${cleanedWorkouts.length} entrenamientos.`);
    }
    resetWizard();
  };

  // --- RESET WIZARD STATE ---
  const resetWizard = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRawRows([]);
    setColumnMapping({});
    setShowMapper(false);
    setPreviewWorkouts([]);
    setSelectedPreviewIds(new Set());
  };

  // --- CLEAR DATABASE ---
  const handleClearData = async () => {
    const confirmed = showConfirm
      ? await showConfirm("🚨 ATENCIÓN", "Estás a punto de borrar TODOS tus entrenamientos permanentemente. Esta acción no se puede deshacer. ¿Seguro que deseas continuar?")
      : confirm("🚨 ATENCIÓN: Estás a punto de borrar TODOS tus entrenamientos permanentemente. Esta acción no se puede deshacer. ¿Seguro que deseas continuar?");
      
    if (confirmed) {
      const confirmFinal = showConfirm
        ? await showConfirm("Confirmación Final", "Por favor confirma una última vez para eliminar la base de datos.")
        : confirm("Por favor confirma una última vez para eliminar la base de datos.");
        
      if (confirmFinal) {
        onUpdateAllWorkouts([]);
        if (showAlert) {
          await showAlert("Datos Borrados", "Todos los datos han sido borrados.");
        } else {
          alert("Todos los datos han sido borrados.");
        }
      }
    }
  };

  // Standard Fields for the Mapping Step
  const standardFields = [
    { key: 'date', label: 'Fecha (Obligatorio)', desc: 'Fecha del entrenamiento (ej. YYYY-MM-DD)', required: true },
    { key: 'type', label: 'Tipo de Actividad (Obligatorio)', desc: 'Running o Gimnasio/Fuerza', required: true },
    { key: 'sessionName', label: 'Nombre de Sesión (Gimnasio)', desc: 'Ej. "Empuje de Pecho", "Día de Piernas"' },
    { key: 'muscleGroup', label: 'Grupo Muscular (Gimnasio)', desc: 'Ej. "Pectoral", "Espalda", "Piernas"' },
    { key: 'exerciseName', label: 'Nombre de Ejercicio (Gimnasio)', desc: 'Ej. "Press de Banca", "Sentadillas"' },
    { key: 'sets', label: 'Series (Gimnasio)', desc: 'Número entero de series' },
    { key: 'reps', label: 'Repeticiones (Gimnasio)', desc: 'Número entero de repeticiones' },
    { key: 'weight', label: 'Peso en kg (Gimnasio)', desc: 'Peso utilizado (ej. 82.5)' },
    { key: 'rpe', label: 'Escala RPE', desc: 'Esfuerzo del 1 al 10' },
    { key: 'distance', label: 'Distancia km (Running)', desc: 'Kilómetros corridos' },
    { key: 'duration', label: 'Duración (Running)', desc: 'Duración en formato HH:MM:SS' },
    { key: 'heartRate', label: 'Frecuencia Cardíaca (Running)', desc: 'Pulsaciones en bpm' },
    { key: 'notes', label: 'Notas y Comentarios', desc: 'Notas libres u observaciones' }
  ];

  return (
    <div className="data-container fade-in">
      <header className="data-header">
        <div>
          <h1 className="gradient-text text-3xl font-extrabold flex-center">
            <Database size={26} style={{ color: 'var(--color-primary)' }} />
            Respaldos y Administración
          </h1>
          <p className="text-secondary text-sm">Gestiona la base de datos de tus entrenamientos. Sincroniza tus progresos en la nube o expórtalos en formatos JSON y CSV.</p>
        </div>
      </header>

      {/* --- WIZARD TAKE-OVER RENDER --- */}
      {(showMapper || previewWorkouts.length > 0) ? (
        <div className="glass-card import-wizard-takeover fade-in">
          
          {/* STEP 1: COLUMN MAPPER PANEL */}
          {showMapper && (
            <div className="wizard-step">
              <div className="wizard-step-header mb-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="step-badge">Paso 1 de 2</span>
                    <h2 className="step-title">Mapeador Interactivo de Columnas</h2>
                    <p className="text-secondary text-xs">Asocia los campos de FitAnalytics con las columnas encontradas en tu archivo CSV.</p>
                  </div>
                  <div className="text-xs text-secondary font-semibold" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    Archivo: <code style={{ color: 'var(--color-primary)' }}>{csvFile?.name}</code> ({Math.round(csvFile?.size / 1024)} KB)
                  </div>
                </div>
              </div>
              
              <div className="wizard-grid">
                {/* Left Column: Dropdowns */}
                <div className="mapper-fields-grid scrollable-fields">
                  {standardFields.map(field => {
                    const mappedIdx = columnMapping[field.key];
                    const isMapped = mappedIdx !== undefined && mappedIdx !== -1;
                    const isError = field.required && !isMapped;
                    
                    return (
                      <div key={field.key} className={`mapper-field-card ${isError ? 'field-error' : isMapped ? 'field-success' : ''}`}>
                        <div className="field-info">
                          <span className="field-label">{field.label}</span>
                          <span className="field-desc">{field.desc}</span>
                        </div>
                        <select
                          value={mappedIdx !== undefined ? mappedIdx : -1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setColumnMapping(prev => ({
                              ...prev,
                              [field.key]: val
                            }));
                          }}
                          className="mapper-select"
                        >
                          <option value={-1}>-- Omitir / No en CSV --</option>
                          {csvHeaders.map((header, idx) => (
                            <option key={idx} value={idx}>
                              Columna {idx}: {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
                
                {/* Right Column: File Headers Info & Sample values */}
                <div className="csv-headers-preview-box">
                  <h3 className="preview-box-title flex-center" style={{ gap: '6px' }}>
                    <FileText size={16} /> Columnas en tu archivo CSV
                  </h3>
                  <p className="text-secondary text-2xs mb-3">Revisa las columnas encontradas en el archivo y sus datos muestra para guiar tu mapeo:</p>
                  
                  <div className="scrollable-headers-list">
                    {csvHeaders.map((header, idx) => {
                      const mappedTo = Object.keys(columnMapping).find(k => columnMapping[k] === idx);
                      const standardField = mappedTo ? standardFields.find(f => f.key === mappedTo) : null;
                      
                      return (
                        <div key={idx} className={`header-preview-item ${standardField ? 'header-mapped' : ''}`}>
                          <div className="header-name-row">
                            <span className="header-index">#{idx}</span>
                            <span className="header-name">{header}</span>
                          </div>
                          <div className="header-value-row">
                            <span className="value-label">Muestra:</span>
                            <span className="value-sample">"{csvRawRows[0]?.[idx] || 'N/A'}"</span>
                          </div>
                          {standardField && (
                            <div className="mapping-badge">
                              <Check size={10} /> Mapeado a: {standardField.label.split(' ')[0]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="wizard-footer-actions mt-6">
                <button className="btn btn-secondary flex-center" onClick={resetWizard}>
                  <X size={16} /> Cancelar Carga
                </button>
                <button className="btn btn-running flex-center ml-auto" onClick={generatePreview}>
                  <span>Siguiente: Previsualizar Registros</span> <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SPREADSHEET ROW PREVIEWER */}
          {previewWorkouts.length > 0 && !showMapper && (
            <div className="wizard-step">
              <div className="wizard-step-header mb-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="step-badge">Paso 2 de 2</span>
                    <h2 className="step-title">Spreadsheet Row Previewer</h2>
                    <p className="text-secondary text-xs">Hemos procesado {previewWorkouts.length} entrenamientos. Revisa los datos y selecciona cuáles deseas guardar.</p>
                  </div>
                  <div className="text-xs text-secondary font-semibold" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                    Seleccionados para Importar: <strong className="running-text" style={{ fontSize: '1rem', marginLeft: '4px' }}>{selectedPreviewIds.size} / {previewWorkouts.length}</strong>
                  </div>
                </div>
              </div>
              
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={previewWorkouts.length > 0 && selectedPreviewIds.size === previewWorkouts.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPreviewIds(new Set(previewWorkouts.map(w => w.id)));
                            } else {
                              setSelectedPreviewIds(new Set());
                            }
                          }}
                          style={{ accentColor: 'var(--color-running)', transform: 'scale(1.15)', cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ width: '120px' }}>Fecha</th>
                      <th style={{ width: '100px' }}>Tipo</th>
                      <th>Detalles del Entrenamiento</th>
                      <th>Notas / Comentarios</th>
                      <th style={{ width: '180px', textAlign: 'right' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewWorkouts.map((w) => {
                      const isSelected = selectedPreviewIds.has(w.id);
                      const isGym = w.type === 'gym';
                      
                      return (
                        <tr key={w.id} className={`preview-row ${isSelected ? 'row-selected' : ''} ${w.isDuplicate ? 'row-duplicate' : ''} ${w.isDateInvalid ? 'row-invalid' : ''}`}>
                          <td style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const next = new Set(selectedPreviewIds);
                                if (e.target.checked) {
                                  next.add(w.id);
                                } else {
                                  next.delete(w.id);
                                }
                                setSelectedPreviewIds(next);
                              }}
                              style={{ accentColor: 'var(--color-running)', transform: 'scale(1.15)', cursor: 'pointer' }}
                            />
                          </td>
                          <td>
                            <span className="preview-date-text">{w.date}</span>
                          </td>
                          <td>
                            <span className={`badge ${isGym ? 'badge-gym' : 'badge-running'}`} style={{ fontSize: '0.65rem' }}>
                              {isGym ? 'Gym' : 'Running'}
                            </span>
                          </td>
                          <td>
                            <div className="workout-preview-info">
                              {isGym ? (
                                <div>
                                  <strong className="text-primary" style={{ color: 'var(--color-primary)' }}>{w.sessionName}</strong> <span className="text-secondary text-2xs">({w.muscleGroup})</span>
                                  <div className="preview-exercises-list text-2xs text-muted mt-1" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {w.exercises?.map((ex, exIdx) => (
                                      <span key={exIdx} className="preview-exercise-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                                        🏋️ {ex.name}: {ex.sets}x{ex.reps} @ {ex.weight}kg
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  🏃 <strong className="running-text" style={{ color: 'var(--color-running)' }}>{w.distance.toFixed(2)} km</strong> en <span className="text-primary font-bold">{w.duration}</span>
                                  {w.heartRate && <span className="text-secondary text-2xs ml-2">❤️ {w.heartRate} bpm</span>}
                                  {w.rpe && <span className="text-2xs ml-2" style={{ color: 'var(--color-primary)' }}>⚡ RPE {w.rpe}</span>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="notes-preview-text" title={w.notes}>{w.notes || '—'}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {w.isDateInvalid ? (
                              <span className="preview-status-badge badge-invalid">❌ Fecha Inválida</span>
                            ) : w.isDuplicate ? (
                              <span className="preview-status-badge badge-warning">⚠️ Duplicado Omitido</span>
                            ) : (
                              <span className="preview-status-badge badge-success">✓ Listo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="wizard-footer-actions mt-6">
                <button className="btn btn-secondary flex-center" onClick={() => setShowMapper(true)}>
                  <ChevronLeft size={16} /> Volver a Mapear
                </button>
                <button className="btn btn-danger flex-center ml-4" onClick={resetWizard}>
                  <X size={16} /> Cancelar Carga
                </button>
                
                <div className="import-mode-selector-wizard ml-auto mr-4 flex items-center gap-3">
                  <span className="text-xs text-secondary font-bold" style={{ color: 'var(--text-secondary)' }}>Modo de Importación:</span>
                  <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.35rem 0.75rem' }}>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ margin: 0 }}>
                      <input 
                        type="radio" 
                        name="wizard-import-mode" 
                        value="merge" 
                        checked={importMode === 'merge'} 
                        onChange={() => setImportMode('merge')} 
                        style={{ accentColor: 'var(--color-running)' }}
                      />
                      <span>Combinar</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ margin: 0 }}>
                      <input 
                        type="radio" 
                        name="wizard-import-mode" 
                        value="overwrite" 
                        checked={importMode === 'overwrite'} 
                        onChange={() => setImportMode('overwrite')}
                        style={{ accentColor: 'var(--color-running)' }}
                      />
                      <span>Sobrescribir</span>
                    </label>
                  </div>
                </div>
                
                <button className="btn btn-running flex-center" onClick={handleConfirmImport} disabled={selectedPreviewIds.size === 0}>
                  <Check size={16} />
                  <span>Importar Seleccionados ({selectedPreviewIds.size})</span>
                </button>
              </div>
            </div>
          )}

        </div>
      ) : (
        <>
          {/* --- SUPABASE CONFIGURATION CARD --- */}
          <div className="glass-card supabase-config-card mb-6">
            <h2 className="section-subtitle flex-center">
              <Database size={20} style={{ color: 'var(--color-primary)' }} />
              Sincronización en la Nube (Supabase Cloud Sync)
            </h2>
            <p className="text-secondary text-xs mt-1 mb-4 leading-relaxed">
              Persiste tus progresos deportivos en tiempo real en una base de datos Postgres de <strong>Supabase</strong>. 
              Esto asegura la persistencia indestructible de tus datos y te permite acceder a tu historial desde cualquier navegador.
            </p>

            {isSupabaseConnected ? (
              <div className="supabase-connected-status fade-in">
                <div className="status-header-row">
                  <CheckCircle size={28} className="running-text" style={{ color: 'var(--color-running)' }} />
                  <div>
                    <h4 className="status-card-title">Sincronización Activa</h4>
                    <p className="text-secondary text-xs">Multi-inquilino activado con políticas de seguridad (RLS) en tiempo real.</p>
                  </div>
                </div>
                <div className="status-details-block text-xs mt-3">
                  {user && (
                    <div className="user-profile-sync mb-3">
                      <div className="flex items-center gap-3">
                        <div className="sync-avatar">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary" style={{ color: 'var(--color-primary)', margin: 0 }}>{user.email}</p>
                          <p className="text-2xs" style={{ margin: 0 }}>Identificador único: <code className="text-2xs">{user.id}</code></p>
                        </div>
                      </div>
                    </div>
                  )}
                  <p><strong>Servidor:</strong> <code>{localStorage.getItem('fitanalytics_supabase_url')}</code></p>
                  <p><strong>Rol de RLS:</strong> <span className="badge badge-running">Propietario / Aislado</span></p>
                </div>
                <div className="flex gap-2 mt-4">
                  {user && (
                    <button className="btn btn-gym text-xs" style={{ padding: '0.5rem 1rem' }} onClick={onLogout}>
                      Cerrar Sesión
                    </button>
                  )}
                  <button className="btn btn-danger text-xs" style={{ padding: '0.5rem 1rem' }} onClick={onDisconnectSupabase}>
                    Desvincular Proyecto
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnect} className="supabase-config-form fade-in">
                <div className="form-row-grid">
                  <div className="form-group">
                    <label className="form-label">Supabase Project URL</label>
                    <input 
                      type="url" 
                      placeholder="https://your-project-id.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="form-input"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supabase Anon Key (Public Key)</label>
                    <input 
                      type="password" 
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="form-input"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {statusMsg.text && (
                  <div className={`status-feedback-alert ${statusMsg.type}`}>
                    <p>{statusMsg.text}</p>
                  </div>
                )}

                <div className="form-actions-row">
                  <button type="submit" className="btn btn-primary text-sm flex-center" disabled={loading}>
                    {loading ? 'Conectando...' : 'Conectar y Sincronizar'}
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => setShowSql(!showSql)} 
                    className="btn btn-secondary text-xs flex-center"
                  >
                    <span>{showSql ? 'Ocultar Script SQL' : 'Ver Script SQL para Supabase'}</span>
                  </button>
                </div>

                {showSql && (
                  <div className="sql-instruction-block mt-4 fade-in">
                    <p className="text-secondary text-xs mb-2">
                      <strong>Instrucción obligatoria de Multi-inquilino:</strong> Copia y ejecuta este script en el <strong>SQL Editor</strong> de tu proyecto de Supabase para actualizar la tabla de entrenamientos y configurar las políticas de seguridad a nivel de fila (RLS):
                    </p>
                    <pre className="sql-code-snippet">
{`-- 1. Crear la tabla workouts con clave primaria compuesta para evitar conflictos de ID entre usuarios
create table if not exists workouts (
  id text not null,
  user_id uuid references auth.users(id) default auth.uid() not null,
  type text not null,
  date text not null,
  distance numeric,
  duration text,
  terrain text,
  "heartRate" integer,
  rpe integer,
  notes text,
  "muscleGroup" text,
  "sessionName" text,
  exercises jsonb,
  gpx_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

-- MIGRACIÓN IMPORTANTE (EJECUTAR EN TU SQL EDITOR SI YA CREASTE LA TABLA ANTES):
-- Si tu tabla ya existe y te arroja error 403 / "violates row-level security policy", 
-- es porque el ID de los datos de prueba (ej: '1', '2', '3') ya existe en la base de datos cargada por otro usuario.
-- Ejecuta este script de migración para convertir tu clave primaria a una clave compuesta (id, user_id):
--
-- delete from workouts where user_id is null;
-- alter table workouts drop constraint if exists workouts_pkey;
-- alter table workouts alter column user_id set not null;
-- alter table workouts add constraint workouts_pkey primary key (id, user_id);

-- 2. Eliminar políticas antiguas si existen para evitar errores
drop policy if exists "Permitir lectura y escritura publica" on workouts;
drop policy if exists "Usuarios pueden ver sus propios entrenamientos" on workouts;
drop policy if exists "Usuarios pueden insertar sus propios entrenamientos" on workouts;
drop policy if exists "Usuarios pueden actualizar sus propios entrenamientos" on workouts;
drop policy if exists "Usuarios pueden borrar sus propios entrenamientos" on workouts;

-- 3. Habilitar la seguridad a nivel de fila (RLS)
alter table workouts enable row level security;

-- 4. Crear políticas de seguridad restrictivas para aislar datos por usuario
create policy "Usuarios pueden ver sus propios entrenamientos" 
  on workouts for select 
  using (auth.uid() = user_id);
   
create policy "Usuarios pueden insertar sus propios entrenamientos" 
  on workouts for insert 
  with check (auth.uid() = user_id);
   
create policy "Usuarios pueden actualizar sus propios entrenamientos" 
  on workouts for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
   
create policy "Usuarios pueden borrar sus propios entrenamientos" 
  on workouts for delete 
  using (auth.uid() = user_id);

-- 5. Crear la tabla nutrition para el registro de comidas y macronutrientes
create table if not exists nutrition (
  id text not null,
  user_id uuid references auth.users(id) default auth.uid() not null,
  date text not null,
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fat integer not null,
  meals jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

-- 6. Habilitar RLS en la tabla nutrition
alter table nutrition enable row level security;

-- 7. Políticas de aislamiento para la tabla nutrition
create policy "Usuarios pueden ver su propia nutricion" 
  on nutrition for select 
  using (auth.uid() = user_id);
   
create policy "Usuarios pueden insertar su propia nutricion" 
  on nutrition for insert 
  with check (auth.uid() = user_id);
   
create policy "Usuarios pueden actualizar su propia nutricion" 
  on nutrition for update 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
   
create policy "Usuarios pueden borrar su propia nutricion" 
  on nutrition for delete 
  using (auth.uid() = user_id);`}
                    </pre>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* CSV Import Instructions Box */}
          {showTemplateInstructions && (
            <div className="glass-card instructions-overlay mb-6 fade-in" style={{
              border: '1px dashed rgba(16, 185, 129, 0.3)',
              background: 'rgba(16, 185, 129, 0.03)',
              padding: '1.5rem',
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 className="font-bold text-sm text-primary flex-center" style={{ color: 'var(--color-running)', margin: 0, gap: '6px', fontSize: '1rem' }}>
                  <FileSpreadsheet size={18} /> Columnas admitidas para Carga Masiva (.CSV)
                </h4>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowTemplateInstructions(false)}
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                >
                  Cerrar
                </button>
              </div>
              <p className="text-secondary text-xs mb-3 leading-relaxed">
                Crea una hoja en Excel o Google Sheets con los siguientes encabezados en la primera fila (no distingue mayúsculas/acentos y el orden es libre). Luego, guarda como archivo <strong>CSV (separado por comas o punto y coma)</strong> y súbelo.
              </p>
              <div style={{ maxHeight: '180px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.75rem' }}>
                <table className="instructions-table" style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                      <th style={{ textAlign: 'left', padding: '0.4rem', fontWeight: 'bold' }}>Columna</th>
                      <th style={{ textAlign: 'left', padding: '0.4rem', fontWeight: 'bold' }}>Requerido</th>
                      <th style={{ textAlign: 'left', padding: '0.4rem', fontWeight: 'bold' }}>Formato / Ejemplo</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: 'var(--text-secondary)' }}>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Fecha</td>
                      <td style={{ padding: '0.4rem' }}>Sí</td>
                      <td style={{ padding: '0.4rem' }}>Fecha (ej: <code>YYYY-MM-DD</code> o <code>DD/MM/YYYY</code>).</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Tipo_Actividad</td>
                      <td style={{ padding: '0.4rem' }}>Sí</td>
                      <td style={{ padding: '0.4rem' }}>Escribe <code>Running</code> o <code>Gimnasio</code>.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Nombre_Sesion_Gym</td>
                      <td style={{ padding: '0.4rem' }}>No (Fuerza)</td>
                      <td style={{ padding: '0.4rem' }}>Nombre del bloque (ej: <code>Empuje de Pecho</code>). Agrupa filas.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Grupo_Muscular_Gym</td>
                      <td style={{ padding: '0.4rem' }}>No (Fuerza)</td>
                      <td style={{ padding: '0.4rem' }}>Ej: <code>Pectoral</code>, <code>Pierna</code>, <code>Espalda</code>, <code>Hombros</code>.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Ejercicio_Gym</td>
                      <td style={{ padding: '0.4rem' }}>No (Fuerza)</td>
                      <td style={{ padding: '0.4rem' }}>Nombre del ejercicio (ej: <code>Press de Banca</code>).</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Series_Gym</td>
                      <td style={{ padding: '0.4rem' }}>No (Fuerza)</td>
                      <td style={{ padding: '0.4rem' }}>Series como entero (ej: <code>4</code>).</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Repeticiones_Gym</td>
                      <td style={{ padding: '0.4rem' }}>No (Fuerza)</td>
                      <td style={{ padding: '0.4rem' }}>Repeticiones como entero (ej: <code>10</code>).</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Peso_kg_Gym</td>
                      <td style={{ padding: '0.4rem' }}>No (Fuerza)</td>
                      <td style={{ padding: '0.4rem' }}>Peso en kg (ej: <code>75.5</code>).</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>RPE_Gym</td>
                      <td style={{ padding: '0.4rem' }}>No</td>
                      <td style={{ padding: '0.4rem' }}>Esfuerzo 1 al 10. Se autotraduce a RIR en fuerza.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Distancia_km_Running</td>
                      <td style={{ padding: '0.4rem' }}>No (Cardio)</td>
                      <td style={{ padding: '0.4rem' }}>Distancia en kilómetros (ej: <code>8.40</code>).</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Duracion_Running</td>
                      <td style={{ padding: '0.4rem' }}>No (Cardio)</td>
                      <td style={{ padding: '0.4rem' }}>Ej: <code>00:45:00</code> o número entero de minutos (ej: <code>45</code>).</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Frecuencia_Cardiaca_Running</td>
                      <td style={{ padding: '0.4rem' }}>No (Cardio)</td>
                      <td style={{ padding: '0.4rem' }}>Pulsaciones promedio en bpm (ej: <code>152</code>).</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.4rem', fontWeight: 'bold' }}>Notas_Comentarios</td>
                      <td style={{ padding: '0.4rem' }}>No</td>
                      <td style={{ padding: '0.4rem' }}>Observaciones o comentarios libres.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '0.65rem', textAlign: 'right' }}>
                <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>💡 Tip: Las múltiples filas del mismo día para fuerza se consolidan automáticamente en una sola sesión para simplificar tu historial.</span>
              </div>
            </div>
          )}

          {/* --- LOCAL BACKUPS GRID --- */}
          <div className="data-cards-grid">
            
            {/* Card: Export JSON */}
            <div className="glass-card admin-card">
              <div className="admin-card-icon-wrapper export-icon-bg">
                <Download size={24} className="text-primary" style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="admin-card-content">
                <h3 className="admin-card-title">Respaldar Datos (JSON)</h3>
                <p className="text-muted text-xs leading-relaxed mb-4">
                  Descarga una copia completa de seguridad de tu historial. Este archivo contiene la estructura nativa exacta del dashboard y puede ser importado en cualquier momento para restaurar tus progresos.
                </p>
                <button className="btn btn-primary flex-center" onClick={handleExportJSON}>
                  <Download size={16} />
                  <span>Exportar JSON</span>
                </button>
              </div>
            </div>

            {/* Card: Export CSV */}
            <div className="glass-card admin-card">
              <div className="admin-card-icon-wrapper csv-icon-bg">
                <FileSpreadsheet size={24} className="running-text" style={{ color: 'var(--color-running)' }} />
              </div>
              <div className="admin-card-content">
                <h3 className="admin-card-title">Hoja de Cálculo (CSV)</h3>
                <p className="text-muted text-xs leading-relaxed mb-4">
                  Exporta tus datos a un archivo de valores separados por comas (CSV). La estructura anidada de series de gimnasio se aplana automáticamente en filas individuales para facilitar su importación en <strong>Microsoft Excel</strong> o <strong>Google Sheets</strong>.
                </p>
                <button className="btn btn-running flex-center" onClick={handleExportCSV}>
                  <FileSpreadsheet size={16} />
                  <span>Descargar CSV</span>
                </button>
              </div>
            </div>

            {/* Card: Printable PDF Report */}
            <div className="glass-card admin-card">
              <div className="admin-card-icon-wrapper" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                <Printer size={24} className="text-primary" style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="admin-card-content">
                <h3 className="admin-card-title">Ficha Física / Reportes PDF</h3>
                <p className="text-muted text-xs leading-relaxed mb-4">
                  Genera e imprime un dossier estético premium con tus estadísticas mensuales de fuerza (1RM), kilometraje acumulado, medallas desbloqueadas y recomendaciones médicas automáticas. Listo para presentar a tu entrenador o nutricionista.
                </p>
                <button className="btn btn-primary flex-center" onClick={onOpenReport}>
                  <Printer size={16} />
                  <span>Generar Ficha Física</span>
                </button>
              </div>
            </div>

            {/* Card: Import JSON */}
            <div className="glass-card admin-card">
              <div className="admin-card-icon-wrapper import-icon-bg">
                <Upload size={24} className="gym-text" style={{ color: 'var(--color-gym)' }} />
              </div>
              <div className="admin-card-content">
                <h3 className="admin-card-title">Restaurar Respaldo JSON</h3>
                <p className="text-muted text-xs leading-relaxed mb-4">
                  Sube tu archivo de respaldo anterior (.json) para restaurar todo tu historial de running y gimnasio. Esta acción reemplazará la base de datos actual del navegador con los datos contenidos en el archivo.
                </p>
                
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportJSON}
                  style={{ display: 'none' }}
                />
                
                <button className="btn btn-gym flex-center" onClick={triggerFileInput}>
                  <Upload size={16} />
                  <span>Cargar Backup JSON</span>
                </button>
              </div>
            </div>

            {/* Redesigned Card: Import CSV / Excel with Drag & Drop Zone */}
            <div className="glass-card admin-card large-admin-card">
              <div className="admin-card-content" style={{ gap: '1rem' }}>
                <div>
                  <h3 className="admin-card-title flex-center" style={{ gap: '8px', color: 'var(--color-running)' }}>
                    <FileSpreadsheet size={22} />
                    Centro de Importación y Carga Masiva (CSV / Excel)
                  </h3>
                  <p className="text-muted text-xs leading-relaxed">
                    Importa tus entrenamientos de forma masiva desde una planilla de Excel o Google Sheets. Guarda tu archivo en formato <strong>.CSV</strong> y arrástralo aquí. Soporta cualquier orden y nombre de columnas mediante nuestro mapeador dinámico.
                  </p>
                </div>

                <div 
                  className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => csvInputRef.current.click()}
                >
                  <Upload size={32} className="drag-drop-icon" />
                  <p className="drag-drop-text">Arrastra y suelta tu archivo CSV aquí, o <span className="highlight-text">haz clic para explorar</span></p>
                  <p className="drag-drop-subtext">Excel exportado a CSV, plantillas Garmin, Strava o personalizadas</p>
                </div>

                <input
                  type="file"
                  accept=".csv"
                  ref={csvInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) processCSVFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
                
                <div className="flex-buttons-row-end">
                  <button 
                    type="button"
                    className="btn btn-secondary flex-center text-xs" 
                    onClick={handleDownloadTemplate}
                    style={{ padding: '0.5rem 0.75rem' }}
                    title="Descargar plantilla CSV oficial de ejemplo"
                  >
                    <Download size={14} style={{ color: 'var(--color-running)' }} />
                    <span>Descargar Plantilla CSV</span>
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary flex-center text-xs" 
                    onClick={() => setShowTemplateInstructions(!showTemplateInstructions)}
                    style={{ padding: '0.5rem 0.75rem' }}
                  >
                    <span>{showTemplateInstructions ? 'Ocultar Guía' : 'Ver Columnas de Referencia'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card: Maintenance */}
            <div className="glass-card admin-card danger-card">
              <div className="admin-card-icon-wrapper danger-icon-bg">
                <AlertTriangle size={24} className="text-danger" style={{ color: '#ef4444' }} />
              </div>
              <div className="admin-card-content">
                <h3 className="admin-card-title" style={{ color: '#ef4444' }}>Zona de Peligro</h3>
                <p className="text-muted text-xs leading-relaxed mb-4">
                  Acciones de mantenimiento destructivas. Puedes limpiar por completo la base de datos local o re-cargar los datos simulados de demostración si deseas reiniciar y ver las estadísticas de ejemplo.
                </p>
                <div className="flex-buttons-row">
                  <button className="btn btn-secondary flex-center text-xs" onClick={onResetMockData} title="Carga datos semilla de ejemplo para ver gráficos">
                    <RotateCcw size={14} />
                    <span>Restablecer Demo</span>
                  </button>
                  <button className="btn btn-danger flex-center text-xs" onClick={handleClearData} title="Borra todo permanentemente">
                    <Trash2 size={14} />
                    <span>Borrar Todo</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      <style>{`
        .data-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .data-header {
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

        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }

        /* Supabase config card styling */
        .supabase-config-card {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(139, 92, 246, 0.02);
          padding: 1.75rem;
        }

        .section-subtitle {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          gap: 0.5rem;
          justify-content: flex-start;
          margin: 0;
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .form-row-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-actions-row {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-top: 1.25rem;
          flex-wrap: wrap;
        }

        .status-feedback-alert {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-top: 1rem;
        }

        .status-feedback-alert.error {
          background-color: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .status-feedback-alert.info {
          background-color: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.25);
        }

        .status-feedback-alert.success {
          background-color: rgba(16, 185, 129, 0.1);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .supabase-connected-status {
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          background: rgba(16, 185, 129, 0.02);
        }

        .user-profile-sync {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.85rem;
          border-radius: 10px;
          margin-bottom: 0.85rem;
        }

        .sync-avatar {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--color-primary), #6d28d9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .text-2xs {
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        .flex {
          display: flex;
        }

        .items-center {
          align-items: center;
        }

        .gap-3 {
          gap: 0.75rem;
        }

        .gap-2 {
          gap: 0.5rem;
        }

        .status-header-row {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .status-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .status-details-block {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-light);
          padding: 0.85rem 1rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .status-details-block code {
          background: rgba(255, 255, 255, 0.05);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          color: var(--color-primary);
          word-break: break-all;
        }

        .mt-4 { margin-top: 1rem; }
        .mt-3 { margin-top: 0.75rem; }
        .font-bold { font-weight: 700; }
        .text-lg { font-size: 1.1rem; }

        .sql-instruction-block {
          background: rgba(9, 10, 15, 0.95);
          border: 1px solid var(--border-light);
          padding: 1.25rem;
          border-radius: 10px;
        }

        .sql-code-snippet {
          background: rgba(0, 0, 0, 0.4);
          padding: 0.85rem;
          border-radius: 6px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.75rem;
          color: #a78bfa;
          overflow-x: auto;
          line-height: 1.4;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        /* Grid */
        .data-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 1.5rem;
        }

        .admin-card {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          align-items: flex-start;
          min-height: 250px;
        }

        .large-admin-card {
          border-color: rgba(16, 185, 129, 0.15);
          background: rgba(16, 185, 129, 0.01);
          grid-column: span 2;
          min-height: auto;
        }

        .flex-buttons-row-end {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          width: 100%;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .large-admin-card:hover {
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.08);
        }

        .danger-card {
          border-color: rgba(239, 68, 68, 0.15);
        }

        .danger-card:hover {
          border-color: rgba(239, 68, 68, 0.35);
          box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(239, 68, 68, 0.1);
        }

        .admin-card-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .export-icon-bg {
          background-color: rgba(139, 92, 246, 0.1);
        }

        .csv-icon-bg {
          background-color: rgba(16, 185, 129, 0.1);
        }

        .import-icon-bg {
          background-color: rgba(236, 72, 153, 0.1);
        }

        .danger-icon-bg {
          background-color: rgba(239, 68, 68, 0.1);
        }

        .admin-card-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .admin-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .flex-buttons-row {
          display: flex;
          gap: 0.75rem;
          margin-top: auto;
          flex-wrap: wrap;
        }

        /* --- DRAG & DROP ZONE CYBERPUNK --- */
        .drag-drop-zone {
          border: 2px dashed rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.02);
          border-radius: 12px;
          padding: 2rem 1.5rem;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          transition: all 0.3s ease;
          position: relative;
        }

        .drag-drop-zone:hover, .drag-drop-zone.dragging {
          border-color: var(--color-running);
          background: rgba(16, 185, 129, 0.06);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.12);
        }

        .drag-drop-icon {
          color: rgba(16, 185, 129, 0.6);
          transition: transform 0.3s ease, color 0.3s ease;
        }

        .drag-drop-zone:hover .drag-drop-icon, .drag-drop-zone.dragging .drag-drop-icon {
          transform: translateY(-4px) scale(1.05);
          color: var(--color-running);
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.4));
        }

        .drag-drop-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .highlight-text {
          color: var(--color-running);
          text-decoration: underline;
        }

        .drag-drop-subtext {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* --- IMPORT WIZARD TAKEOVER PANEL --- */
        .import-wizard-takeover {
          border: 1px solid rgba(16, 185, 129, 0.25);
          background: rgba(9, 10, 15, 0.95);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(16, 185, 129, 0.05);
          padding: 2rem;
          border-radius: 20px;
        }

        .wizard-step-header {
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 1rem;
        }

        .step-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-running);
          padding: 0.25rem 0.6rem;
          border-radius: 50px;
          margin-bottom: 0.5rem;
        }

        .step-title {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }

        .wizard-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 2rem;
          margin-top: 1.25rem;
        }

        @media (max-width: 950px) {
          .wizard-grid {
            grid-template-columns: 1fr;
          }
        }

        .scrollable-fields {
          max-height: 480px;
          overflow-y: auto;
          padding-right: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .mapper-field-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 0.85rem 1.25rem;
          gap: 1.5rem;
          transition: all 0.2s ease;
        }

        .mapper-field-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
        }

        .mapper-field-card.field-success {
          border-color: rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.01);
        }

        .mapper-field-card.field-error {
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.02);
        }

        .field-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          flex: 1;
        }

        .field-label {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .field-desc {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .mapper-select {
          width: 200px;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-light);
          color: var(--text-primary);
          border-radius: 8px;
          font-size: 0.82rem;
          cursor: pointer;
          outline: none;
        }

        .mapper-select:focus {
          border-color: var(--color-primary);
        }

        /* Right Preview list in Mapper */
        .csv-headers-preview-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          max-height: 480px;
        }

        .preview-box-title {
          font-size: 1.05rem;
          font-weight: 750;
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .scrollable-headers-list {
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-right: 0.25rem;
        }

        .header-preview-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-light);
          padding: 0.75rem;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          transition: all 0.2s ease;
          position: relative;
        }

        .header-preview-item.header-mapped {
          border-color: rgba(16, 185, 129, 0.3);
          background: rgba(16, 185, 129, 0.03);
        }

        .header-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-index {
          font-size: 0.65rem;
          font-weight: 800;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .header-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .header-value-row {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: flex;
          gap: 0.25rem;
        }

        .value-label {
          color: var(--text-muted);
        }

        .value-sample {
          font-family: monospace;
          color: #a78bfa;
        }

        .mapping-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--color-running);
          background: rgba(16, 185, 129, 0.12);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          align-self: flex-start;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .wizard-footer-actions {
          display: flex;
          align-items: center;
          border-top: 1px solid var(--border-light);
          padding-top: 1.25rem;
        }

        /* --- SPREADSHEET ROW PREVIEWER TABLE --- */
        .preview-table-container {
          max-height: 480px;
          overflow-y: auto;
          border: 1px solid var(--border-light);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.2);
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
          text-align: left;
        }

        .preview-table th {
          background: rgba(14, 17, 26, 0.9);
          color: var(--text-muted);
          font-weight: 700;
          padding: 0.85rem 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border-light);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .preview-table td {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          color: var(--text-primary);
        }

        .preview-row {
          transition: all 0.2s ease;
        }

        .preview-row:hover {
          background: rgba(255, 255, 255, 0.01);
        }

        .preview-row.row-selected {
          background: rgba(16, 185, 129, 0.02);
        }

        .preview-row.row-duplicate {
          background: rgba(245, 158, 11, 0.02);
        }

        .preview-row.row-invalid {
          background: rgba(239, 68, 68, 0.02);
        }

        .preview-date-text {
          font-weight: 700;
          color: var(--text-secondary);
        }

        .workout-preview-info {
          display: flex;
          flex-direction: column;
        }

        .notes-preview-text {
          color: var(--text-muted);
          font-size: 0.75rem;
          display: block;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .preview-status-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }

        .preview-status-badge.badge-success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        .preview-status-badge.badge-warning {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }

        .preview-status-badge.badge-invalid {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        /* ===== Mobile Responsive: DataManager ===== */
        @media (max-width: 768px) {
          .data-container {
            gap: 1rem;
          }

          .data-header h1 {
            font-size: 1.5rem;
          }

          /* Cards stack vertically */
          .data-cards-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .large-admin-card {
            grid-column: span 1;
          }

          /* Admin cards: icon on top, content below */
          .admin-card {
            flex-direction: column;
            min-height: unset;
            padding: 1.25rem;
            gap: 0.85rem;
          }

          /* Supabase config card */
          .supabase-config-card {
            padding: 1.25rem;
          }

          /* Mapper: stack label and select vertically */
          .mapper-field-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.75rem;
          }

          .mapper-select {
            width: 100%;
          }

          /* Wizard takeover card */
          .import-wizard-takeover {
            padding: 1rem;
          }

          .step-title {
            font-size: 1.1rem;
          }

          /* Wizard header: stack on mobile */
          .wizard-step-header > div {
            flex-direction: column;
            gap: 0.5rem;
          }

          /* Wizard footer: wrap buttons */
          .wizard-footer-actions {
            flex-wrap: wrap;
            gap: 0.75rem;
          }

          .wizard-footer-actions .btn {
            flex: 1 1 auto;
            min-width: 0;
            justify-content: center;
          }

          /* Import mode selector wraps below buttons */
          .import-mode-selector-wizard {
            order: -1;
            margin: 0 !important;
            width: 100%;
          }

          /* Preview table: horizontal scroll */
          .preview-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .preview-table {
            min-width: 520px;
          }

          /* Instructions table: scroll horizontally */
          .instructions-table {
            min-width: 420px;
          }

          /* Drag zone: smaller padding */
          .drag-drop-zone {
            padding: 1.25rem 1rem;
          }

          /* Collapse flex rows in buttons */
          .flex-buttons-row, .flex-buttons-row-end {
            flex-direction: column;
            gap: 0.6rem;
          }

          .flex-buttons-row .btn, .flex-buttons-row-end .btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .data-header h1 {
            font-size: 1.25rem;
          }

          .admin-card-icon-wrapper {
            width: 40px;
            height: 40px;
          }

          .import-wizard-takeover {
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
}
