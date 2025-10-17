import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function Home() {
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);
  const [pivot, setPivot] = useState(null);
  const [decimal, setDecimal] = useState(false);
  const [rawRows, setRawRows] = useState([]);
  const [excludedClientes, setExcludedClientes] = useState([]);
  const [excludedEmpleados, setExcludedEmpleados] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [savedCSVs, setSavedCSVs] = useState([]);
  const [showSavedCSVs, setShowSavedCSVs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingCSVs, setLoadingCSVs] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [monthlyData, setMonthlyData] = useState({}); // {0: {pivot, rawRows, excludedClientes, ...}, 1: {...}, ...}

  // Obtener datos del mes actual
  const currentMonthData = useMemo(() => {
    return monthlyData[currentMonth] || {
      pivot: null,
      rawRows: [],
      excludedClientes: [],
      excludedEmpleados: [],
      dateFrom: "",
      dateTo: "",
      hasData: false
    };
  }, [monthlyData, currentMonth]);

  // Actualizar datos del mes actual
  const updateCurrentMonthData = useCallback((updates) => {
    setMonthlyData(prev => ({
      ...prev,
      [currentMonth]: {
        ...prev[currentMonth],
        ...updates
      }
    }));
  }, [currentMonth]);

  // Sincronizar estado local con datos del mes
  const syncWithCurrentMonth = useCallback(() => {
    setPivot(currentMonthData.pivot);
    setRawRows(currentMonthData.rawRows);
    setExcludedClientes(currentMonthData.excludedClientes || []);
    setExcludedEmpleados(currentMonthData.excludedEmpleados || []);
    setDateFrom(currentMonthData.dateFrom || "");
    setDateTo(currentMonthData.dateTo || "");
  }, [currentMonthData]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    import("papaparse").then(({ default: Papa }) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data;
          const p = buildPivot(applyFilters(rows, currentMonthData.excludedClientes || [], currentMonthData.excludedEmpleados || [], currentMonthData.dateFrom || "", currentMonthData.dateTo || ""));
          
          // Actualizar estado local primero
          setRawRows(rows);
          setPivot(p);
          
          // Luego actualizar datos del mes actual
          updateCurrentMonthData({
            pivot: p,
            rawRows: rows,
            hasData: true
          });
        },
        error: (err) => alert("Error leyendo CSV: " + err.message),
      });
    });
  }, [currentMonthData, updateCurrentMonthData]);

  // Función para subir CSV a Supabase
  const uploadCSVToServer = useCallback(async (file) => {
    if (!file) return;
    
    setUploading(true);
    try {
      const fileName = `guinda-${Date.now()}-${file.name}`;
      const fileContent = await file.text();
      
      // Función para convertir UTF-8 a base64 de forma segura
      const utf8ToBase64 = (str) => {
        return btoa(unescape(encodeURIComponent(str)));
      };
      
      const base64Content = utf8ToBase64(fileContent);
      
      const response = await fetch('/api/csv/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileContent: base64Content })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('CSV guardado correctamente en el servidor');
        loadSavedCSVs(); // Recargar la lista
      } else {
        alert('Error guardando CSV: ' + result.error);
      }
    } catch (error) {
      alert('Error guardando CSV: ' + error.message);
    } finally {
      setUploading(false);
    }
  }, []);

  // Función para cargar CSVs guardados
  const loadSavedCSVs = useCallback(async () => {
    setLoadingCSVs(true);
    try {
      const response = await fetch('/api/csv/list');
      const result = await response.json();
      if (result.success) {
        setSavedCSVs(result.data);
      } else {
        console.error('Error cargando CSVs:', result.error);
      }
    } catch (error) {
      console.error('Error cargando CSVs:', error);
    } finally {
      setLoadingCSVs(false);
    }
  }, []);

  // Función para cargar un CSV guardado
  const loadSavedCSV = useCallback(async (fileName) => {
    try {
      const response = await fetch(`/api/csv/download?fileName=${encodeURIComponent(fileName)}`);
      if (response.ok) {
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: 'text/csv' });
        handleFile(file);
        setShowSavedCSVs(false);
      } else {
        alert('Error cargando CSV guardado');
      }
    } catch (error) {
      alert('Error cargando CSV: ' + error.message);
    }
  }, [handleFile]);

  // Función para eliminar un CSV guardado
  const deleteSavedCSV = useCallback(async (fileName) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este CSV?')) return;
    
    try {
      const response = await fetch('/api/csv/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('CSV eliminado correctamente');
        loadSavedCSVs(); // Recargar la lista
      } else {
        alert('Error eliminando CSV: ' + result.error);
      }
    } catch (error) {
      alert('Error eliminando CSV: ' + error.message);
    }
  }, [loadSavedCSVs]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFile(file);
      // Opcional: guardar automáticamente en el servidor
      // uploadCSVToServer(file);
    }
  }, [handleFile]);

  const onDragOver = (e) => e.preventDefault();

  const exportXlsx = useCallback(async () => {
    if (!pivot) return;
    const XLSX = (await import("xlsx")).default;
    const aoa = pivotToAOA(pivot, decimal, true);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Pivot");
    XLSX.writeFile(wb, "guinda-time-pivot.xlsx");
  }, [pivot, decimal]);

  const exportCsv = useCallback(() => {
    if (!pivot) return;
    const aoa = pivotToAOA(pivot, decimal, true);
    const csv = aoa.map((r) => r.map(toCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guinda-time-pivot.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [pivot, decimal]);

  const summary = useMemo(() => {
    if (!pivot) return null;
    const format = decimal ? (v) => (v / 3600000).toFixed(2) : msToHms;
    const unit = decimal ? "h" : "HH:MM:SS";
    return {
      clientes: pivot.rows.length,
      empleados: pivot.cols.length,
      total: `${format(pivot.grandTotalMs)} ${unit}`,
    };
  }, [pivot, decimal]);

  const clientesOptions = useMemo(() => extractSortedUnique(rawRows, CLIENTE_KEYS[0]), [rawRows]);
  const empleadosOptions = useMemo(() => {
    const listA = extractSortedUnique(rawRows, EMPLEADO_KEYS[0]);
    return listA.length ? listA : extractSortedUnique(rawRows, EMPLEADO_KEYS[1]);
  }, [rawRows]);

  // recompute pivot when filters change
  const recompute = useCallback(() => {
    if (!rawRows?.length) return;
    const newPivot = buildPivot(applyFilters(rawRows, excludedClientes, excludedEmpleados, dateFrom, dateTo));
    setPivot(newPivot);
    
    // Actualizar datos del mes actual
    updateCurrentMonthData({
      pivot: newPivot,
      excludedClientes,
      excludedEmpleados,
      dateFrom,
      dateTo
    });
  }, [rawRows, excludedClientes, excludedEmpleados, dateFrom, dateTo, updateCurrentMonthData]);

  // Nombres de los meses
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Cambiar de mes
  const changeMonth = useCallback((monthIndex) => {
    // Primero guardar los datos del mes actual
    if (rawRows.length > 0) {
      updateCurrentMonthData({
        pivot,
        rawRows,
        excludedClientes,
        excludedEmpleados,
        dateFrom,
        dateTo,
        hasData: true
      });
    }
    
    // Cambiar al nuevo mes
    setCurrentMonth(monthIndex);
  }, [rawRows, pivot, excludedClientes, excludedEmpleados, dateFrom, dateTo, updateCurrentMonthData]);

  // Efecto para sincronizar cuando cambia el mes
  useEffect(() => {
    syncWithCurrentMonth();
  }, [currentMonth, syncWithCurrentMonth]);

  return (
    <>
      <Head>
        <title>Guinda Time Pivot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      
      <div className="app-layout">
        {/* Sidebar con meses */}
        <aside className="sidebar">
          <div className="month-nav">
            <h3>Meses</h3>
            <ul className="month-list">
              {monthNames.map((month, index) => (
                <li key={index} className="month-item">
                  <button
                    className={`month-link ${index === currentMonth ? 'active' : ''} ${monthlyData[index]?.hasData ? 'has-data' : ''}`}
                    onClick={() => changeMonth(index)}
                  >
                    <span>{month}</span>
                    <div className="month-indicator" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="main-content">
          <div className="container">
            <header>
              <div className="header-content">
                <div className="logo-section">
                  <img src="/logo-guinda.png" alt="Guinda" className="logo" />
                  <div className="title-section">
                    <h1>Guinda Time Pivot - {monthNames[currentMonth]}</h1>
                    <p>Arrastra y suelta tu CSV exportado de ClickUp o selecciónalo con el botón.</p>
                  </div>
                </div>
              </div>
            </header>
        <section
          className="uploader"
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <div className="uploader__inner">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p><strong>Suelta el CSV aquí</strong> o</p>
            <label className="btn" onClick={() => fileInputRef.current?.click()}>
              Seleccionar archivo
              <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <p className="hint">Columnas: "Folder Name" (cliente), "User Name" o "Username" (empleado), "Time Tracked" (ms).</p>
          </div>
        </section>

        {!!rawRows.length && (
          <>
            <section className="controls" style={{marginTop:12}}>
              <div className="controls__row">
                <button onClick={()=> setShowFilters(v => !v)} className="btn btn--secondary">{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</button>
                <button onClick={()=> { setShowSavedCSVs(v => !v); if (!showSavedCSVs) loadSavedCSVs(); }} className="btn btn--secondary">
                  {showSavedCSVs ? 'Ocultar CSVs guardados' : 'Ver CSVs guardados'}
                </button>
                <div className="spacer" />
                <label className="switch">
                  <input type="checkbox" checked={decimal} onChange={(e) => setDecimal(e.target.checked)} />
                  <span>Mostrar en horas decimales</span>
                </label>
              </div>
            </section>

            {showFilters && (
            <section className="filters" style={{background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:12, boxShadow:'var(--shadow)'}}>
              <div className="full" style={{display:'flex', gap:12, alignItems:'center'}}>
                <strong style={{minWidth:140}}>Excluir clientes</strong>
                <input placeholder="Buscar cliente…" value={clientSearch} onChange={(e)=> setClientSearch(e.target.value)} style={{flex:1, border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', background:'#fff'}} />
                <button className="btn btn--secondary" onClick={()=>{ setExcludedClientes([]); recompute(); }}>Limpiar exclusiones</button>
              </div>
              <div className="full" style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:10, maxHeight:220, overflow:'auto', padding:'6px'}}>
                {clientesOptions.filter(c => c.toLowerCase().includes(clientSearch.toLowerCase())).map(c => {
                  const checked = excludedClientes.includes(c);
                  return (
                    <label key={c} style={{display:'flex', gap:8, alignItems:'center', padding:'6px 8px', border:'1px solid var(--border)', borderRadius:8, background:'#fff'}}>
                      <input type="checkbox" checked={checked} onChange={(e)=>{
                        const next = e.target.checked ? [...excludedClientes, c] : excludedClientes.filter(x=>x!==c);
                        setExcludedClientes(next);
                      }} onBlur={recompute} />
                      <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{c}</span>
                    </label>
                  );
                })}
              </div>

              <div className="full" style={{display:'flex', gap:12, alignItems:'center', marginTop:12}}>
                <strong style={{minWidth:140}}>Excluir empleados</strong>
                <input placeholder="Buscar empleado…" value={employeeSearch} onChange={(e)=> setEmployeeSearch(e.target.value)} style={{flex:1, border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', background:'#fff'}} />
                <button className="btn btn--secondary" onClick={()=>{ setExcludedEmpleados([]); recompute(); }}>Limpiar exclusiones</button>
              </div>
              <div className="full" style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:10, maxHeight:220, overflow:'auto', padding:'6px'}}>
                {empleadosOptions.filter(u => u.toLowerCase().includes(employeeSearch.toLowerCase())).map(u => {
                  const checked = excludedEmpleados.includes(u);
                  return (
                    <label key={u} style={{display:'flex', gap:8, alignItems:'center', padding:'6px 8px', border:'1px solid var(--border)', borderRadius:8, background:'#fff'}}>
                      <input type="checkbox" checked={checked} onChange={(e)=>{
                        const next = e.target.checked ? [...excludedEmpleados, u] : excludedEmpleados.filter(x=>x!==u);
                        setExcludedEmpleados(next);
                      }} onBlur={recompute} />
                      <span style={{overflow:'hidden', textOverflow:'ellipsis'}}>{u}</span>
                    </label>
                  );
                })}
              </div>
              <label>
                Desde
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} onBlur={recompute} />
              </label>
              <label>
                Hasta
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} onBlur={recompute} />
              </label>
            </section>
            )}

            {showSavedCSVs && (
              <section className="saved-csvs" style={{background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:12, boxShadow:'var(--shadow)', marginTop:12}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                  <h3 style={{margin:0, fontSize:16, fontWeight:600}}>CSVs Guardados</h3>
                  <button onClick={loadSavedCSVs} className="btn btn--secondary" disabled={loadingCSVs}>
                    {loadingCSVs ? 'Cargando...' : 'Actualizar'}
                  </button>
                </div>
                {loadingCSVs ? (
                  <p style={{textAlign:'center', color:'var(--muted)', margin:20}}>Cargando CSVs...</p>
                ) : savedCSVs.length === 0 ? (
                  <p style={{textAlign:'center', color:'var(--muted)', margin:20}}>No hay CSVs guardados</p>
                ) : (
                  <div style={{display:'grid', gap:8, maxHeight:200, overflow:'auto'}}>
                    {savedCSVs.map((csv) => (
                      <div key={csv.name} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', border:'1px solid var(--border)', borderRadius:8, background:'#f9fafb'}}>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontWeight:500, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {csv.name}
                          </div>
                          <div style={{fontSize:12, color:'var(--muted)'}}>
                            {new Date(csv.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div style={{display:'flex', gap:8}}>
                          <button 
                            onClick={() => loadSavedCSV(csv.name)} 
                            className="btn" 
                            style={{padding:'6px 12px', fontSize:12}}
                          >
                            Cargar
                          </button>
                          <button 
                            onClick={() => deleteSavedCSV(csv.name)} 
                            className="btn btn--secondary" 
                            style={{padding:'6px 12px', fontSize:12}}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="controls">
              <div className="controls__row">
                <button onClick={exportXlsx} className="btn">Exportar Excel</button>
                <button onClick={exportCsv} className="btn btn--secondary">Exportar CSV</button>
                <button 
                  onClick={() => uploadCSVToServer(fileInputRef.current?.files?.[0] || new File([], 'current.csv'))} 
                  className="btn btn--secondary" 
                  disabled={!rawRows.length || uploading}
                >
                  {uploading ? 'Guardando...' : 'Guardar CSV en servidor'}
                </button>
                <div className="spacer" />
              </div>
            </section>

            {pivot && (
              <section className="summary">
                <span className="chip">{summary.clientes} clientes</span> · <span className="chip">{summary.empleados} empleados</span> · <span className="chip">Total {summary.total}</span>
              </section>
            )}

            {pivot && (
              <section className="table-wrapper">
                <PivotTable pivot={pivot} decimal={decimal} />
              </section>
            )}
          </>
        )}
        
        <footer className="footnote">
          <small>Datos procesados localmente en tu navegador. No se suben a ningún servidor.</small>
        </footer>
      </div>
    </main>
  </div>
</>
);
}

function PivotTable({ pivot, decimal }) {
  const format = decimal ? (v) => (v / 3600000).toFixed(2) : msToHms;
  const unit = decimal ? "h" : "HH:MM:SS";
  return (
    <table>
      <thead>
        <tr>
          <th>Cliente \\ Empleado</th>
          {pivot.cols.map((c) => <th key={c}>{c}</th>)}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {pivot.rows.map((cliente, i) => (
          <tr key={cliente}>
            <th>{cliente}</th>
            {pivot.cols.map((_, j) => (
              <td key={j}>{pivot.matrix[i][j] ? format(pivot.matrix[i][j]) : "—"}</td>
            ))}
            <td>{pivot.rowTotals[i] ? format(pivot.rowTotals[i]) : "—"}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td>Total</td>
          {pivot.colTotals.map((v, idx) => <td key={idx}>{v ? format(v) : "—"}</td>)}
          <td>{pivot.grandTotalMs ? format(pivot.grandTotalMs) : "—"}</td>
        </tr>
      </tfoot>
    </table>
  );
}

const CLIENTE_KEYS = ["Folder Name"]; 
const EMPLEADO_KEYS = ["User Name", "Username"];
const DURACION_KEYS = ["Time Tracked"];
const START_KEYS = ["Start", "Start Date", "Date Created"]; // milis epoch en ClickUp

function pickFirstKey(obj, keys) {
  for (const k of keys) if (k in obj) return k;
  return null;
}

function parseMs(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  if (typeof value === "string" && /:\\d{2}/.test(value)) {
    const parts = value.split(":").map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      const [h, m, s] = parts;
      return ((h * 60 + m) * 60 + s) * 1000;
    }
  }
  return 0;
}

function msToHms(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function buildPivot(rows) {
  if (!rows || rows.length === 0) return { rows: [], cols: [], matrix: [], rowTotals: [], colTotals: [], grandTotalMs: 0 };
  const sample = rows[0];
  const clienteKey = pickFirstKey(sample, CLIENTE_KEYS) || "Folder Name";
  const empleadoKey = pickFirstKey(sample, EMPLEADO_KEYS) || "Username";
  const duracionKey = pickFirstKey(sample, DURACION_KEYS) || "Time Tracked";

  const clienteSet = new Set();
  const empleadoSet = new Set();
  rows.forEach((r) => {
    const cliente = String(r[clienteKey] ?? "").trim() || "(Sin cliente)";
    const empleado = String(r[empleadoKey] ?? "").trim() || "(Sin empleado)";
    clienteSet.add(cliente);
    empleadoSet.add(empleado);
  });

  const clientes = Array.from(clienteSet).sort((a, b) => a.localeCompare(b));
  const empleados = Array.from(empleadoSet).sort((a, b) => a.localeCompare(b));
  const matrix = Array.from({ length: clientes.length }, () => Array.from({ length: empleados.length }, () => 0));

  let grand = 0;
  rows.forEach((r) => {
    const cliente = String(r[clienteKey] ?? "").trim() || "(Sin cliente)";
    const empleado = String(r[empleadoKey] ?? "").trim() || "(Sin empleado)";
    const ms = parseMs(r[duracionKey]);
    const i = clientes.indexOf(cliente);
    const j = empleados.indexOf(empleado);
    if (i >= 0 && j >= 0) {
      matrix[i][j] += ms;
      grand += ms;
    }
  });

  const rowTotals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = empleados.map((_, j) => matrix.reduce((sum, row) => sum + row[j], 0));

  return { rows: clientes, cols: empleados, matrix, rowTotals, colTotals, grandTotalMs: grand };
}

function extractSortedUnique(rows, key) {
  const s = new Set();
  rows.forEach(r => {
    if (r[key] != null && String(r[key]).trim() !== "") s.add(String(r[key]).trim());
  });
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function applyFilters(rows, excludedClientes, excludedEmpleados, dateFrom, dateTo) {
  const hasExcluded = excludedClientes && excludedClientes.length;
  const hasExcludedEmp = excludedEmpleados && excludedEmpleados.length;
  const fromTs = dateFrom ? Date.parse(dateFrom + "T00:00:00") : null;
  const toTs = dateTo ? Date.parse(dateTo + "T23:59:59") : null;
  const startKey = pickFirstKey(rows[0] || {}, START_KEYS) || START_KEYS[0];
  return rows.filter(r => {
    const c = String(r[CLIENTE_KEYS[0]] ?? "").trim();
    const e = String((r[EMPLEADO_KEYS[0]] ?? r[EMPLEADO_KEYS[1]] ?? "")).trim();
    if (hasExcluded && excludedClientes.includes(c)) return false;
    if (hasExcludedEmp && excludedEmpleados.includes(e)) return false;
    if (fromTs != null || toTs != null) {
      const ms = Number(r[startKey]);
      const t = Number.isFinite(ms) ? ms : Date.parse(String(r[startKey] ?? ""));
      if (Number.isFinite(t)) {
        if (fromTs != null && t < fromTs) return false;
        if (toTs != null && t > toTs) return false;
      }
    }
    return true;
  });
}

function pivotToAOA(pivot, decimal, includeTotals) {
  const format = decimal ? (v) => v / 3600000 : (v) => v; // números decimales para Excel
  const header = ["Cliente \\ Empleado", ...pivot.cols, "Total"];
  const aoa = [header];
  pivot.rows.forEach((cliente, i) => {
    const row = [cliente];
    pivot.cols.forEach((_, j) => row.push(format(pivot.matrix[i][j])));
    row.push(format(pivot.rowTotals[i]));
    aoa.push(row);
  });
  if (includeTotals) {
    const totals = ["Total", ...pivot.colTotals.map(format), format(pivot.grandTotalMs)];
    aoa.push(totals);
  }
  return aoa;
}

function toCsvCell(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}


