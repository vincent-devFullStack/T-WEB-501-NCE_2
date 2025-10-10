// src/models/Application.js
import { pool } from "../config/db.js";

function mapApplication(r) {
  if (!r) return null;
  return {
    id: r.application_id,
    adId: r.ad_id,
    applicantId: r.applicant_id, // person_id du candidat
    status: r.status, // ex: 'submitted' | 'review' | 'rejected' | 'accepted'
    cvUrl: r.cv_url,
    message: r.message,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function buildSet(data) {
  const map = {
    adId: "ad_id",
    applicantId: "applicant_id",
    status: "status",
    cvUrl: "cv_url",
    message: "message",
  };
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue;
    const col = map[k];
    if (!col) continue;
    fields.push(`${col} = ?`);
    values.push(v);
  }
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
      `SELECT * FROM applications
       WHERE ad_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [adId, Number(limit), Number(offset)]
    );
    return rows.map(mapApplication);
  },

  async listByUser(userId, { limit = 50, offset = 0 } = {}) {
    const [rows] = await pool.query(
      `SELECT * FROM applications
       WHERE applicant_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, Number(limit), Number(offset)]
    );
    return rows.map(mapApplication);
  },

  async create({
    adId,
    applicantId,
    status = "submitted",
    cvUrl = null,
    message = null,
  }) {
    const [r] = await pool.query(
      `INSERT INTO applications (ad_id, applicant_id, status, cv_url, message)
       VALUES (?, ?, ?, ?, ?)`,
      [adId, applicantId, status, cvUrl, message]
    );
    return this.findById(r.insertId);
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
    const [r] = await pool.query(
      "DELETE FROM applications WHERE application_id = ?",
      [id]
    );
    return r.affectedRows > 0;
  },
};

export default Application;
