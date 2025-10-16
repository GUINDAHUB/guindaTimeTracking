(() => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const pivotTable = document.getElementById('pivot-table');
  const tableWrapper = document.getElementById('table-wrapper');
  const controls = document.getElementById('controls');
  const exportXlsxBtn = document.getElementById('export-xlsx');
  const exportCsvBtn = document.getElementById('export-csv');
  const toggleFormatEl = document.getElementById('toggle-format');
  const summaryEl = document.getElementById('summary');

  let lastPivot = null; // { rows: string[], cols: string[], matrix: number[][], rowTotals: number[], colTotals: number[], grandTotalMs: number }
  let showDecimalHours = false;

  const CLIENTE_KEYS = ['Folder Name'];
  const EMPLEADO_KEYS = ['User Name', 'Username'];
  const DURACION_KEYS = ['Time Tracked']; // en milisegundos (ClickUp)

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'));
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'));
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt && dt.files && dt.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
  });

  dropzone.addEventListener('click', () => fileInput.click());

  toggleFormatEl.addEventListener('change', () => {
    showDecimalHours = !!toggleFormatEl.checked;
    if (lastPivot) renderPivot(lastPivot);
  });

  exportXlsxBtn.addEventListener('click', () => {
    if (!lastPivot) return;
    const aoa = pivotToAOA(lastPivot, true);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Pivot');
    XLSX.writeFile(wb, 'guinda-time-pivot.xlsx');
  });

  exportCsvBtn.addEventListener('click', () => {
    if (!lastPivot) return;
    const aoa = pivotToAOA(lastPivot, true);
    const csv = aoa.map(row => row.map(cell => toCsvCell(cell)).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guinda-time-pivot.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  function toCsvCell(value) {
    const s = String(value ?? '');
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function handleFile(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const pivot = buildPivot(rows);
        lastPivot = pivot;
        renderPivot(pivot);
      },
      error: (err) => {
        alert('Error leyendo CSV: ' + err.message);
      }
    });
  }

  function pickFirstKey(obj, keys) {
    for (const k of keys) {
      if (k in obj) return k;
    }
    return null;
  }

  function parseMs(value) {
    if (value == null || value === '') return 0;
    const n = Number(value);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
    // fallback: intentar HH:MM:SS
    if (typeof value === 'string' && /:\d{2}/.test(value)) {
      const parts = value.split(':').map(v => Number(v));
      if (parts.length === 3 && parts.every(v => Number.isFinite(v))) {
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
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  function msToDecimalHours(ms) {
    return (ms / 3600000);
  }

  function buildPivot(rows) {
    if (!rows || rows.length === 0) return { rows: [], cols: [], matrix: [], rowTotals: [], colTotals: [], grandTotalMs: 0 };
    const sample = rows[0];
    const clienteKey = pickFirstKey(sample, CLIENTE_KEYS) || 'Folder Name';
    const empleadoKey = pickFirstKey(sample, EMPLEADO_KEYS) || 'Username';
    const duracionKey = pickFirstKey(sample, DURACION_KEYS) || 'Time Tracked';

    const clienteSet = new Map(); // nombre -> index
    const empleadoSet = new Map();

    // First pass: collect keys
    for (const r of rows) {
      const cliente = String(r[clienteKey] ?? '').trim() || '(Sin cliente)';
      const empleado = String(r[empleadoKey] ?? '').trim() || '(Sin empleado)';
      if (!clienteSet.has(cliente)) clienteSet.set(cliente, clienteSet.size);
      if (!empleadoSet.has(empleado)) empleadoSet.set(empleado, empleadoSet.size);
    }

    const clientes = Array.from(clienteSet.keys()).sort((a, b) => a.localeCompare(b));
    const empleados = Array.from(empleadoSet.keys()).sort((a, b) => a.localeCompare(b));
    const matrix = Array.from({ length: clientes.length }, () => Array.from({ length: empleados.length }, () => 0));

    // Second pass: accumulate
    let grand = 0;
    for (const r of rows) {
      const cliente = String(r[clienteKey] ?? '').trim() || '(Sin cliente)';
      const empleado = String(r[empleadoKey] ?? '').trim() || '(Sin empleado)';
      const ms = parseMs(r[duracionKey]);
      const i = clientes.indexOf(cliente);
      const j = empleados.indexOf(empleado);
      if (i >= 0 && j >= 0) {
        matrix[i][j] += ms;
        grand += ms;
      }
    }

    const rowTotals = matrix.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = empleados.map((_, j) => matrix.reduce((sum, row) => sum + row[j], 0));

    return { rows: clientes, cols: empleados, matrix, rowTotals, colTotals, grandTotalMs: grand };
  }

  function renderPivot(pivot) {
    controls.hidden = false;
    tableWrapper.hidden = false;
    summaryEl.hidden = false;

    const format = showDecimalHours ? (v) => msToDecimalHours(v).toFixed(2) : msToHms;
    const unitLabel = showDecimalHours ? 'h' : 'HH:MM:SS';

    // Summary
    const proyectos = pivot.rows.length;
    const personas = pivot.cols.length;
    const total = format(pivot.grandTotalMs);
    summaryEl.innerHTML = `<span class="chip">${proyectos} clientes</span> · <span class="chip">${personas} empleados</span> · <span class="chip">Total ${total} ${unitLabel}</span>`;

    // Build table
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const topLeft = document.createElement('th');
    topLeft.textContent = 'Cliente \\ Empleado';
    headerRow.appendChild(topLeft);
    for (const col of pivot.cols) {
      const th = document.createElement('th');
      th.textContent = col;
      headerRow.appendChild(th);
    }
    const thTotal = document.createElement('th');
    thTotal.textContent = 'Total';
    headerRow.appendChild(thTotal);
    thead.appendChild(headerRow);

    const tbody = document.createElement('tbody');
    pivot.rows.forEach((cliente, i) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = cliente;
      tr.appendChild(th);
      pivot.cols.forEach((_, j) => {
        const td = document.createElement('td');
        td.textContent = matrixCellText(pivot.matrix[i][j], format, unitLabel);
        tr.appendChild(td);
      });
      const tdTotal = document.createElement('td');
      tdTotal.textContent = matrixCellText(pivot.rowTotals[i], format, unitLabel);
      tr.appendChild(tdTotal);
      tbody.appendChild(tr);
    });

    const tfoot = document.createElement('tfoot');
    const trFoot = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = 'Total';
    trFoot.appendChild(tdLabel);
    pivot.colTotals.forEach(totalMs => {
      const td = document.createElement('td');
      td.textContent = matrixCellText(totalMs, format, unitLabel);
      trFoot.appendChild(td);
    });
    const tdGrand = document.createElement('td');
    tdGrand.textContent = matrixCellText(pivot.grandTotalMs, format, unitLabel);
    trFoot.appendChild(tdGrand);
    tfoot.appendChild(trFoot);

    pivotTable.innerHTML = '';
    pivotTable.appendChild(thead);
    pivotTable.appendChild(tbody);
    pivotTable.appendChild(tfoot);
  }

  function matrixCellText(ms, format, unitLabel) {
    if (!ms) return '—';
    const txt = format(ms);
    return showDecimalHours ? `${txt}` : `${txt}`;
  }

  function pivotToAOA(pivot, includeTotals) {
    const format = showDecimalHours ? (v) => msToDecimalHours(v) : (v) => v; // para Excel conviene números en decimal
    const unit = showDecimalHours ? 'h' : 'ms';
    const header = ['Cliente \\\u00A0Empleado', ...pivot.cols, 'Total'];
    const aoa = [header];
    pivot.rows.forEach((cliente, i) => {
      const row = [cliente];
      pivot.cols.forEach((_, j) => {
        row.push(format(pivot.matrix[i][j]));
      });
      row.push(format(pivot.rowTotals[i]));
      aoa.push(row);
    });
    if (includeTotals) {
      const totals = ['Total'];
      pivot.colTotals.forEach(v => totals.push(format(v)));
      totals.push(format(pivot.grandTotalMs));
      aoa.push(totals);
    }
    return aoa;
  }
})();


