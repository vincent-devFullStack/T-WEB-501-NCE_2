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

function mapUserWithCompany(row) {
  if (!row) return null;
  const user = mapUser(row);
  return {
    ...user,
    company: row.company_id
      ? {
          id: row.company_id,
          name:
            row.company_name ?? row.name ?? row.nom ?? row.title ?? null,
          industry: row.industry ?? null,
        }
      : null,
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

  async fetchProfileRow(personId) {
    const [rows] = await pool.query(
      `
        SELECT
          p.person_id,
          p.first_name,
          p.last_name,
          p.email,
          p.phone,
          p.linkedin_url,
          p.person_type AS role,
          p.company_id,
          p.password_hash,
          p.is_active,
          p.created_at,
          p.updated_at,
          c.company_name,
          c.industry
        FROM people p
        LEFT JOIN companies c ON c.company_id = p.company_id
        WHERE p.person_id = ?
        LIMIT 1
      `,
      [personId]
    );
    return rows[0] || null;
  },

  async findWithCompany(personId) {
    const row = await this.fetchProfileRow(personId);
    return mapUserWithCompany(row);
  },

  async getRecruiterContext(personId) {
    const [rows] = await pool.query(
      `
        SELECT
          p.person_id,
          p.email,
          p.company_id,
          c.company_name,
          c.industry
        FROM people p
        LEFT JOIN companies c ON c.company_id = p.company_id
        WHERE p.person_id = ?
        LIMIT 1
      `,
      [personId]
    );
    return rows[0] || null;
  },

  async ensureCandidateByEmail({ email, fullName = "", phone = null }) {
    if (!email) throw new Error("email_required");
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      return existing.id;
    }

    const safeName = String(fullName || "").trim();
    let firstName = safeName;
    let lastName = "";
    if (safeName.includes(" ")) {
      const parts = safeName.split(" ");
      firstName = parts.shift();
      lastName = parts.join(" ");
    }
    if (!firstName) firstName = normalizedEmail.split("@")[0] || "Candidat";

    const [result] = await pool.query(
      `INSERT INTO people
         (email, first_name, last_name, phone, person_type, created_at)
       VALUES (?, ?, ?, ?, 'candidat', NOW())`,
      [normalizedEmail, firstName, lastName || null, phone || null]
    );

    return result.insertId;
  },
};

export default User;
