// script.js (seed)
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "job_advertisement",
    // Railway impose souvent TLS
    ssl:
      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true,
    connectTimeout: 10_000,
  });

  const pwAdmin = await bcrypt.hash("admin123", 10);
  const pwRec = await bcrypt.hash("recruteur123", 10);

  // companies (idempotent-ish)
  const [c1] = await conn.execute(
    `INSERT INTO companies (company_name, industry, city, country, email)
     VALUES (?, ?, ?, ?, ?)`,
    ["TechNova", "IT", "Nice", "France", "hr@technova.com"]
  );
  const companyId1 =
    c1.insertId ||
    (
      await conn.execute(`SELECT company_id FROM companies WHERE email=?`, [
        "hr@technova.com",
      ])
    )[0][0]?.company_id;

  const [c2] = await conn.execute(
    `INSERT INTO companies (company_name, industry, city, country, email)
     VALUES (?, ?, ?, ?, ?)`,
    ["CloudWorks", "Cloud", "Sophia Antipolis", "France", "jobs@cloudworks.io"]
  );
  const companyId2 =
    c2.insertId ||
    (
      await conn.execute(`SELECT company_id FROM companies WHERE email=?`, [
        "jobs@cloudworks.io",
      ])
    )[0][0]?.company_id;

  // admin
  await conn.execute(
    `INSERT INTO people (first_name, last_name, email, password_hash, person_type, is_active)
     VALUES (?, ?, ?, ?, 'admin', 1)
     ON DUPLICATE KEY UPDATE email = VALUES(email)`,
    ["Vincent", "Admin", "admin@example.com", pwAdmin]
  );

  // recruteur rattaché à companyId1
  const [rec] = await conn.execute(
    `INSERT INTO people (first_name, last_name, email, password_hash, person_type, is_active, company_id, position)
     VALUES (?, ?, ?, ?, 'recruteur', 1, ?, ?)
     ON DUPLICATE KEY UPDATE email = VALUES(email)`,
    ["Alice", "Martin", "alice@technova.com", pwRec, companyId1, "HR Manager"]
  );
  const recruiterId =
    rec.insertId ||
    (
      await conn.execute(`SELECT person_id FROM people WHERE email=?`, [
        "alice@technova.com",
      ])
    )[0][0]?.person_id;

  // annonces
  await conn.execute(
    `INSERT INTO advertisements
      (company_id, contact_person_id, job_title, job_description, requirements, location,
       contract_type, status, experience_level, working_time, remote_option,
       salary_min, salary_max, currency)
     VALUES (?, ?, ?, ?, ?, ?, 'cdi', 'active', 'intermediaire', 'temps_plein', 'hybride', ?, ?, 'EUR')`,
    [
      companyId1,
      recruiterId,
      "Développeur Full-Stack",
      "Node.js, React, MySQL. Projet produit interne.",
      "3+ ans, bonnes pratiques, Git.",
      "Nice",
      36000,
      45000,
    ]
  );

  await conn.execute(
    `INSERT INTO advertisements
      (company_id, contact_person_id, job_title, job_description, requirements, location,
       contract_type, status, experience_level, working_time, remote_option,
       salary_min, salary_max, currency)
     VALUES (?, ?, ?, ?, ?, ?, 'alternance', 'active', 'debutant', 'temps_plein', 'hybride', ?, ?, 'EUR')`,
    [
      companyId2,
      null,
      "Alternant Dev Web",
      "Angular/React + API REST.",
      "Motivation, bases JS/HTML/CSS.",
      "Sophia Antipolis",
      0,
      0,
    ]
  );

  console.log("✅ Seed terminé. Comptes de test créés :");
  console.log("- Admin => admin@example.com / admin123");
  console.log("- Recruteur => alice@technova.com / recruteur123");

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
