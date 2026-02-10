const STORAGE_KEY = "gestao_financeira_v1";

const state = loadState();

const expenseForm = document.getElementById("expense-form");
const incomeForm = document.getElementById("income-form");
const expenseAllocationForm = document.getElementById("expense-allocation-form");
const incomeAllocationForm = document.getElementById("income-allocation-form");

const expensesList = document.getElementById("expenses-list");
const incomesList = document.getElementById("incomes-list");
const expenseAllocationsList = document.getElementById("expense-allocations-list");
const incomeAllocationsList = document.getElementById("income-allocations-list");

const expenseSelect = document.getElementById("allocation-expense-id");
const incomeSelect = document.getElementById("allocation-income-id");
const consolidatedMonth = document.getElementById("consolidated-month");
const reportBaseMonth = document.getElementById("report-base-month");
const backupStatus = document.getElementById("backup-status");

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

initializeDates();
bindEvents();
renderAll();

function initializeDates() {
  const now = new Date();
  const monthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  consolidatedMonth.value = monthValue;
  reportBaseMonth.value = monthValue;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { expenses: [], incomes: [], expenseAllocations: [], incomeAllocations: [] };
    }
    return JSON.parse(raw);
  } catch {
    return { expenses: [], incomes: [], expenseAllocations: [], incomeAllocations: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  expenseForm.addEventListener("submit", onCreateExpense);
  incomeForm.addEventListener("submit", onCreateIncome);
  expenseAllocationForm.addEventListener("submit", onSaveExpenseAllocation);
  incomeAllocationForm.addEventListener("submit", onSaveIncomeAllocation);

  document.getElementById("expense-allocation-cancel").addEventListener("click", () => resetAllocationForm("expense"));
  document.getElementById("income-allocation-cancel").addEventListener("click", () => resetAllocationForm("income"));

  document.getElementById("refresh-consolidated").addEventListener("click", renderConsolidated);
  document.getElementById("generate-report").addEventListener("click", renderReport);
  document.getElementById("download-data").addEventListener("click", downloadData);
  document.getElementById("upload-data").addEventListener("change", uploadData);
}

function onCreateExpense(event) {
  event.preventDefault();
  const expense = {
    id: crypto.randomUUID(),
    description: document.getElementById("expense-description").value.trim(),
    type: document.getElementById("expense-type").value,
    amount: Number(document.getElementById("expense-amount").value),
  };
  state.expenses.push(expense);
  saveState();
  expenseForm.reset();
  renderAll();
}

function onCreateIncome(event) {
  event.preventDefault();
  const income = {
    id: crypto.randomUUID(),
    sourceType: document.getElementById("income-type").value,
    sourceName: document.getElementById("income-source").value.trim(),
    amount: Number(document.getElementById("income-amount").value),
  };
  state.incomes.push(income);
  saveState();
  incomeForm.reset();
  renderAll();
}

function onSaveExpenseAllocation(event) {
  event.preventDefault();
  const editId = document.getElementById("allocation-expense-edit-id").value;
  const payload = {
    id: editId || crypto.randomUUID(),
    expenseId: document.getElementById("allocation-expense-id").value,
    startDate: document.getElementById("allocation-expense-date").value,
    repeat: document.getElementById("allocation-expense-repeat").value,
  };

  upsertById(state.expenseAllocations, payload);
  saveState();
  resetAllocationForm("expense");
  renderAll();
}

function onSaveIncomeAllocation(event) {
  event.preventDefault();
  const editId = document.getElementById("allocation-income-edit-id").value;
  const payload = {
    id: editId || crypto.randomUUID(),
    incomeId: document.getElementById("allocation-income-id").value,
    startDate: document.getElementById("allocation-income-date").value,
    repeat: document.getElementById("allocation-income-repeat").value,
  };

  upsertById(state.incomeAllocations, payload);
  saveState();
  resetAllocationForm("income");
  renderAll();
}

function upsertById(collection, item) {
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    collection[index] = item;
  } else {
    collection.push(item);
  }
}

