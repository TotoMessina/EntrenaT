// --- SIMULATED PARSER FROM DATA_MANAGER.JSX ---
function testParser(text, importMode = 'merge', workouts = []) {
  if (!text || text.trim() === '') {
    throw new Error("El archivo seleccionado está vacío.");
  }

  if (text.startsWith('PK\u0003\u0004')) {
    throw new Error("Has seleccionado una planilla de Excel binaria (.xlsx). Exportar a .CSV.");
  }

  // separator detection: scan first 15 lines
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

  console.log(`> Separador detectado: [${sep === '\t' ? '\\t' : sep}] (Comas: ${totalCommas}, Puntos y comas: ${totalSemis}, Tabs: ${totalTabs})`);

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

  const normalizeHeader = (h) => {
    return h.replace(/^\uFEFF/, '') // Remove UTF-8 BOM explicitly
            .replace(/^"|"$/g, '')  // Remove wrapping quotes
            .toLowerCase()
            .trim()
            .replace(/[\s_]/g, '')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents
  };

  const dateAliases = ['fecha', 'date', 'day', 'dia', 'dates', 'fechas', 'fechaentrenamiento', 'fechadeentrenamiento'];
  const typeAliases = ['tipoactividad', 'tipo', 'type', 'activity', 'actividad', 'workouttype', 'activitytype', 'tipodeactividad', 'tipodeentrenamiento', 'tipoentrenamiento', 'deporte', 'sport', 'categoria', 'category'];

  let headerRowIndex = -1;
  let dateIdx = -1;
  let typeIdx = -1;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(val => val.trim() === '')) continue;
    
    const normalizedRow = row.map(h => normalizeHeader(h));
    const dIdx = normalizedRow.findIndex(h => dateAliases.includes(h));
    const tIdx = normalizedRow.findIndex(h => typeAliases.includes(h));
    
    if (dIdx !== -1 && tIdx !== -1) {
      headerRowIndex = r;
      dateIdx = dIdx;
      typeIdx = tIdx;
      break;
    }
  }

  if (headerRowIndex === -1) {
    const firstNonEmptyRow = rows.find(r => r && r.length > 0 && r.some(v => v.trim() !== '')) || [];
    const detectedCols = firstNonEmptyRow.map(h => `"${h.trim()}"`).join(', ');
    throw new Error(`Formato de planilla no reconocido. Columnas detectadas: [${detectedCols}]`);
  }

  console.log(`> Fila de encabezado encontrada en índice: ${headerRowIndex}`);

  const headers = rows[headerRowIndex].map(h => normalizeHeader(h));
  const getColIndex = (aliases) => headers.findIndex(h => aliases.includes(h));

  const sessionNameIdx = getColIndex(['nombresesiongym', 'sesion', 'nombre', 'session', 'name', 'workout', 'sessionname', 'workoutname', 'sesiongym', 'nombresesion', 'nombredelasesion', 'nombresesiondegym']);
  const exerciseNameIdx = getColIndex(['ejerciciogym', 'ejercicio', 'exercise', 'exercisename', 'movimiento', 'movement', 'nombreejercicio', 'nombredelejercicio']);
  const setsIdx = getColIndex(['seriesgym', 'series', 'sets', 'seriesfuerza', 'set', 'serie']);
  const repsIdx = getColIndex(['repeticionesgym', 'repeticiones', 'reps', 'repeticionesfuerza', 'repeticion', 'rep']);
  const weightIdx = getColIndex(['pesokggym', 'peso', 'pesokg', 'weight', 'weightkg', 'carga', 'pesousado']);

  const parsedWorkouts = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every(val => val.trim() === '')) continue;

    let rawDate = row[dateIdx] ? row[dateIdx].trim() : '';
    let rawType = row[typeIdx] ? row[typeIdx].trim().toLowerCase() : '';
    let rawSessionName = sessionNameIdx !== -1 && row[sessionNameIdx] ? row[sessionNameIdx].trim() : '';
    let rawExerciseName = exerciseNameIdx !== -1 && row[exerciseNameIdx] ? row[exerciseNameIdx].trim() : '';
    let rawSets = setsIdx !== -1 && row[setsIdx] ? row[setsIdx].trim() : '';
    let rawReps = repsIdx !== -1 && row[repsIdx] ? row[repsIdx].trim() : '';
    let rawWeight = weightIdx !== -1 && row[weightIdx] ? row[weightIdx].trim() : '';

    if (!rawDate || !rawType) continue;

    // Date Normalizer
    let cleanDate = rawDate.split(' ')[0].trim();
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(cleanDate)) {
      const parts = cleanDate.split(/[\/\-]/);
      cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2}$/.test(cleanDate)) {
      const parts = cleanDate.split(/[\/\-]/);
      cleanDate = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(cleanDate)) {
      const parts = cleanDate.split(/[\/\-]/);
      cleanDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }

    let cleanType = 'gym';
    if (rawType.includes('run') || rawType.includes('carrera') || rawType.includes('cardio')) {
      cleanType = 'running';
    }

    if (cleanType === 'running') {
      parsedWorkouts.push({ type: 'running', date: cleanDate });
    } else {
      const exercise = {
        name: rawExerciseName || 'Ejercicio',
        sets: parseInt(rawSets) || 4,
        reps: parseInt(rawReps) || 10,
        weight: parseFloat(rawWeight) || 0
      };

      const sessionName = rawSessionName || 'Fuerza';
      const existingGym = parsedWorkouts.find(w => 
        w.type === 'gym' && w.date === cleanDate && w.sessionName === sessionName
      );

      if (existingGym) {
        existingGym.exercises.push(exercise);
      } else {
        parsedWorkouts.push({
          type: 'gym',
          date: cleanDate,
          sessionName,
          exercises: [exercise]
        });
      }
    }
  }

  return parsedWorkouts;
}

// --- DEFINE TEST CASES ---
console.log("=== INICIANDO PRUEBAS UNITARIAS DE PARSEO CSV ===");

try {
  // Test 1: Semicolon Delimiter & UTF-8 BOM & Spanish Columns & Metadata Row
  const test1CSV = `\uFEFFReporte de Entrenamientos Mensual\n\nFecha de entrenamiento;Tipo de Actividad;Nombre de Sesión;Ejercicio;Series;Repeticiones;Peso Usado\n19/05/2026 23:13:00;Gimnasio;Empuje de Pecho;Press de Banca;4;10;80\n19/05/2026 23:13:00;Gimnasio;Empuje de Pecho;Pec Deck;3;12;45\n20/05/26;Running;;;;;`;
  console.log("\n[Test 1: Semicolon + BOM + Metadata + Spanish Columns + Time Suffix + Short Year]");
  const res1 = testParser(test1CSV);
  console.log("✓ Parseados con éxito. Resultados:");
  console.log(JSON.stringify(res1, null, 2));

  // Test 2: Standard Comma separated, pure English headers, standard dates
  const test2CSV = `date,type,session,exercise,sets,reps,weight\n2026-05-18,gym,Pull,Pullups,4,8,0\n2026-05-18,gym,Pull,Bicep Curls,3,12,14\n2026-05-19,running,,,,`;
  console.log("\n[Test 2: Comma + English Headers + Standard ISO Dates]");
  const res2 = testParser(test2CSV);
  console.log("✓ Parseados con éxito. Resultados:");
  console.log(JSON.stringify(res2, null, 2));

  console.log("\n=== TODAS LAS PRUEBAS UNITARIAS PASARON EXITOSAMENTE ===");
} catch (e) {
  console.error("❌ ERROR EN LAS PRUEBAS:", e.message);
  process.exit(1);
}
