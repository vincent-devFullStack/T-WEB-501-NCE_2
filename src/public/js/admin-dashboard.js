const rawTables = Array.isArray(window.__ADMIN_TABLES__) ? window.__ADMIN_TABLES__ : [];
const tablesMap = new Map(
  rawTables.map((table) => [
    table.table,
    {
      ...table,
      fields: table.fields.map((field) => ({
        ...field,
        optionsMap: field.options
          ? new Map(field.options.map((opt) => [String(opt.value), opt.label]))
          : null,
      })),
    },
  ])
);

const elements = {
  tabs: document.querySelectorAll(".dashboard-tab"),
  tableTitle: document.getElementById("admin-table-title"),
  tableDescription: document.getElementById("admin-table-description"),
  tableHead: document.querySelector("#admin-data-table thead"),
  tableBody: document.querySelector("#admin-data-table tbody"),
  table: document.getElementById("admin-data-table"),
  searchInput: document.getElementById("admin-table-search"),
  createButton: document.getElementById("admin-create-btn"),
  prevButton: document.getElementById("admin-prev-page"),
  nextButton: document.getElementById("admin-next-page"),
  currentPageLabel: document.getElementById("admin-current-page"),
  paginationInfo: document.getElementById("admin-pagination-info"),
  pageSizeSelect: document.getElementById("admin-page-size"),
  modal: document.getElementById("admin-modal"),
  modalTitle: document.getElementById("admin-modal-title"),
  modalClose: document.getElementById("admin-modal-close"),
  modalCancel: document.getElementById("admin-form-cancel"),
  modalForm: document.getElementById("admin-form"),
  modalFieldsContainer: document.getElementById("admin-form-fields"),
  toastContainer: document.getElementById("admin-toast-container"),
};

const state = {
  currentTable: rawTables[0]?.table ?? null,
  page: 1,
  limit: Number(elements.pageSizeSelect?.value || 10),
  total: 0,
  search: "",
  rows: [],
  isLoading: false,
  formMode: "create",
  editingId: null,
};

let searchDebounceTimer = null;