function resetAllocationForm(kind) {
  if (kind === "expense") {
    document.getElementById("allocation-expense-edit-id").value = "";
    expenseAllocationForm.reset();
  } else {
    document.getElementById("allocation-income-edit-id").value = "";
    incomeAllocationForm.reset();
  }
}

function renderAll() {
  renderExpenseSelect();
  renderIncomeSelect();
  renderExpenses();
  renderIncomes();
  renderExpenseAllocations();
  renderIncomeAllocations();
  renderConsolidated();
  renderAnalytics();
  renderReport();
}

function renderExpenseSelect() {
  expenseSelect.innerHTML = state.expenses
    .map((expense) => `<option value="${expense.id}">${expense.description} (${money.format(expense.amount)})</option>`)
    .join("");
}

function renderIncomeSelect() {
  incomeSelect.innerHTML = state.incomes
    .map((income) => `<option value="${income.id}">${income.sourceName} (${money.format(income.amount)})</option>`)
    .join("");
}

function renderExpenses() {
  expensesList.innerHTML = state.expenses
    .map(
      (expense) => `
      <li>
        <div>
          <strong>${expense.description}</strong>
          <div class="meta">${labelExpenseType(expense.type)} • ${money.format(expense.amount)}</div>
        </div>
        <button class="danger" data-action="delete-expense" data-id="${expense.id}">Excluir</button>
      </li>
    `,
    )
    .join("");

  expensesList.querySelectorAll("[data-action='delete-expense']").forEach((button) => {
    button.addEventListener("click", () => deleteExpense(button.dataset.id));
  });
}

function renderIncomes() {
  incomesList.innerHTML = state.incomes
    .map(
      (income) => `
      <li>
        <div>
          <strong>${income.sourceName}</strong>
          <div class="meta">${income.sourceType === "funcionario" ? "Funcionário" : "Cliente PJ"} • ${money.format(income.amount)}</div>
        </div>
        <button class="danger" data-action="delete-income" data-id="${income.id}">Excluir</button>
      </li>
    `,
    )
    .join("");

  incomesList.querySelectorAll("[data-action='delete-income']").forEach((button) => {
    button.addEventListener("click", () => deleteIncome(button.dataset.id));
  });
}

function renderExpenseAllocations() {
  expenseAllocationsList.innerHTML = state.expenseAllocations
    .map((allocation) => {
      const expense = state.expenses.find((item) => item.id === allocation.expenseId);
      if (!expense) return "";
      return `
      <li>
        <div>
          <strong>${expense.description}</strong>
          <div class="meta">Início: ${formatDate(allocation.startDate)} • ${allocation.repeat}</div>
        </div>
        <div class="actions">
          <button data-action="edit-expense-allocation" data-id="${allocation.id}">Alterar</button>
          <button class="danger" data-action="delete-expense-allocation" data-id="${allocation.id}">Excluir</button>
        </div>
      </li>`;
    })
    .join("");

  expenseAllocationsList.querySelectorAll("[data-action='delete-expense-allocation']").forEach((button) => {
    button.addEventListener("click", () => deleteExpenseAllocation(button.dataset.id));
  });

  expenseAllocationsList.querySelectorAll("[data-action='edit-expense-allocation']").forEach((button) => {
    button.addEventListener("click", () => editExpenseAllocation(button.dataset.id));
  });
}

