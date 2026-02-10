const STORAGE_KEY = "gestao_financeira_v2";

const state = loadState();
let lastReportData = null;

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const typeLabels = { residencial: "Fixa Residencial", pessoal: "Fixa Pessoal", extra: "Extra" };
const incomeLabels = { funcionario: "Funcionário", cliente: "Cliente (PJ)" };

const expenseForm = document.getElementById("expense-form");
const incomeForm = document.getElementById("income-form");
const expenseAllocationForm = document.getElementById("expense-allocation-form");
const incomeAllocationForm = document.getElementById("income-allocation-form");
const consolidatedMonth = document.getElementById("consolidated-month");
const reportBaseMonth = document.getElementById("report-base-month");

wireNavigation();
wireForms();
setDefaultDates();
renderAll();

function wireNavigation() {
  const navButtons = document.querySelectorAll(".nav-link");
  const pages = document.querySelectorAll(".page");
  const pageTitle = document.getElementById("page-title");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.page;
      navButtons.forEach((item) => item.classList.toggle("active", item === button));
      pages.forEach((page) => page.classList.toggle("active", page.dataset.page === target));
      pageTitle.textContent = button.textContent;
    });
  });
}

function wireForms() {
  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const description = document.getElementById("expense-description").value.trim();
    const type = document.getElementById("expense-type").value;
    const amount = Number(document.getElementById("expense-amount").value);
    if (!description || amount <= 0) return;

    state.expenses.push({ id: crypto.randomUUID(), description, type, amount });
    expenseForm.reset();
    persistAndRender();
  });

  incomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const sourceType = document.getElementById("income-type").value;
    const sourceName = document.getElementById("income-source").value.trim();
    const amount = Number(document.getElementById("income-amount").value);
    if (!sourceName || amount <= 0) return;

    state.incomes.push({ id: crypto.randomUUID(), sourceType, sourceName, amount });
    incomeForm.reset();
    persistAndRender();
  });

  expenseAllocationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = {
      expenseId: document.getElementById("allocation-expense-id").value,
      startDate: document.getElementById("allocation-expense-date").value,
      repeat: document.getElementById("allocation-expense-repeat").value,
    };
    const editId = document.getElementById("allocation-expense-edit-id").value;
    if (!payload.expenseId || !payload.startDate) return;

    if (editId) {
      const current = state.expenseAllocations.find((item) => item.id === editId);
      if (current) Object.assign(current, payload);
    } else {
      state.expenseAllocations.push({ id: crypto.randomUUID(), ...payload });
    }

    expenseAllocationForm.reset();
    document.getElementById("allocation-expense-edit-id").value = "";
    setDefaultDates();
    persistAndRender();
  });

  incomeAllocationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = {
      incomeId: document.getElementById("allocation-income-id").value,
      startDate: document.getElementById("allocation-income-date").value,
      repeat: document.getElementById("allocation-income-repeat").value,
    };
    const editId = document.getElementById("allocation-income-edit-id").value;
    if (!payload.incomeId || !payload.startDate) return;

    if (editId) {
      const current = state.incomeAllocations.find((item) => item.id === editId);
      if (current) Object.assign(current, payload);
    } else {
      state.incomeAllocations.push({ id: crypto.randomUUID(), ...payload });
    }

    incomeAllocationForm.reset();
    document.getElementById("allocation-income-edit-id").value = "";
    setDefaultDates();
    persistAndRender();
  });

  document.getElementById("expense-allocation-cancel").addEventListener("click", () => {
    expenseAllocationForm.reset();
    document.getElementById("allocation-expense-edit-id").value = "";
    setDefaultDates();
  });

  document.getElementById("income-allocation-cancel").addEventListener("click", () => {
    incomeAllocationForm.reset();
    document.getElementById("allocation-income-edit-id").value = "";
    setDefaultDates();
  });

  document.getElementById("refresh-consolidated").addEventListener("click", renderConsolidated);
  document.getElementById("generate-report").addEventListener("click", generateReport);
  document.getElementById("export-report-pdf").addEventListener("click", exportReportPdf);

  document.getElementById("download-data").addEventListener("click", downloadDataBackup);
  document.getElementById("upload-data").addEventListener("change", restoreDataBackup);
}

function renderAll() {
  renderExpenseOptions();
  renderIncomeOptions();
  renderExpenses();
  renderIncomes();
  renderExpenseAllocations();
  renderIncomeAllocations();
  renderConsolidated();
}

function renderExpenseOptions() {
  const select = document.getElementById("allocation-expense-id");
  select.innerHTML = state.expenses.map((item) => `<option value="${item.id}">${item.description}</option>`).join("");
}

function renderIncomeOptions() {
  const select = document.getElementById("allocation-income-id");
  select.innerHTML = state.incomes.map((item) => `<option value="${item.id}">${item.sourceName}</option>`).join("");
}

