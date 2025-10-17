
// Arreglo de meses (para título)
const months = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Arrays que guardan transacciones
let incomes = [];  // { description, amount }
let expenses = []; // { description, amount }

// Persistencia en localStorage (clave)
const STORAGE_KEY = "presupuesto_data_v1";

// Last deleted (para deshacer)
let lastDeleted = null; // { type: 'Ingreso'|'Egreso', transaction, index }

// Modo edición (si se está editando una transacción)
let editing = {
  active: false,
  type: null,   // 'Ingreso' o 'Egreso'
  index: null,  // índice en el array correspondiente
};

// Formateador de moneda (ajusta currency si quieres otra)
const moneyFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

// Tope de monto (evita entradas absurdas)
const MAX_AMOUNT = 10000000;

/***************** HELPERS *****************/

// Guardar en localStorage
function saveToStorage() {
  const payload = { incomes, expenses };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("No se pudo guardar en localStorage:", e);
  }
}

// Cargar desde localStorage
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.incomes) && Array.isArray(obj.expenses)) {
      incomes = obj.incomes;
      expenses = obj.expenses;
    }
  } catch (e) {
    console.warn("Error al leer localStorage:", e);
  }
}

// Normalizar/parsear entrada de monto (acepta coma como decimal, puntos como miles)
function parseAmountInput(raw) {
  if (raw === null || raw === undefined) return NaN;
  let s = String(raw).trim();

  // Caso "1.234,56" -> quitar puntos y cambiar coma por punto
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Si hay solo comas como decimales: "1234,56" => "1234.56"
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    // Quitar cualquier carácter no numérico excepto . y -
    s = s.replace(/[^\d.-]/g, '');
  }

  const v = parseFloat(s);
  // Redondeamos a 2 decimales si es número finito
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}

// Validar descripción y monto: devuelve { ok, message, amount }
function validateInput(description, rawAmount) {
  const desc = (description || '').trim();
  if (!desc) return { ok: false, message: 'La descripción es obligatoria.' };
  if (desc.length < 3) return { ok: false, message: 'La descripción debe tener al menos 3 caracteres.' };
  if (desc.length > 120) return { ok: false, message: 'La descripción es muy larga (máx. 120 caracteres).' };

  const amount = parseAmountInput(rawAmount);
  if (Number.isNaN(amount)) return { ok: false, message: 'Monto inválido. Usa números, por ejemplo 1200.50.' };
  if (amount <= 0) return { ok: false, message: 'El monto debe ser mayor que 0.' };
  if (amount > MAX_AMOUNT) return { ok: false, message: `Monto demasiado grande. Máx ${moneyFmt.format(MAX_AMOUNT)}.` };

  return { ok: true, amount };
}

/***************** RENDER / LÓGICA PRINCIPAL *****************/