function showToast(message, type = "info", timeout = 4000) {
  if (!elements.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `admin-toast${type === "error" ? " is-error" : ""}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button type="button" aria-label="Fermer">✕</button>
  `;
  const removeToast = () => toast.remove();
  toast.querySelector("button")?.addEventListener("click", removeToast);
  elements.toastContainer.appendChild(toast);
  setTimeout(removeToast, timeout);
}

function setLoading(isLoading) {
  state.isLoading = isLoading;
  if (isLoading) {
    elements.tableBody.innerHTML = `
      <tr>
        <td class="loading-cell">Chargement des données…</td>
      </tr>
    `;
  }
}

function formatDate(value, withTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return withTime
    ? date.toLocaleString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("fr-FR");
}

function truncate(value, length = 120) {
  if (!value) return "—";
  const str = String(value);
  return str.length > length ? `${str.slice(0, length)}…` : str;
}

function formatCell(field, value) {
  if (value === null || value === undefined) return "—";

  switch (field.type) {
    case "boolean":
      return Number(value) === 1 || value === true ? "Oui" : "Non";
    case "date":
      return formatDate(value, false);
    case "datetime":
      return formatDate(value, true);
    case "textarea":
      return truncate(value, 160);
    case "select": {
      const map = field.optionsMap;
      if (map) {
        const label = map.get(String(value));
        if (label) return label;
      }
      return String(value);
    }
    case "url":
      return `<a href="${value}" target="_blank" rel="noopener">${truncate(value, 40)}</a>`;
    default:
      return String(value);
  }
}

function renderTableHeader(tableConfig) {
  if (!elements.tableHead) return;
  const columns = tableConfig.fields.filter((field) => field.showInTable);
  const headerCells = columns
    .map((field) => `<th scope="col">${field.label}</th>`)
    .join("");
  elements.tableHead.innerHTML = `
    <tr>
      ${headerCells}
      <th scope="col">Actions</th>
    </tr>
  `;
}

function renderTableBody(tableConfig) {
  if (!elements.tableBody) return;
  if (!state.rows.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td class="loading-cell">Aucun enregistrement à afficher.</td>
      </tr>
    `;
    return;
  }

  const columns = tableConfig.fields.filter((field) => field.showInTable);
  const rowsHtml = state.rows
    .map((row) => {
      const cells = columns
        .map((field) => `<td data-field="${field.name}">${formatCell(field, row[field.name])}</td>`)
        .join("");
      return `
        <tr data-row-id="${row[tableConfig.primaryKey]}" tabindex="0">
          ${cells}
          <td>
            <div class="table-actions">
              <button type="button" class="btn-action edit" data-action="edit" data-id="${row[tableConfig.primaryKey]}">Modifier</button>
              <button type="button" class="btn-action delete" data-action="delete" data-id="${row[tableConfig.primaryKey]}">Supprimer</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  elements.tableBody.innerHTML = rowsHtml;
}

function renderPagination() {
  if (!elements.currentPageLabel || !elements.paginationInfo) return;
  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  elements.currentPageLabel.textContent = `Page ${state.page} / ${totalPages}`;
  elements.paginationInfo.textContent = `${state.total} enregistrement${
    state.total > 1 ? "s" : ""
  } au total`;

  elements.prevButton.disabled = state.page <= 1;
  elements.nextButton.disabled = state.page >= totalPages;
}

async function fetchTableData() {
  const tableKey = state.currentTable;
  const tableConfig = tablesMap.get(tableKey);
  if (!tableConfig) return;

  setLoading(true);
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
  });
  if (state.search) params.set("q", state.search);

  try {
    const response = await fetch(`/api/admin/${tableKey}?${params.toString()}`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const data = await response.json();
    state.rows = data.rows ?? [];
    state.total = data.total ?? 0;
    if (state.page > 1 && state.rows.length === 0) {
      state.page = Math.max(1, state.page - 1);
      return fetchTableData();
    }
    renderTableHeader(tableConfig);
    renderTableBody(tableConfig);
    renderPagination();
  } catch (error) {
    console.error("[ADMIN][FETCH]", error);
    showToast("Impossible de charger les données.", "error");
    elements.tableBody.innerHTML = `
      <tr>
        <td class="loading-cell">Erreur lors du chargement.</td>
      </tr>
    `;
  } finally {
    setLoading(false);
  }
}

function refreshPanelHeader(tableConfig) {
  if (elements.tableTitle) elements.tableTitle.textContent = tableConfig.label;
  if (elements.tableDescription) elements.tableDescription.textContent = tableConfig.description ?? "";
}

function switchTable(newTable) {
  if (!tablesMap.has(newTable)) return;
  state.currentTable = newTable;
  state.page = 1;
  state.search = "";
  if (elements.searchInput) elements.searchInput.value = "";
  if (elements.table) elements.table.dataset.table = newTable;
  elements.tabs.forEach((tab) => {
    const isActive = tab.dataset.table === newTable;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  const tableConfig = tablesMap.get(newTable);
  refreshPanelHeader(tableConfig);
  fetchTableData();
}

function openModal(mode, tableConfig, row = null) {
  if (!elements.modal) return;
  state.formMode = mode;
  state.editingId = row ? row[tableConfig.primaryKey] : null;

  elements.modalTitle.textContent =
    mode === "create" ? `Nouvel enregistrement – ${tableConfig.label}` : `Modifier ${tableConfig.label}`;

  const fields = tableConfig.fields.filter((field) => {
    if (field.type === "readonly") return false;
    if (mode === "create") return field.creatable !== false;
    return field.editable !== false;
  });

  elements.modalFieldsContainer.innerHTML = fields
    .map((field) => renderFormField(field, row ? row[field.name] : null))
    .join("");

  elements.modal.classList.add("is-visible");
  elements.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  const firstInput = elements.modalFieldsContainer.querySelector("input, select, textarea");
  firstInput?.focus();
}

function closeModal() {
  if (!elements.modal) return;
  elements.modal.classList.remove("is-visible");
  elements.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  state.editingId = null;
}

function renderFormField(field, value) {
  const safeValue = value ?? "";

  switch (field.type) {
    case "textarea":
      return `
        <div class="admin-form-group">
          <label for="field-${field.name}">${field.label}${field.required ? " *" : ""}</label>
          <textarea id="field-${field.name}" name="${field.name}" ${
        field.required ? "required" : ""
      }>${safeValue ? String(safeValue) : ""}</textarea>
        </div>
      `;
    case "select": {
      const options = (field.options ?? [])
        .map(
          (opt) => `
          <option value="${opt.value}" ${String(safeValue) === String(opt.value) ? "selected" : ""}>
            ${opt.label}
          </option>`
        )
        .join("");
      return `
        <div class="admin-form-group">
          <label for="field-${field.name}">${field.label}${field.required ? " *" : ""}</label>
          <select id="field-${field.name}" name="${field.name}" ${field.required ? "required" : ""}>
            <option value=""></option>
            ${options}
          </select>
        </div>
      `;
    }
    case "boolean": {
      const isChecked = safeValue === 1 || safeValue === true || safeValue === "1";
      return `
        <div class="admin-form-group">
          <label>
            <input type="checkbox" name="${field.name}" ${isChecked ? "checked" : ""}/>
            ${field.label}
          </label>
        </div>
      `;
    }
    case "date": {
      const formatted = safeValue ? formatInputDateValue(safeValue) : "";
      return `
        <div class="admin-form-group">
          <label for="field-${field.name}">${field.label}${field.required ? " *" : ""}</label>
          <input type="date" id="field-${field.name}" name="${field.name}" value="${formatted}" ${
        field.required ? "required" : ""
      } />
        </div>
      `;
    }
    case "datetime": {
      const formatted = safeValue ? formatInputDateTimeValue(safeValue) : "";
      return `
        <div class="admin-form-group">
          <label for="field-${field.name}">${field.label}${field.required ? " *" : ""}</label>
          <input type="datetime-local" id="field-${field.name}" name="${field.name}" value="${formatted}" ${
        field.required ? "required" : ""
      } />
        </div>
      `;
    }
    case "number":
      return `
        <div class="admin-form-group">
          <label for="field-${field.name}">${field.label}${field.required ? " *" : ""}</label>
          <input type="number" id="field-${field.name}" name="${field.name}" value="${safeValue}" ${
        field.required ? "required" : ""
      } ${field.step ? `step="${field.step}"` : ""}/>
        </div>
      `;
    case "password":
      return `
        <div class="admin-form-group">
          <label for="field-${field.name}">${field.label}${field.required && state.formMode === "create" ? " *" : ""}</label>
          <input type="password" id="field-${field.name}" name="${field.name}" ${
        field.required && state.formMode === "create" ? "required" : ""
      } autocomplete="new-password"/>
        </div>
      `;
    default:
      return `
        <div class="admin-form-group">
          <label for="field-${field.name}">${field.label}${field.required ? " *" : ""}</label>
          <input type="${field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}"
                 id="field-${field.name}"
                 name="${field.name}"
                 value="${safeValue ? String(safeValue) : ""}"
                 ${field.required ? "required" : ""}/>
        </div>
      `;
  }
}

function formatInputDateValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatInputDateTimeValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const iso = date.toISOString();
  return iso.slice(0, 16);
}

function collectFormData(tableConfig) {
  const formData = new FormData(elements.modalForm);
  const payload = {};

  tableConfig.fields.forEach((field) => {
    if (field.type === "readonly") return;
    const isCreate = state.formMode === "create";
    const allowed = isCreate ? field.creatable !== false : field.editable !== false;
    if (!allowed && field.type !== "boolean") return;

    if (field.type === "boolean") {
      payload[field.name] = formData.get(field.name) ? 1 : 0;
      return;
    }

    if (!formData.has(field.name)) return;
    const value = formData.get(field.name);
    payload[field.name] = value;
  });

  return payload;
}

async function submitForm(event) {
  event.preventDefault();
  const tableKey = state.currentTable;
  const tableConfig = tablesMap.get(tableKey);
  if (!tableConfig) return;

  const payload = collectFormData(tableConfig);
  const isEdit = state.formMode === "edit";
  const url = isEdit
    ? `/api/admin/${tableKey}/${state.editingId}`
    : `/api/admin/${tableKey}`;
  const method = isEdit ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    closeModal();
    showToast(isEdit ? "Enregistrement mis à jour." : "Enregistrement créé.");
    fetchTableData();
  } catch (error) {
    console.error("[ADMIN][SUBMIT]", error);
    showToast("Impossible d'enregistrer les modifications.", "error");
  }
}

async function handleDelete(id) {
  const tableKey = state.currentTable;
  if (!window.confirm("Voulez-vous vraiment supprimer cet enregistrement ?")) {
    return;
  }
  try {
    const response = await fetch(`/api/admin/${tableKey}/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    showToast("Enregistrement supprimé.");
    fetchTableData();
  } catch (error) {
    console.error("[ADMIN][DELETE]", error);
    showToast("Suppression impossible.", "error");
  }
}

function attachEventListeners() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTable(tab.dataset.table));
  });

  elements.searchInput?.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      state.search = value;
      state.page = 1;
      fetchTableData();
    }, 350);
  });

  elements.pageSizeSelect?.addEventListener("change", (event) => {
    state.limit = Number(event.target.value) || 10;
    state.page = 1;
    fetchTableData();
  });

  elements.prevButton?.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      fetchTableData();
    }
  });

  elements.nextButton?.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    if (state.page < totalPages) {
      state.page += 1;
      fetchTableData();
    }
  });

  elements.createButton?.addEventListener("click", () => {
    const tableConfig = tablesMap.get(state.currentTable);
    if (!tableConfig) return;
    openModal("create", tableConfig);
  });

  elements.tableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    const tableConfig = tablesMap.get(state.currentTable);
    if (!tableConfig) return;

    if (action === "edit") {
      const row = state.rows.find((item) => item[tableConfig.primaryKey] === id);
      openModal("edit", tableConfig, row);
    } else if (action === "delete") {
      handleDelete(id);
    }
  });

  elements.modalClose?.addEventListener("click", closeModal);
  elements.modalCancel?.addEventListener("click", closeModal);
  elements.modal?.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeModal();
  });

  elements.modalForm?.addEventListener("submit", submitForm);
}

function initialiseView() {
  if (!state.currentTable) {
    if (elements.tableBody) {
      elements.tableBody.innerHTML = `
        <tr><td class="loading-cell">Aucune table configurée.</td></tr>
      `;
    }
    return;
  }
  if (elements.table) elements.table.dataset.table = state.currentTable;
  const tableConfig = tablesMap.get(state.currentTable);
  refreshPanelHeader(tableConfig);
  fetchTableData();
}

attachEventListeners();
initialiseView();