function renderIncomeAllocations() {
  incomeAllocationsList.innerHTML = state.incomeAllocations
    .map((allocation) => {
      const income = state.incomes.find((item) => item.id === allocation.incomeId);
      if (!income) return "";
      return `
      <li>
        <div>
          <strong>${income.sourceName}</strong>
          <div class="meta">Início: ${formatDate(allocation.startDate)} • ${allocation.repeat}</div>
        </div>
        <div class="actions">
          <button data-action="edit-income-allocation" data-id="${allocation.id}">Alterar</button>
          <button class="danger" data-action="delete-income-allocation" data-id="${allocation.id}">Excluir</button>
        </div>
      </li>`;
    })
    .join("");

  incomeAllocationsList.querySelectorAll("[data-action='delete-income-allocation']").forEach((button) => {
    button.addEventListener("click", () => deleteIncomeAllocation(button.dataset.id));
  });

  incomeAllocationsList.querySelectorAll("[data-action='edit-income-allocation']").forEach((button) => {
    button.addEventListener("click", () => editIncomeAllocation(button.dataset.id));
  });
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter((item) => item.id !== id);
  state.expenseAllocations = state.expenseAllocations.filter((item) => item.expenseId !== id);
  saveState();
  renderAll();
}

function deleteIncome(id) {
  state.incomes = state.incomes.filter((item) => item.id !== id);
  state.incomeAllocations = state.incomeAllocations.filter((item) => item.incomeId !== id);
  saveState();
  renderAll();
}

function editExpenseAllocation(id) {
  const item = state.expenseAllocations.find((entry) => entry.id === id);
  if (!item) return;
  document.getElementById("allocation-expense-edit-id").value = item.id;
  document.getElementById("allocation-expense-id").value = item.expenseId;
  document.getElementById("allocation-expense-date").value = item.startDate;
  document.getElementById("allocation-expense-repeat").value = item.repeat;
}

function editIncomeAllocation(id) {
  const item = state.incomeAllocations.find((entry) => entry.id === id);
  if (!item) return;
  document.getElementById("allocation-income-edit-id").value = item.id;
  document.getElementById("allocation-income-id").value = item.incomeId;
  document.getElementById("allocation-income-date").value = item.startDate;
  document.getElementById("allocation-income-repeat").value = item.repeat;
}

function deleteExpenseAllocation(id) {
  state.expenseAllocations = state.expenseAllocations.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function deleteIncomeAllocation(id) {
  state.incomeAllocations = state.incomeAllocations.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function renderConsolidated() {
  const [year, month] = consolidatedMonth.value.split("-").map(Number);
  const totalExpenses = totalInMonth("expense", year, month);
  const totalIncomes = totalInMonth("income", year, month);
  const profit = totalIncomes - totalExpenses;
  const margin = totalIncomes > 0 ? (profit / totalIncomes) * 100 : 0;

  document.getElementById("consolidated-result").innerHTML = `
    <div class="metrics">
      <div class="metric"><strong>Receitas</strong><br/>${money.format(totalIncomes)}</div>
      <div class="metric"><strong>Despesas</strong><br/>${money.format(totalExpenses)}</div>
      <div class="metric"><strong>Rentabilidade</strong><br/>${money.format(profit)} (${margin.toFixed(2)}%)</div>
    </div>
  `;
}

function totalInMonth(kind, year, month) {
  if (!year || !month) return 0;
  const allocations = kind === "expense" ? state.expenseAllocations : state.incomeAllocations;
  const data = kind === "expense" ? state.expenses : state.incomes;

  return allocations.reduce((sum, allocation) => {
    const occurrences = calculateOccurrencesInMonth(allocation.startDate, allocation.repeat, year, month);
    const valueRef = data.find((item) => item.id === (kind === "expense" ? allocation.expenseId : allocation.incomeId));
    if (!valueRef) return sum;
    return sum + valueRef.amount * occurrences;
  }, 0);
}

function calculateOccurrencesInMonth(startDate, repeat, year, month) {
  const start = new Date(`${startDate}T00:00:00`);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  if (start > monthEnd) return 0;

  if (repeat === "mensal") {
    return 1;
  }

  let count = 0;
  let cursor = new Date(start);
  while (cursor <= monthEnd) {
    if (cursor >= monthStart) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 14);
  }
  return count;
}

function renderAnalytics() {
  const groupedExpenses = state.expenses.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.amount;
    return acc;
  }, {});

  const groupedIncome = state.incomes.reduce((acc, item) => {
    acc[item.sourceType] = (acc[item.sourceType] || 0) + item.amount;
    return acc;
  }, {});

  document.getElementById("analytics-output").innerHTML = `
    <div class="metrics">
      <div class="metric">
        <strong>Despesas por tipo</strong>
        <ul>
          <li>Fixa Residencial: ${money.format(groupedExpenses.residencial || 0)}</li>
          <li>Fixa Pessoal: ${money.format(groupedExpenses.pessoal || 0)}</li>
          <li>Extra: ${money.format(groupedExpenses.extra || 0)}</li>
        </ul>
      </div>
      <div class="metric">
        <strong>Receitas por origem</strong>
        <ul>
          <li>Funcionário: ${money.format(groupedIncome.funcionario || 0)}</li>
          <li>Cliente PJ: ${money.format(groupedIncome.cliente || 0)}</li>
        </ul>
      </div>
    </div>
  `;
}