// Función que actualiza totales, porcentajes y listas en el DOM
function updateTotals() {
  // Calcular totales
  const totalIncome = incomes.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpense = expenses.reduce((s, t) => s + Number(t.amount || 0), 0);
  const available = totalIncome - totalExpense;
  const percentage = totalIncome > 0 ? ((totalExpense / totalIncome) * 100) : 0;

  // Actualizar totales en el DOM (mantiene tus IDs existentes)
  const availableEl = document.getElementById("available");
  const totalIncomeEl = document.getElementById("totalIncome");
  const totalExpenseEl = document.getElementById("totalExpense");
  const percentageEl = document.getElementById("percentage");

  // Formato y clases para disponible
  availableEl.textContent = (available >= 0 ? "+" : "-") + moneyFmt.format(Math.abs(available));
  availableEl.classList.toggle("positive", available >= 0);
  availableEl.classList.toggle("negative", available < 0);

  totalIncomeEl.textContent = "+" + moneyFmt.format(totalIncome);
  totalExpenseEl.textContent = "-" + moneyFmt.format(totalExpense);
  percentageEl.textContent = `${Math.round(percentage)}%`;

  // Render de lista de ingresos
  const incomeList = document.getElementById("incomeList");
  incomeList.innerHTML = "";
  incomes.forEach((trans, i) => {
    const li = document.createElement("li");
    li.className = "list-group-item";
    // data para delegación
    li.dataset.index = i;
    li.dataset.type = "Ingreso";
    // contenido: descripción y monto + botones
    li.innerHTML = `
      <div class="tx-left">
        <div class="tx-desc">${escapeHtml(trans.description)}</div>
        <div class="tx-meta">Ingreso</div>
      </div>
      <div class="d-flex align-items-center gap-3">
        <div class="fw-bold">${'+' + moneyFmt.format(Number(trans.amount))}</div>
        <div class="item-actions">
          <button class="btn btn-outline-secondary btn-sm" data-action="edit" aria-label="Editar ingreso">Editar</button>
          <button class="btn btn-outline-danger btn-sm" data-action="delete" aria-label="Eliminar ingreso">Eliminar</button>
        </div>
      </div>
    `;
    incomeList.appendChild(li);
  });

  // Render de lista de egresos (con porcentaje por ítem)
  const expenseList = document.getElementById("expenseList");
  expenseList.innerHTML = "";
  expenses.forEach((trans, i) => {
    const percItem = totalIncome > 0 ? Math.round((trans.amount / totalIncome) * 100) : 0;
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.dataset.index = i;
    li.dataset.type = "Egreso";
    li.innerHTML = `
      <div class="tx-left">
        <div class="tx-desc">${escapeHtml(trans.description)}</div>
        <div class="tx-meta">Egreso</div>
      </div>
      <div class="d-flex align-items-center gap-3">
        <div class="fw-bold">${'-' + moneyFmt.format(Number(trans.amount))} <span class="expense-percentage">${percItem}%</span></div>
        <div class="item-actions">
          <button class="btn btn-outline-secondary btn-sm" data-action="edit" aria-label="Editar egreso">Editar</button>
          <button class="btn btn-outline-danger btn-sm" data-action="delete" aria-label="Eliminar egreso">Eliminar</button>
        </div>
      </div>
    `;
    expenseList.appendChild(li);
  });

  // Guardar estado
  saveToStorage();
}

// Escape básico para evitar XSS si la descripción contiene HTML
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/***************** EVENTOS: AGREGAR / EDITAR / BORRAR *****************/

