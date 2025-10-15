// Arreglo de meses para calcular el título basado en la fecha actual
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

// Objetos para almacenar transacciones (usando arrays de objetos)
let incomes = []; // Arreglo de objetos de ingresos
let expenses = []; // Arreglo de objetos de egresos

// Función para actualizar todos los totales y listas
const updateTotals = () => {
  // Calcular suma de ingresos
  let totalIncome = incomes.reduce((sum, trans) => sum + trans.amount, 0);

  // Calcular suma de egresos
  let totalExpense = expenses.reduce((sum, trans) => sum + trans.amount, 0);

  // Calcular monto disponible
  let available = totalIncome - totalExpense;

  // Calcular porcentaje total de gastos (egresos / ingresos * 100), manejar división por cero
  let percentage =
    totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(2) : 0;
  // Actualizar elementos en el DOM con toFixed(2) para redondeo
  document.getElementById("available").textContent =
    (available >= 0 ? "+" : "") + available.toFixed(2);
  document
    .getElementById("available")
    .classList.toggle("positive", available >= 0); // Clase positiva si disponible es >= 0
  document
    .getElementById("available")
    .classList.toggle("negative", available < 0); // Clase negativa si disponible es < 0
  document.getElementById("totalIncome").textContent =
    "+" + totalIncome.toFixed(2);
  document.getElementById("totalExpense").textContent =
    "-" + totalExpense.toFixed(2);
  document.getElementById("percentage").textContent = percentage + "%";

  // Actualizar lista de ingresos
  const incomeList = document.getElementById("incomeList");
  incomeList.innerHTML = ""; // Limpiar lista
  incomes.forEach((trans) => {
    const li = document.createElement("li"); // Crear elemento de lista
    li.classList.add("list-group-item");
    li.innerHTML = `${trans.description} <span>+${trans.amount.toFixed(
      2
    )}</span>`;
    incomeList.appendChild(li); // Agregar a la lista de ingresos
  });

  // Actualizar lista de egresos con porcentaje individual (monto / totalIngresos * 100)
  const expenseList = document.getElementById("expenseList");
  expenseList.innerHTML = ""; // Limpiar lista
  expenses.forEach((trans) => {
    const perc =
      totalIncome > 0 ? ((trans.amount / totalIncome) * 100).toFixed(2) : 0; // Porcentaje individual
    const li = document.createElement("li"); // Crear elemento de lista
    li.classList.add("list-group-item");
    li.innerHTML = `${trans.description} <span>-${trans.amount.toFixed(
      2
    )} <span class="expense-percentage">${perc}%</span></span>`;
    expenseList.appendChild(li); // Agregar a la lista de egresos
  });
};

// Evento para agregar transacción
document.getElementById("transactionForm").addEventListener("submit", (e) => {
  e.preventDefault(); // Prevenir recarga de página

  const type = document.getElementById("type").value;
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);

  // Validación básica: descripción no vacía y monto numérico positivo
  if (description && !isNaN(amount) && amount > 0) {
    const transaction = { description, amount }; // Crear objeto de transacción. Propiedades deccription y amount

    // Agregar a la lista correspondiente
    if (type === "Ingreso") {
      incomes.push(transaction); // Agregar objeto a ingresos
    } else {
      expenses.push(transaction); // Agregar objeto a egresos
    }

    // Actualizar totales y limpiar formulario
    updateTotals();
    document.getElementById("description").value = ""; // Limpiar campo descripción
    document.getElementById("amount").value = ""; // Limpiar campo monto
  } else {
    alert("Ingrese una descripción válida y un monto positivo.");
  }
});

// Inicialización: Calcular título basado en fecha actual y actualizar totales
// IIFE (Immediately Invoked Function Expression)
(function init() {
  const date = new Date();
  const month = months[date.getMonth()]; // Obtener mes en español basado en índice
  const year = date.getFullYear(); // Obtener año
  // Actualizar título en el DOM
  document.getElementById(
    "title"
  ).textContent = `Presupuesto de ${month} ${year}`;
  updateTotals();
})();
