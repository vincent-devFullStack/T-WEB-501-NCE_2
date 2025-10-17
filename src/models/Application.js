// src/models/Application.js
import { pool } from "../config/db.js";

function mapApplication(row) {
  if (!row) return null;
  return {
    id: row.application_id,
    adId: row.ad_id,
    personId: row.person_id,
    status: row.status,
    cvPath: row.cv_path,
    coverLetter: row.cover_letter,
    notes: row.notes,
    applicationDate: row.application_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSet(data) {
  const columns = {
    adId: "ad_id",
    personId: "person_id",
    status: "status",
    cvPath: "cv_path",
    coverLetter: "cover_letter",
    notes: "notes",
    applicationDate: "application_date",
  };

  const fields = [];
  const values = [];
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    const column = columns[key];
    if (!column) return;
    fields.push(`${column} = ?`);
    values.push(value);
  });

  return { clause: fields.join(", "), values };
}

export const Application = {
  async findById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM applications WHERE application_id = ? LIMIT 1",
      [id]
    );
    return mapApplication(rows[0]);
  },

  async listByAd(adId, { limit = 50, offset = 0 } = {}) {
    const [rows] = await pool.query(
      `SELECT *
       FROM applications
       WHERE ad_id = ?
       ORDER BY application_date DESC
       LIMIT ? OFFSET ?`,
      [adId, Number(limit), Number(offset)]
    );
    return rows.map(mapApplication);
  },

  async listByPerson(personId, { limit = 50, offset = 0 } = {}) {
    const [rows] = await pool.query(
      `SELECT *
       FROM applications
       WHERE person_id = ?
       ORDER BY application_date DESC
       LIMIT ? OFFSET ?`,
      [personId, Number(limit), Number(offset)]
    );
    return rows.map(mapApplication);
  },

  async create({
    adId,
    personId,
    status = "soumise",
    cvPath = null,
    coverLetter = null,
    notes = null,
  }) {
    const [result] = await pool.query(
      `INSERT INTO applications (ad_id, person_id, status, cv_path, cover_letter, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adId, personId, status, cvPath, coverLetter, notes]
    );
    return this.findById(result.insertId);
  },

  async update(id, data) {
    const { clause, values } = buildSet(data);
    if (!clause) return this.findById(id);
    await pool.query(
      `UPDATE applications SET ${clause} WHERE application_id = ?`,
      [...values, id]
    );
    return this.findById(id);
  },

  async remove(id) {
    const [result] = await pool.query(
      "DELETE FROM applications WHERE application_id = ?",
      [id]
    );
    return result.affectedRows > 0;
  },

  async listWithAdDetailsByPerson(
    personId,
    { statuses = null, limit = null, offset = 0 } = {}
  ) {
    const params = [personId];
    let statusClause = "";
    if (Array.isArray(statuses) && statuses.length) {
      const placeholders = statuses.map(() => "?").join(",");
      statusClause = ` AND ap.status IN (${placeholders})`;
      params.push(...statuses);
    }

    let limitClause = "";
    if (Number.isInteger(limit)) {
      limitClause = " LIMIT ? OFFSET ?";
      params.push(Number(limit), Number(offset));
    }

    const [rows] = await pool.query(
      `SELECT
        ap.application_id,
        ap.application_date,
        ap.updated_at,
        ap.status,
        ap.cv_path,
        ap.cover_letter,
        ap.notes,
        ap.person_id,
        a.ad_id,
        a.job_title,
        a.location,
        a.contract_type,
        a.salary_min,
        a.salary_max,
        a.currency,
        a.deadline_date,
        c.company_name
      FROM applications ap
      JOIN advertisements a ON a.ad_id = ap.ad_id
      LEFT JOIN companies c ON c.company_id = a.company_id
      WHERE ap.person_id = ?${statusClause}
      ORDER BY ap.application_date DESC${limitClause}`,
      params
    );
    return rows;
  },

  async countByStatusForPerson(personId) {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM applications
       WHERE person_id = ?
       GROUP BY status`,
      [personId]
    );
    return rows.reduce((acc, row) => {
      acc[row.status] = Number(row.count) || 0;
      return acc;
    }, {});
  },
};

export default Application;