// Manejo del submit del formulario (agregar o actualizar si está en edición)
document.getElementById("transactionForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const type = document.getElementById("type").value; // "Ingreso" o "Egreso"
  const description = document.getElementById("description").value;
  const rawAmount = document.getElementById("amount").value;

  // Validación
  const v = validateInput(description, rawAmount);
  if (!v.ok) {
    // Mostrar modal de error con SweetAlert2
    Swal.fire({
      icon: 'warning',
      title: 'Datos inválidos',
      html: `<p style="text-align:left">${v.message}</p>`,
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  // Si estamos en modo edición, actualizar el elemento correspondiente
  if (editing.active) {
    if (editing.type === 'Ingreso' && type === 'Ingreso') {
      incomes[editing.index] = { description: description.trim(), amount: v.amount };
    } else if (editing.type === 'Egreso' && type === 'Egreso') {
      expenses[editing.index] = { description: description.trim(), amount: v.amount };
    } else {
      // Si el usuario cambió el tipo durante edición (Ingreso -> Egreso o viceversa)
      // eliminamos el original y agregamos al nuevo array
      if (editing.type === 'Ingreso') {
        incomes.splice(editing.index, 1);
      } else {
        expenses.splice(editing.index, 1);
      }
      if (type === 'Ingreso') incomes.push({ description: description.trim(), amount: v.amount });
      else expenses.push({ description: description.trim(), amount: v.amount });
    }

    // Desactivar modo edición
    editing.active = false;
    editing.type = null;
    editing.index = null;

    // Restaurar texto del botón y limpiar form
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.textContent = 'Agregar';
    document.getElementById("transactionForm").reset();

    updateTotals();
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Transacción actualizada', showConfirmButton: false, timer: 1400 });
    return;
  }

  // Si no estamos editando, agregamos
  const transaction = { description: description.trim(), amount: v.amount };
  if (type === 'Ingreso') incomes.push(transaction);
  else expenses.push(transaction);

  // Limpiar form y actualizar UI
  document.getElementById("transactionForm").reset();
  document.getElementById("description").focus();

  updateTotals();

  // Toast de éxito
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${type} agregado: ${moneyFmt.format(v.amount)}`, showConfirmButton: false, timer: 1500 });
});

// Delegación de eventos para botones Editar / Eliminar dentro de las listas
document.addEventListener('click', function (e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action; // 'edit' o 'delete'
  const li = btn.closest('li');
  if (!li) return;
  const idx = Number(li.dataset.index);
  const type = li.dataset.type; // 'Ingreso' o 'Egreso'

  if (action === 'edit') {
    // Poblar el formulario con los datos de la transacción y activar modo edición
    let transaction = null;
    if (type === 'Ingreso') transaction = incomes[idx];
    else transaction = expenses[idx];

    if (!transaction) {
      Swal.fire({ icon: 'error', title: 'No se encontró la transacción' });
      return;
    }

    // Rellenar form
    document.getElementById('type').value = type === 'Ingreso' ? 'Ingreso' : 'Egreso';
    document.getElementById('description').value = transaction.description;
    document.getElementById('amount').value = transaction.amount.toFixed(2);
    document.getElementById('description').focus();

    // Marcar edición
    editing.active = true;
    editing.type = type;
    editing.index = idx;

    // Cambiar texto del botón Agregar a Actualizar (si existe)
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.textContent = 'Actualizar';
    return;
  }

  if (action === 'delete') {
    // Confirmación antes de borrar
    let transaction = null;
    if (type === 'Ingreso') transaction = incomes[idx];
    else transaction = expenses[idx];

    if (!transaction) {
      Swal.fire({ icon: 'error', title: 'No se encontró la transacción' });
      return;
    }

    Swal.fire({
      title: '¿Eliminar transacción?',
      html: `${escapeHtml(transaction.description)}<br><strong>${moneyFmt.format(transaction.amount)}</strong>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        // Guardar en lastDeleted para permitir deshacer
        lastDeleted = { type, transaction: { ...transaction }, index: idx };

        if (type === 'Ingreso') incomes.splice(idx, 1);
        else expenses.splice(idx, 1);

        updateTotals();

        // Ofrecer deshacer con modal/toast
        Swal.fire({
          title: 'Transacción eliminada',
          html: '¿Deseas deshacer?',
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Deshacer',
          cancelButtonText: 'Cerrar',
          timer: 6000
        }).then(r => {
          if (r.isConfirmed) {
            // Restaurar
            if (lastDeleted) {
              if (lastDeleted.type === 'Ingreso') incomes.splice(lastDeleted.index, 0, lastDeleted.transaction);
              else expenses.splice(lastDeleted.index, 0, lastDeleted.transaction);
              lastDeleted = null;
              updateTotals();
              Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Transacción restaurada', showConfirmButton: false, timer: 1400 });
            }
          } else {
            // cerrar -> no hacemos nada, borrado definitivo
            lastDeleted = null;
          }
        });
      }
    });
  }
});

/***************** FORMATO AUTOMÁTICO: AL PERDER FOCO EN EL INPUT DE MONTO *****************/
const amountInput = document.getElementById('amount');
if (amountInput) {
  amountInput.addEventListener('blur', (e) => {
    const parsed = parseAmountInput(e.target.value);
    if (!Number.isNaN(parsed)) {
      e.target.value = parsed.toFixed(2);
    }
  });
}

/***************** INICIALIZACIÓN *****************/

// Poner título con mes y año, cargar datos y render inicial
(function init() {
  // Título dinámico
  try {
    const date = new Date();
    const month = months[date.getMonth()] || '';
    const year = date.getFullYear();
    const titleEl = document.getElementById('title');
    if (titleEl) titleEl.textContent = `Presupuesto de ${month} ${year}`;
  } catch (e) {
    console.warn("No se pudo actualizar el título con fecha:", e);
  }

  // Cargar datos guardados (si existen)
  loadFromStorage();

  // Renderizar
  updateTotals();
})();