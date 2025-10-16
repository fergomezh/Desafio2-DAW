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
  let totalIncome = incomes.reduce((sum, trans) => sum + trans.amount, 0);
  let totalExpense = expenses.reduce((sum, trans) => sum + trans.amount, 0);
  let available = totalIncome - totalExpense;
  let percentage =
    totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(2) : 0;

  document.getElementById("available").textContent =
    (available >= 0 ? "+" : "") + available.toFixed(2);
  document
    .getElementById("available")
    .classList.toggle("positive", available >= 0);
  document
    .getElementById("available")
    .classList.toggle("negative", available < 0);
  document.getElementById("totalIncome").textContent =
    "+" + totalIncome.toFixed(2);
  document.getElementById("totalExpense").textContent =
    "-" + totalExpense.toFixed(2);
  document.getElementById("percentage").textContent = percentage + "%";

  const incomeList = document.getElementById("incomeList");
  incomeList.innerHTML = "";
  incomes.forEach((trans) => {
    const li = document.createElement("li");
    li.classList.add("list-group-item");
    li.innerHTML = `${trans.description} <span>+${trans.amount.toFixed(2)}</span>`;
    incomeList.appendChild(li);
  });

  const expenseList = document.getElementById("expenseList");
  expenseList.innerHTML = "";
  expenses.forEach((trans) => {
    const perc =
      totalIncome > 0 ? ((trans.amount / totalIncome) * 100).toFixed(2) : 0;
    const li = document.createElement("li");
    li.classList.add("list-group-item");
    li.innerHTML = `${trans.description} <span>-${trans.amount.toFixed(
      2
    )} <span class="expense-percentage">${perc}%</span></span>`;
    expenseList.appendChild(li);
  });
};

// Evento para agregar transacción
document.getElementById("transactionForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const type = document.getElementById("type").value;
  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);

  if (description && !isNaN(amount) && amount > 0) {
    const transaction = { description, amount };

    if (type === "Ingreso") {
      incomes.push(transaction);
    } else {
      expenses.push(transaction);
    }

    updateTotals();

    // Mostrar SweetAlert de éxito
    Swal.fire({
      icon: "success",
      title: "Ingreso agregado",
      text: `Se registró un ${type.toLowerCase()} de $${amount.toFixed(
        2
      )} correctamente.`,
      showConfirmButton: false,
      timer: 1800,
    });

    document.getElementById("description").value = "";
    document.getElementById("amount").value = "";
  } else {
    // SweetAlert de error si los datos son inválidos
    Swal.fire({
      icon: "warning",
      title: "Datos incompletos",
      text: "Por favor ingresa una descripción y un monto válido.",
      confirmButtonColor: "#3085d6",
    });
  }
});

// Inicialización
(function init() {
  const date = new Date();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  document.getElementById("title").textContent = `Presupuesto de ${month} ${year}`;
  updateTotals();
})();