function renderExpenses() {
  const list = document.getElementById("expenses-list");
  list.innerHTML = state.expenses
    .map((item) => `
      <li>
        <div>
          <strong>${item.description}</strong>
          <div class="meta">${typeLabels[item.type]} • ${money.format(item.amount)}</div>
        </div>
        <button class="danger" data-delete-expense="${item.id}">Excluir</button>
      </li>
    `)
    .join("");

  list.querySelectorAll("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteExpense;
      state.expenses = state.expenses.filter((item) => item.id !== id);
      state.expenseAllocations = state.expenseAllocations.filter((item) => item.expenseId !== id);
      persistAndRender();
    });
  });
}

function renderIncomes() {
  const list = document.getElementById("incomes-list");
  list.innerHTML = state.incomes
    .map((item) => `
      <li>
        <div>
          <strong>${item.sourceName}</strong>
          <div class="meta">${incomeLabels[item.sourceType]} • ${money.format(item.amount)}</div>
        </div>
        <button class="danger" data-delete-income="${item.id}">Excluir</button>
      </li>
    `)
    .join("");

  list.querySelectorAll("[data-delete-income]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteIncome;
      state.incomes = state.incomes.filter((item) => item.id !== id);
      state.incomeAllocations = state.incomeAllocations.filter((item) => item.incomeId !== id);
      persistAndRender();
    });
  });
}

function renderExpenseAllocations() {
  const list = document.getElementById("expense-allocations-list");
  list.innerHTML = state.expenseAllocations
    .map((allocation) => {
      const expense = state.expenses.find((item) => item.id === allocation.expenseId);
      if (!expense) return "";
      return `
        <li>
          <div>
            <strong>${expense.description}</strong>
            <div class="meta">${formatDate(allocation.startDate)} • ${allocation.repeat}</div>
          </div>
          <div class="actions">
            <button class="secondary" data-edit-expense-allocation="${allocation.id}">Alterar</button>
            <button class="danger" data-delete-expense-allocation="${allocation.id}">Excluir</button>
          </div>
        </li>
      `;
    })
    .join("");

  list.querySelectorAll("[data-delete-expense-allocation]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteExpenseAllocation;
      state.expenseAllocations = state.expenseAllocations.filter((item) => item.id !== id);
      persistAndRender();
    });
  });

  list.querySelectorAll("[data-edit-expense-allocation]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.expenseAllocations.find((entry) => entry.id === button.dataset.editExpenseAllocation);
      if (!item) return;
      document.getElementById("allocation-expense-edit-id").value = item.id;
      document.getElementById("allocation-expense-id").value = item.expenseId;
      document.getElementById("allocation-expense-date").value = item.startDate;
      document.getElementById("allocation-expense-repeat").value = item.repeat;
    });
  });
}

function renderIncomeAllocations() {
  const list = document.getElementById("income-allocations-list");
  list.innerHTML = state.incomeAllocations
    .map((allocation) => {
      const income = state.incomes.find((item) => item.id === allocation.incomeId);
      if (!income) return "";
      return `
        <li>
          <div>
            <strong>${income.sourceName}</strong>
            <div class="meta">${formatDate(allocation.startDate)} • ${allocation.repeat}</div>
          </div>
          <div class="actions">
            <button class="secondary" data-edit-income-allocation="${allocation.id}">Alterar</button>
            <button class="danger" data-delete-income-allocation="${allocation.id}">Excluir</button>
          </div>
        </li>
      `;
    })
    .join("");

  list.querySelectorAll("[data-delete-income-allocation]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteIncomeAllocation;
      state.incomeAllocations = state.incomeAllocations.filter((item) => item.id !== id);
      persistAndRender();
    });
  });

  list.querySelectorAll("[data-edit-income-allocation]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.incomeAllocations.find((entry) => entry.id === button.dataset.editIncomeAllocation);
      if (!item) return;
      document.getElementById("allocation-income-edit-id").value = item.id;
      document.getElementById("allocation-income-id").value = item.incomeId;
      document.getElementById("allocation-income-date").value = item.startDate;
      document.getElementById("allocation-income-repeat").value = item.repeat;
    });
  });
}

