// src/models/Application.js
import { pool } from "../config/db.js";
import {
  isMockDataEnabled,
  mockApplicationsRepo,
} from "../services/mockData.js";

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
    if (isMockDataEnabled()) {
      const row = await mockApplicationsRepo.findById(id);
      return mapApplication(row);
    }
    const [rows] = await pool.query(
      "SELECT * FROM applications WHERE application_id = ? LIMIT 1",
      [id]
    );
    return mapApplication(rows[0]);
  },

  async listByAd(adId, { limit = 50, offset = 0 } = {}) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.listByAd(adId, { limit, offset });
    }
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
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.listByPerson(personId, { limit, offset });
    }
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
    if (isMockDataEnabled()) {
      const row = await mockApplicationsRepo.create({
        adId,
        personId,
        status,
        cvPath,
        coverLetter,
        notes,
      });
      return mapApplication(row);
    }
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
    if (isMockDataEnabled()) {
      const columns = clause
        .split(",")
        .map((chunk) => chunk.trim().split(" = ")[0]);
      const updates = {};
      columns.forEach((column, index) => {
        updates[column] = values[index];
      });
      const row = await mockApplicationsRepo.update(id, updates);
      return mapApplication(row);
    }
    await pool.query(
      `UPDATE applications SET ${clause} WHERE application_id = ?`,
      [...values, id]
    );
    return this.findById(id);
  },

  async remove(id) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.remove(id);
    }
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
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.listWithAdDetailsByPerson(personId, {
        statuses,
        limit,
        offset,
      });
    }
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
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.countByStatusForPerson(personId);
    }
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

  async findByAdAndPerson(adId, personId) {
    if (isMockDataEnabled()) {
      const row = await mockApplicationsRepo.findByAdAndPerson(adId, personId);
      return mapApplication(row);
    }
    const [rows] = await pool.query(
      `SELECT * FROM applications WHERE ad_id = ? AND person_id = ? LIMIT 1`,
      [adId, personId]
    );
    return mapApplication(rows[0]);
  },

  async hasNonRefusedForPerson(adId, personId) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.hasNonRefusedForPerson(adId, personId);
    }
    const [rows] = await pool.query(
      `
        SELECT application_id
        FROM applications
        WHERE ad_id = ? AND person_id = ? AND status != 'refuse'
        LIMIT 1
      `,
      [adId, personId]
    );
    return rows.length > 0;
  },

  async createOrReapply({ adId, personId, cvPath = null, coverLetter = null }) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.createOrReapply({
        adId,
        personId,
        cvPath,
        coverLetter,
      });
    }
    const existing = await this.findByAdAndPerson(adId, personId);
    if (existing && existing.status !== "refuse") {
      return { status: "exists", application: existing };
    }

    if (existing) {
      await pool.query(
        `
          UPDATE applications
          SET cv_path = ?, cover_letter = ?, status = 'recu', application_date = NOW()
          WHERE application_id = ?
        `,
        [cvPath, coverLetter, existing.id]
      );
      return { status: "reapplied", applicationId: existing.id };
    }

    const [result] = await pool.query(
      `
        INSERT INTO applications
          (ad_id, person_id, cv_path, cover_letter, status, application_date)
        VALUES (?, ?, ?, ?, 'recu', NOW())
      `,
      [adId, personId, cvPath, coverLetter]
    );

    return { status: "created", applicationId: result.insertId };
  },

  async listWithCandidateByAd(adId) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.listWithCandidateByAd(adId);
    }
    const [rows] = await pool.query(
      `
        SELECT
          ap.*,
          p.first_name,
          p.last_name,
          p.email,
          p.phone
        FROM applications ap
        LEFT JOIN people p ON ap.person_id = p.person_id
        WHERE ap.ad_id = ?
        ORDER BY ap.application_date DESC
      `,
      [adId]
    );
    return rows;
  },

  async ensureBelongsToRecruiter(applicationId, recruiterId) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.ensureBelongsToRecruiter(
        applicationId,
        recruiterId
      );
    }
    const [rows] = await pool.query(
      `
        SELECT
          ap.application_id,
          ap.ad_id,
          ap.status
        FROM applications ap
        JOIN advertisements ad ON ap.ad_id = ad.ad_id
        WHERE ap.application_id = ? AND ad.contact_person_id = ?
        LIMIT 1
      `,
      [applicationId, recruiterId]
    );
    return rows[0] || null;
  },

  async updateStatus(applicationId, status) {
    if (isMockDataEnabled()) {
      const row = await mockApplicationsRepo.updateStatus(
        applicationId,
        status
      );
      return mapApplication(row);
    }
    await pool.query(
      "UPDATE applications SET status = ? WHERE application_id = ?",
      [status, applicationId]
    );
    return this.findById(applicationId);
  },

  async updateStatusForRecruiter(applicationId, recruiterId, status) {
    const ownership = await this.ensureBelongsToRecruiter(
      applicationId,
      recruiterId
    );
    if (!ownership) return null;
    if (isMockDataEnabled()) {
      const row = await mockApplicationsRepo.updateStatusForRecruiter(
        applicationId,
        recruiterId,
        status
      );
      return mapApplication(row);
    }
    await pool.query(
      "UPDATE applications SET status = ? WHERE application_id = ?",
      [status, applicationId]
    );
    return this.findById(applicationId);
  },

  async countNewForRecruiter(recruiterId) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.countNewForRecruiter(recruiterId);
    }
    const [[result]] = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM applications ap
        JOIN advertisements ad ON ap.ad_id = ad.ad_id
        WHERE ad.contact_person_id = ? AND ap.status = 'recu'
      `,
      [recruiterId]
    );
    return Number(result?.count || 0);
  },

  async countNewForAd(adId, recruiterId = null) {
    if (isMockDataEnabled()) {
      return mockApplicationsRepo.countNewForAd(adId, recruiterId);
    }
    const params = [adId];
    let ownershipClause = "";
    if (recruiterId) {
      ownershipClause =
        " AND EXISTS (SELECT 1 FROM advertisements a WHERE a.ad_id = ap.ad_id AND a.contact_person_id = ?)";
      params.push(recruiterId);
    }
    const [[result]] = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM applications ap
        WHERE ap.ad_id = ? AND ap.status = 'recu'${ownershipClause}
      `,
      params
    );
    return Number(result?.count || 0);
  },
};

export default Application;
