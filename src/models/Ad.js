// src/models/Ad.js
import { pool } from "../config/db.js";
import { isMockDataEnabled, mockAdsRepo } from "../services/mockData.js";

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
    if (isMockDataEnabled()) {
      const row = await mockAdsRepo.findById(id);
      return mapAd(row);
    }
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

    if (isMockDataEnabled()) {
      const { items, total } = await mockAdsRepo.list({
        limit,
        offset,
        status,
        search,
      });
      return { items: items.map(mapAd), total };
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

    if (isMockDataEnabled()) {
      const row = await mockAdsRepo.create({
        company_id: companyId,
        company_name: companyName,
        job_title: jobTitle,
        job_description: jobDescription,
        requirements,
        location,
        contract_type: contractType,
        salary_min: salaryMin,
        salary_max: salaryMax,
        currency,
        deadline_date: deadlineDate,
        status,
        creator_id: creatorId,
      });
      return mapAd(row);
    }

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
    if (isMockDataEnabled()) {
      const columns = clause
        .split(",")
        .map((chunk) => chunk.trim().split(" = ")[0]);
      const updates = {};
      columns.forEach((column, index) => {
        updates[column] = values[index];
      });
      const row = await mockAdsRepo.update(id, updates);
      return mapAd(row);
    }
    await pool.query(`UPDATE advertisements SET ${clause} WHERE ad_id = ?`, [
      ...values,
      id,
    ]);
    return this.findById(id);
  },

  async remove(id) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.remove(id);
    }
    const [r] = await pool.query("DELETE FROM advertisements WHERE ad_id = ?", [
      id,
    ]);
    return r.affectedRows > 0;
  },

  async listPublicActive({
    companyId = null,
    limit = null,
    offset = 0,
    withTotal = false,
  } = {}) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.listPublicActive({
        companyId,
        limit,
        offset,
        withTotal,
      });
    }
    const where = ["a.status = 'active'"];
    const params = [];
    if (companyId) {
      where.push("a.company_id = ?");
      params.push(companyId);
    }

    const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

    const selectSql = `
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
      ${whereClause}
      ORDER BY a.created_at DESC
      ${limit != null ? "LIMIT ? OFFSET ?" : ""}
    `;

    const dataParams =
      limit != null ? [...params, Number(limit), Number(offset)] : params;
    const [rows] = await pool.query(selectSql, dataParams);

    if (limit == null && !withTotal) {
      return rows;
    }

    const countWhere = ["status = 'active'"];
    const countParams = [];
    if (companyId) {
      countWhere.push("company_id = ?");
      countParams.push(companyId);
    }
    const countSql = `
      SELECT COUNT(*) AS total
      FROM advertisements
      ${countWhere.length ? "WHERE " + countWhere.join(" AND ") : ""}
    `;
    const [[{ total }]] = await pool.query(countSql, countParams);

    return { items: rows, total: Number(total) || 0 };
  },

  async countPublicActive({ companyId = null } = {}) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.countPublicActive({ companyId });
    }
    const where = ["status = 'active'"];
    const params = [];
    if (companyId) {
      where.push("company_id = ?");
      params.push(companyId);
    }
    const sql = `
      SELECT COUNT(*) AS total
      FROM advertisements
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
    `;
    const [[{ total }]] = await pool.query(sql, params);
    return Number(total) || 0;
  },

  async listPublicWithRelations() {
    if (isMockDataEnabled()) {
      return mockAdsRepo.listPublicWithRelations();
    }
    const [rows] = await pool.query(
      `
      SELECT 
        a.*,
        c.company_name,
        CONCAT(p.first_name, ' ', p.last_name) AS contact_name
      FROM advertisements a
      LEFT JOIN companies c ON a.company_id = c.company_id
      LEFT JOIN people p ON a.contact_person_id = p.person_id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `
    );
    return rows;
  },

  async findPublicById(id) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.findPublicById(id);
    }
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

  async findActiveById(adId) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.findActiveById(adId);
    }
    const [rows] = await pool.query(
      `
        SELECT ad_id, company_id, contact_person_id, status
        FROM advertisements
        WHERE ad_id = ? AND status = 'active'
        LIMIT 1
      `,
      [adId]
    );
    return rows[0] || null;
  },

  async ensureOwnership(adId, recruiterId) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.ensureOwnership(adId, recruiterId);
    }
    const [rows] = await pool.query(
      `
        SELECT
          a.ad_id,
          a.company_id,
          a.contact_person_id,
          a.job_title,
          a.status
        FROM advertisements a
        WHERE a.ad_id = ? AND a.contact_person_id = ?
        LIMIT 1
      `,
      [adId, recruiterId]
    );
    return rows[0] || null;
  },

  async listForRecruiter(recruiterId) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.listForRecruiter(recruiterId);
    }
    const [rows] = await pool.query(
      `
        SELECT
          a.*,
          c.company_name
        FROM advertisements a
        LEFT JOIN companies c ON a.company_id = c.company_id
        WHERE a.contact_person_id = ?
        ORDER BY a.created_at DESC
      `,
      [recruiterId]
    );
    return rows;
  },

  async findForRecruiter(adId, recruiterId) {
    if (isMockDataEnabled()) {
      return mockAdsRepo.findForRecruiter(adId, recruiterId);
    }
    const [rows] = await pool.query(
      `
        SELECT
          a.*,
          c.company_name
        FROM advertisements a
        LEFT JOIN companies c ON a.company_id = c.company_id
        WHERE a.ad_id = ? AND a.contact_person_id = ?
        LIMIT 1
      `,
      [adId, recruiterId]
    );
    return rows[0] || null;
  },

  async createForRecruiter({ recruiterId, companyId, data }) {
    if (!companyId) throw new Error("company_id_required");
    const allowed = {
      job_title: null,
      job_description: null,
      requirements: null,
      location: null,
      contract_type: null,
      working_time: null,
      experience_level: null,
      remote_option: null,
      salary_min: null,
      salary_max: null,
      currency: "EUR",
      deadline_date: null,
      status: "active",
    };

    const columns = ["company_id", "contact_person_id"];
    const values = [companyId, recruiterId];

    for (const [key, defaultValue] of Object.entries(allowed)) {
      const raw = data?.[key];
      let value = raw;
      if (raw === undefined || raw === null || raw === "") {
        value = defaultValue ?? null;
      } else if (typeof raw === "string") {
        value = raw.trim();
        if (value === "") value = defaultValue ?? null;
      }

      if (key === "salary_min" || key === "salary_max") {
        value = raw ? Number(raw) : null;
        if (!Number.isFinite(value)) value = null;
      }

      columns.push(key);
      values.push(value);
    }

    if (isMockDataEnabled()) {
      return mockAdsRepo.createForRecruiter({
        recruiterId,
        companyId,
        data,
      });
    }

    const placeholders = columns.map(() => "?").join(", ");
    const sql = `
      INSERT INTO advertisements (${columns.join(", ")})
      VALUES (${placeholders})
    `;
    const [result] = await pool.query(sql, values);
    return this.findForRecruiter(result.insertId, recruiterId);
  },

  async updateForRecruiter(adId, recruiterId, updates) {
    const ownership = await this.ensureOwnership(adId, recruiterId);
    if (!ownership) return null;
    if (isMockDataEnabled()) {
      return mockAdsRepo.updateForRecruiter(adId, recruiterId, updates);
    }

    const allowedMap = {
      job_title: (value) => (value ? String(value).trim() : null),
      job_description: (value) => (value ? String(value).trim() : null),
      requirements: (value) => (value ? String(value).trim() : null),
      location: (value) => (value ? String(value).trim() : null),
      contract_type: (value) => (value ? String(value).trim() : null),
      working_time: (value) => (value ? String(value).trim() : null),
      experience_level: (value) => (value ? String(value).trim() : null),
      remote_option: (value) => (value ? String(value).trim() : null),
      salary_min: (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      },
      salary_max: (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      },
      currency: (value) => (value ? String(value).trim() : "EUR"),
      deadline_date: (value) => (value ? String(value).trim() : null),
      status: (value) => (value ? String(value).trim() : null),
    };

    const fields = [];
    const values = [];
    for (const [key, transform] of Object.entries(allowedMap)) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      const transformed = transform(updates[key]);
      fields.push(`${key} = ?`);
      values.push(transformed);
    }

    if (!fields.length) {
      return this.findForRecruiter(adId, recruiterId);
    }

    await pool.query(
      `
        UPDATE advertisements
        SET ${fields.join(", ")}
        WHERE ad_id = ? AND contact_person_id = ?
      `,
      [...values, adId, recruiterId]
    );

    return this.findForRecruiter(adId, recruiterId);
  },

  async removeForRecruiter(adId, recruiterId) {
    const ownership = await this.ensureOwnership(adId, recruiterId);
    if (!ownership) return false;
    if (isMockDataEnabled()) {
      return mockAdsRepo.removeForRecruiter(adId, recruiterId);
    }
    await pool.query("DELETE FROM advertisements WHERE ad_id = ?", [adId]);
    return true;
  },

  async updateStatusForRecruiter(adId, recruiterId, status) {
    const ownership = await this.ensureOwnership(adId, recruiterId);
    if (!ownership) return null;
    if (isMockDataEnabled()) {
      return mockAdsRepo.updateStatusForRecruiter(adId, recruiterId, status);
    }
    await pool.query(
      "UPDATE advertisements SET status = ? WHERE ad_id = ?",
      [status, adId]
    );
    return this.findForRecruiter(adId, recruiterId);
  },
};

export default Ad;