function renderConsolidated() {
  const [year, month] = consolidatedMonth.value.split("-").map(Number);
  const totalExpenses = totalInMonth("expense", year, month);
  const totalIncomes = totalInMonth("income", year, month);
  const profit = totalIncomes - totalExpenses;
  const margin = totalIncomes > 0 ? (profit / totalIncomes) * 100 : 0;

  document.getElementById("consolidated-result").innerHTML = `
    <div class="metric"><span>Receitas</span><strong>${money.format(totalIncomes)}</strong></div>
    <div class="metric"><span>Despesas</span><strong>${money.format(totalExpenses)}</strong></div>
    <div class="metric"><span>Rentabilidade</span><strong>${money.format(profit)} (${margin.toFixed(2)}%)</strong></div>
  `;

  const topExpenses = [...state.expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((item) => `<li>${item.description}: ${money.format(item.amount)}</li>`)
    .join("");

  document.getElementById("analytics-output").innerHTML = `
    <h4>Visão analítica rápida</h4>
    <p>Total de despesas cadastradas: <strong>${state.expenses.length}</strong></p>
    <p>Total de receitas cadastradas: <strong>${state.incomes.length}</strong></p>
    <p>Principais despesas:</p>
    <ul>${topExpenses || "<li>Nenhuma despesa cadastrada.</li>"}</ul>
  `;
}

function generateReport() {
  const period = document.getElementById("report-period").value;
  const [baseYear, baseMonth] = reportBaseMonth.value.split("-").map(Number);
  const monthsCount = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 }[period];

  const rows = [];
  for (let i = 0; i < monthsCount; i += 1) {
    const date = new Date(baseYear, baseMonth - 1 - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const expenses = totalInMonth("expense", year, month);
    const incomes = totalInMonth("income", year, month);
    rows.push({ year, month, expenses, incomes, result: incomes - expenses });
  }

  rows.reverse();
  lastReportData = { period, rows };

  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${String(row.month).padStart(2, "0")}/${row.year}</td>
        <td>${money.format(row.incomes)}</td>
        <td>${money.format(row.expenses)}</td>
        <td>${money.format(row.result)}</td>
      </tr>
    `,
    )
    .join("");

  document.getElementById("report-output").innerHTML = `
    <table class="report-table">
      <thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Resultado</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
}

function exportReportPdf() {
  if (!lastReportData || !window.jspdf) {
    alert("Gere o relatório antes de exportar para PDF.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Relatório Analítico Financeiro", 14, 16);
  doc.setFontSize(11);
  doc.text(`Período: ${lastReportData.period}`, 14, 24);

  let y = 34;
  doc.text("Mês", 14, y);
  doc.text("Receitas", 55, y);
  doc.text("Despesas", 105, y);
  doc.text("Resultado", 155, y);
  y += 8;

  lastReportData.rows.forEach((row) => {
    const monthLabel = `${String(row.month).padStart(2, "0")}/${row.year}`;
    doc.text(monthLabel, 14, y);
    doc.text(money.format(row.incomes), 55, y);
    doc.text(money.format(row.expenses), 105, y);
    doc.text(money.format(row.result), 155, y);
    y += 8;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  const dateTag = new Date().toISOString().slice(0, 10);
  doc.save(`relatorio-analitico-${dateTag}.pdf`);
}

function totalInMonth(kind, year, month) {
  const allocations = kind === "expense" ? state.expenseAllocations : state.incomeAllocations;
  const items = kind === "expense" ? state.expenses : state.incomes;

  return allocations.reduce((acc, allocation) => {
    const targetDate = new Date(year, month - 1, 1);
    const startDate = new Date(`${allocation.startDate}T00:00:00`);
    if (startDate > targetDate) return acc;

    const itemId = kind === "expense" ? allocation.expenseId : allocation.incomeId;
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return acc;

    const multiplier = allocation.repeat === "quinzenal" ? 2 : 1;
    return acc + item.amount * multiplier;
  }, 0);
}

function downloadDataBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `gestao-financeira-backup-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  setBackupStatus("Backup baixado com sucesso.", false);
}

function restoreDataBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.expenses || !parsed.incomes || !parsed.expenseAllocations || !parsed.incomeAllocations) {
        throw new Error("Estrutura inválida");
      }

      state.expenses = parsed.expenses;
      state.incomes = parsed.incomes;
      state.expenseAllocations = parsed.expenseAllocations;
      state.incomeAllocations = parsed.incomeAllocations;
      persistAndRender();
      setBackupStatus("Backup restaurado com sucesso.", false);
    } catch (error) {
      setBackupStatus("Falha ao restaurar: arquivo inválido.", true);
    }
  };

  reader.readAsText(file);
}

function setBackupStatus(message, isError) {
  const element = document.getElementById("backup-status");
  element.textContent = message;
  element.style.color = isError ? "#b91c1c" : "#166534";
}

function setDefaultDates() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  if (!consolidatedMonth.value) consolidatedMonth.value = currentMonth;
  if (!reportBaseMonth.value) reportBaseMonth.value = currentMonth;
  if (!document.getElementById("allocation-expense-date").value) {
    document.getElementById("allocation-expense-date").value = today;
  }
  if (!document.getElementById("allocation-income-date").value) {
    document.getElementById("allocation-income-date").value = today;
  }
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { expenses: [], incomes: [], expenseAllocations: [], incomeAllocations: [] };
    }

    const parsed = JSON.parse(raw);
    return {
      expenses: parsed.expenses || [],
      incomes: parsed.incomes || [],
      expenseAllocations: parsed.expenseAllocations || [],
      incomeAllocations: parsed.incomeAllocations || [],
    };
  } catch (error) {
    return { expenses: [], incomes: [], expenseAllocations: [], incomeAllocations: [] };
  }
}
