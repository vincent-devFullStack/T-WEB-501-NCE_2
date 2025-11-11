import { pool } from "../config/db.js";
import {
  isMockDataEnabled,
  mockAdminRepository,
} from "../services/mockData.js";
import {
  sanitizeSort,
  buildOrderByClause,
  buildWhereClause,
  getSelectableColumns,
  getEditableFields,
  normalizeFieldValue,
  buildMutationPayload,
} from "./adminRepositoryUtils.js";

export const AdminRepository = {
  sanitizeSort,
  buildOrderByClause,
  buildWhereClause,
  getSelectableColumns,
  getEditableFields,
  normalizeFieldValue,
  buildMutationPayload,

  async list(tableKey, tableConfig, { page = 1, limit = 10, search = "", sort = null }) {
    if (isMockDataEnabled()) {
      return mockAdminRepository.list(tableKey, tableConfig, {
        page,
        limit,
        search,
        sort,
      });
    }
    const offset = (page - 1) * limit;
    const whereParams = [];
    const whereClause = buildWhereClause(tableConfig, search, whereParams);
    const sortArray = sanitizeSort(tableConfig, sort);
    const orderByClause = buildOrderByClause(sortArray);
    const columns = getSelectableColumns(tableConfig)
      .map((col) => `\`${col}\``)
      .join(", ");

    const baseSql = `
      FROM \`${tableKey}\`
      ${whereClause}
    `;

    const dataSql = `
      SELECT ${columns}
      ${baseSql}
      ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [
      ...whereParams,
      Number(limit),
      Number(offset),
    ]);

    const countSql = `
      SELECT COUNT(*) AS total
      ${baseSql}
    `;
    const [[{ total }]] = await pool.query(countSql, whereParams);

    return {
      items: rows,
      total: Number(total || 0),
    };
  },

  async findById(tableKey, tableConfig, id) {
    if (isMockDataEnabled()) {
      return mockAdminRepository.findById(tableKey, tableConfig, id);
    }
    const columns = getSelectableColumns(tableConfig)
      .map((col) => `\`${col}\``)
      .join(", ");
    const sql = `
      SELECT ${columns}
      FROM \`${tableKey}\`
      WHERE \`${tableConfig.primaryKey}\` = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows[0] || null;
  },

  async create(tableKey, tableConfig, body) {
    if (isMockDataEnabled()) {
      return mockAdminRepository.create(tableKey, tableConfig, body);
    }
    const { columns, values } = await buildMutationPayload(
      tableConfig,
      body,
      "create"
    );
    if (!columns.length) {
      throw new Error("Aucune donnée fournie");
    }
    const sql = `
      INSERT INTO \`${tableKey}\` (${columns.join(", ")})
      VALUES (${columns.map(() => "?").join(", ")})
    `;
    const [result] = await pool.query(sql, values);
    return this.findById(tableKey, tableConfig, result.insertId);
  },

  async update(tableKey, tableConfig, id, body) {
    if (isMockDataEnabled()) {
      return mockAdminRepository.update(tableKey, tableConfig, id, body);
    }
    const { columns, values } = await buildMutationPayload(
      tableConfig,
      body,
      "update"
    );
    if (!columns.length) {
      return this.findById(tableKey, tableConfig, id);
    }
    const assignments = columns.map((col) => `${col} = ?`).join(", ");
    const sql = `
      UPDATE \`${tableKey}\`
      SET ${assignments}
      WHERE \`${tableConfig.primaryKey}\` = ?
    `;
    await pool.query(sql, [...values, id]);
    return this.findById(tableKey, tableConfig, id);
  },

  async remove(tableKey, tableConfig, id) {
    if (isMockDataEnabled()) {
      return mockAdminRepository.remove(tableKey, tableConfig, id);
    }
    const sql = `
      DELETE FROM \`${tableKey}\`
      WHERE \`${tableConfig.primaryKey}\` = ?
    `;
    const [result] = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  },
};

export default AdminRepository;
