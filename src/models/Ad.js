// src/models/Ad.js
import { pool } from "../config/db.js";

function mapAd(r) {
  if (!r) return null;
  return {
    id: r.ad_id,
    jobTitle: r.job_title,
    companyName: r.company_name,
    jobDescription: r.job_description,
    requirements: r.requirements,
    location: r.location,
    contractType: r.contract_type, // 'cdi' | 'cdd' | 'stage' | 'alternance' | ...
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    currency: r.currency,
    deadlineDate: r.deadline_date,
    status: r.status, // 'active' | 'inactive'
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    companyId: r.company_id ?? null,
    creatorId: r.creator_id ?? null,
  };
}

function buildSet(data) {
  const map = {
    jobTitle: "job_title",
    companyName: "company_name",
    jobDescription: "job_description",
    requirements: "requirements",
    location: "location",
    contractType: "contract_type",
    salaryMin: "salary_min",
    salaryMax: "salary_max",
    currency: "currency",
    deadlineDate: "deadline_date",
    status: "status",
    companyId: "company_id",
    creatorId: "creator_id",
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

export const Ad = {
  async findById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM advertisements WHERE ad_id = ? LIMIT 1",
      [id]
    );
    return mapAd(rows[0]);
  },

  async list({ limit = 20, offset = 0, status = null, search = "" } = {}) {
    const where = [];
    const params = [];

    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (search) {
      where.push(
        "(job_title LIKE ? OR company_name LIKE ? OR location LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const sql = `
      SELECT SQL_CALC_FOUND_ROWS *
      FROM advertisements
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(sql, [
      ...params,
      Number(limit),
      Number(offset),
    ]);
    const [countRows] = await pool.query("SELECT FOUND_ROWS() AS total");
    return { items: rows.map(mapAd), total: countRows[0]?.total ?? 0 };
  },

  async create(data) {
    const {
      jobTitle,
      companyName,
      jobDescription,
      requirements = null,
      location,
      contractType,
      salaryMin = null,
      salaryMax = null,
      currency = "EUR",
      deadlineDate = null,
      status = "active",
      companyId = null,
      creatorId = null,
    } = data;

    const [r] = await pool.query(
      `INSERT INTO advertisements
         (job_title, company_name, job_description, requirements, location, contract_type,
          salary_min, salary_max, currency, deadline_date, status, company_id, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobTitle,
        companyName,
        jobDescription,
        requirements,
        location,
        contractType,
        salaryMin,
        salaryMax,
        currency,
        deadlineDate,
        status,
        companyId,
        creatorId,
      ]
    );
    return this.findById(r.insertId);
  },

  async update(id, data) {
    const { clause, values } = buildSet(data);
    if (!clause) return this.findById(id);
    await pool.query(`UPDATE advertisements SET ${clause} WHERE ad_id = ?`, [
      ...values,
      id,
    ]);
    return this.findById(id);
  },

  async remove(id) {
    const [r] = await pool.query("DELETE FROM advertisements WHERE ad_id = ?", [
      id,
    ]);
    return r.affectedRows > 0;
  },

  async listPublicActive({ companyId = null } = {}) {
    const where = ["a.status = 'active'"];
    const params = [];
    if (companyId) {
      where.push("a.company_id = ?");
      params.push(companyId);
    }
    const sql = `
      SELECT
        a.ad_id,
        a.company_id,
        a.job_title,
        a.location,
        a.contract_type,
        a.salary_min,
        a.salary_max,
        a.currency,
        a.created_at,
        a.deadline_date,
        c.company_name
      FROM advertisements a
      LEFT JOIN companies c ON a.company_id = c.company_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY a.created_at DESC
    `;
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findPublicById(id) {
    const [rows] = await pool.query(
      `
        SELECT
          a.ad_id,
          a.company_id,
          a.contact_person_id,
          a.job_title,
          a.job_description,
          a.requirements,
          a.location,
          a.contract_type,
          a.salary_min,
          a.salary_max,
          a.currency,
          a.deadline_date,
          a.status,
          a.created_at,
          a.updated_at,
          c.company_name,
          c.industry,
          c.company_size,
          c.website,
          c.city,
          c.country
        FROM advertisements a
        LEFT JOIN companies c ON a.company_id = c.company_id
        WHERE a.ad_id = ? AND a.status = 'active'
        LIMIT 1
      `,
      [id]
    );
    return rows[0] || null;
  },
};

export default Ad;