function renderReport() {
  const period = document.getElementById("report-period").value;
  const [year, month] = reportBaseMonth.value.split("-").map(Number);
  if (!year || !month) return;

  const months = periodToMonths(period);
  const snapshots = [];

  for (let i = 0; i < months; i += 1) {
    const date = new Date(year, month - 1 + i, 1);
    const currentYear = date.getFullYear();
    const currentMonth = date.getMonth() + 1;
    const incomes = totalInMonth("income", currentYear, currentMonth);
    const expenses = totalInMonth("expense", currentYear, currentMonth);
    snapshots.push({
      label: `${String(currentMonth).padStart(2, "0")}/${currentYear}`,
      incomes,
      expenses,
      profit: incomes - expenses,
    });
  }

  const totalIncome = snapshots.reduce((sum, entry) => sum + entry.incomes, 0);
  const totalExpense = snapshots.reduce((sum, entry) => sum + entry.expenses, 0);
  const totalProfit = totalIncome - totalExpense;

  document.getElementById("report-output").innerHTML = `
    <p><strong>Resumo ${period}:</strong> Receitas ${money.format(totalIncome)} | Despesas ${money.format(totalExpense)} | Rentabilidade ${money.format(totalProfit)}</p>
    <table>
      <thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Rentabilidade</th></tr></thead>
      <tbody>
        ${snapshots
          .map(
            (entry) => `<tr><td>${entry.label}</td><td>${money.format(entry.incomes)}</td><td>${money.format(entry.expenses)}</td><td>${money.format(entry.profit)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function periodToMonths(period) {
  if (period === "mensal") return 1;
  if (period === "trimestral") return 3;
  if (period === "semestral") return 6;
  return 12;
}

function formatDate(dateText) {
  const [year, month, day] = dateText.split("-");
  return `${day}/${month}/${year}`;
}

function labelExpenseType(type) {
  if (type === "residencial") return "Fixa Residencial";
  if (type === "pessoal") return "Fixa Pessoal";
  return "Extra";
}


function downloadData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    data: state,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const datePart = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `gestao-financeira-backup-${datePart}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  backupStatus.textContent = "Backup gerado com sucesso.";
}

function uploadData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result));
      const incoming = payload.data || payload;

      state.expenses = Array.isArray(incoming.expenses) ? incoming.expenses : [];
      state.incomes = Array.isArray(incoming.incomes) ? incoming.incomes : [];
      state.expenseAllocations = Array.isArray(incoming.expenseAllocations) ? incoming.expenseAllocations : [];
      state.incomeAllocations = Array.isArray(incoming.incomeAllocations) ? incoming.incomeAllocations : [];

      saveState();
      renderAll();
      backupStatus.textContent = "Dados restaurados com sucesso.";
    } catch {
      backupStatus.textContent = "Arquivo inválido. Selecione um backup JSON gerado pelo sistema.";
    }
  };
  reader.readAsText(file);
}
