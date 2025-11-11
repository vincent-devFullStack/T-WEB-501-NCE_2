export function sanitizeSort(tableConfig, sortParam) {
  if (!sortParam) return tableConfig.defaultSort;
  const parts = sortParam
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!parts.length) return tableConfig.defaultSort;

  const allowedColumns = new Set(
    tableConfig.fields
      .map((field) => field.name)
      .filter((name) => name && name !== "password")
  );

  const parsed = [];
  for (const part of parts) {
    const [column, directionRaw] = part
      .split(":")
      .map((s) => s?.trim() ?? "");
    const direction = directionRaw?.toUpperCase() === "ASC" ? "ASC" : "DESC";
    if (!allowedColumns.has(column)) continue;
    parsed.push({ column, direction });
  }

  return parsed.length ? parsed : tableConfig.defaultSort;
}

export function buildOrderByClause(sortArray) {
  if (!Array.isArray(sortArray) || !sortArray.length) return "";
  const fragments = sortArray.map(
    ({ column, direction }) =>
      `\`${column}\` ${direction === "ASC" ? "ASC" : "DESC"}`
  );
  return fragments.length ? `ORDER BY ${fragments.join(", ")}` : "";
}

export function buildWhereClause(tableConfig, searchValue, params) {
  if (!searchValue || !tableConfig.searchColumns?.length) return "";
  const like = `%${searchValue}%`;
  const clauses = tableConfig.searchColumns.map((col) => {
    params.push(like);
    return `\`${col}\` LIKE ?`;
  });
  return clauses.length ? `WHERE (${clauses.join(" OR ")})` : "";
}

export function getSelectableColumns(tableConfig) {
  const columns = new Set([tableConfig.primaryKey]);
  for (const field of tableConfig.fields) {
    if (field.type === "password" || field.specialHandler) continue;
    if (field.name) columns.add(field.name);
  }
  return Array.from(columns);
}

export function getEditableFields(tableConfig, mode) {
  return tableConfig.fields.filter((field) => {
    if (!field.name || field.name === tableConfig.primaryKey) return false;
    if (field.type === "readonly") return false;
    if (field.specialHandler) return true;
    if (mode === "create") return field.creatable !== false;
    return field.editable !== false;
  });
}

export function normalizeFieldValue(field, raw) {
  if (raw === undefined) return { shouldUse: false };

  if (raw === null) return { shouldUse: true, value: null };

  const emptyLike =
    raw === "" || (typeof raw === "string" && raw.trim() === "");
  const baseType = field.type;

  if (field.specialHandler) {
    return { shouldUse: true, value: raw };
  }

  switch (baseType) {
    case "number": {
      if (emptyLike) return { shouldUse: true, value: null };
      const num = Number(raw);
      if (Number.isNaN(num)) {
        throw new Error(`Valeur numérique invalide pour ${field.label}`);
      }
      return { shouldUse: true, value: num };
    }
    case "boolean": {
      const truthy =
        raw === true || raw === "true" || raw === "1" || raw === 1;
      return { shouldUse: true, value: truthy ? 1 : 0 };
    }
    case "date":
    case "datetime": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw) };
    }
    case "select": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw) };
    }
    case "textarea":
    case "text":
    case "email":
    case "url": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw).trim() };
    }
    case "password": {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: String(raw) };
    }
    default: {
      if (emptyLike) return { shouldUse: true, value: null };
      return { shouldUse: true, value: raw };
    }
  }
}

export async function buildMutationPayload(tableConfig, body, mode) {
  const errors = [];
  const columns = [];
  const values = [];

  const fields = getEditableFields(tableConfig, mode);

  for (const field of fields) {
    const hasValue = Object.prototype.hasOwnProperty.call(body, field.name);
    if (
      !hasValue &&
      mode === "create" &&
      field.required &&
      !field.specialHandler
    ) {
      errors.push(`Le champ ${field.label} est requis.`);
      continue;
    }
    if (!hasValue) continue;

    const { shouldUse, value } = normalizeFieldValue(field, body[field.name]);
    if (!shouldUse) continue;

    if (field.specialHandler) {
      const specialResult = await field.specialHandler(value);
      if (specialResult && specialResult.column) {
        columns.push(`\`${specialResult.column}\``);
        values.push(specialResult.value);
      }
      continue;
    }

    if (field.type === "select" && field.options) {
      const allowed = new Set(field.options.map((opt) => opt.value));
      if (value != null && !allowed.has(value)) {
        errors.push(`Valeur invalide pour ${field.label}.`);
        continue;
      }
    }

    columns.push(`\`${field.name}\``);
    values.push(value);
  }

  if (errors.length) {
    const err = new Error(errors.join("\n"));
    err.statusCode = 422;
    throw err;
  }

  return { columns, values };
}

export default {
  sanitizeSort,
  buildOrderByClause,
  buildWhereClause,
  getSelectableColumns,
  getEditableFields,
  normalizeFieldValue,
  buildMutationPayload,
};
