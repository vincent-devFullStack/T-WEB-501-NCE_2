// src/models/User.js
import { pool } from "../config/db.js";

/** Map DB row -> JS object (camelCase) */
function mapUser(r) {
  if (!r) return null;
  return {
    id: r.person_id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    passwordHash: r.password_hash,
    phone: r.phone,
    linkedinUrl: r.linkedin_url,
    role: r.person_type, // 'candidat' | 'recruteur' | 'admin'
    isActive: !!r.is_active,
    companyId: r.company_id,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Build dynamic SET clause from allowed fields */
function buildSet(data) {
  const fields = [];
  const values = [];

  const map = {
    firstName: "first_name",
    lastName: "last_name",
    email: "email",
    passwordHash: "password_hash",
    phone: "phone",
    linkedinUrl: "linkedin_url",
    role: "person_type",
    isActive: "is_active",
    companyId: "company_id",
    position: "position",
  };

  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue;
    const col = map[k];
    if (!col) continue;
    fields.push(`${col} = ?`);
    values.push(v);
  }

  return { clause: fields.join(", "), values };
}

export const User = {
  async findById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM people WHERE person_id = ? LIMIT 1",
      [id]
    );
    return mapUser(rows[0]);
  },

  async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT * FROM people WHERE email = ? LIMIT 1",
      [email]
    );
    return mapUser(rows[0]);
  },

  async list({ limit = 20, offset = 0, role = null, search = "" } = {}) {
    const where = [];
    const params = [];

    if (role) {
      where.push("person_type = ?");
      params.push(role);
    }
    if (search) {
      where.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const sql = `
      SELECT SQL_CALC_FOUND_ROWS *
      FROM people
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(sql, [
      ...params,
      Number(limit),
      Number(offset),
    ]);
    const [countRows] = await pool.query("SELECT FOUND_ROWS() AS total");
    return { items: rows.map(mapUser), total: countRows[0]?.total ?? 0 };
  },

  async create({
    firstName,
    lastName,
    email,
    passwordHash = null,
    phone = null,
    linkedinUrl = null,
    role = "candidat",
    isActive = 1,
    companyId = null,
    position = null,
  }) {
    const [r] = await pool.query(
      `INSERT INTO people
       (first_name, last_name, email, password_hash, phone, linkedin_url, person_type, is_active, company_id, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        email,
        passwordHash,
        phone,
        linkedinUrl,
        role,
        isActive,
        companyId,
        position,
      ]
    );
    return this.findById(r.insertId);
  },

  async update(id, data) {
    const { clause, values } = buildSet(data);
    if (!clause) return this.findById(id);
    await pool.query(`UPDATE people SET ${clause} WHERE person_id = ?`, [
      ...values,
      id,
    ]);
    return this.findById(id);
  },

  async setPasswordHash(id, passwordHash) {
    await pool.query(
      "UPDATE people SET password_hash = ? WHERE person_id = ?",
      [passwordHash, id]
    );
    return this.findById(id);
  },

  async remove(id) {
    const [r] = await pool.query("DELETE FROM people WHERE person_id = ?", [
      id,
    ]);
    return r.affectedRows > 0;
  },
};

export default User;
