// scripts/seed-demo.js
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { fakerFR as faker } from "@faker-js/faker";
import { pool } from "../src/config/db.js";

/**
 * Réglages
 */
const NB_COMPANIES = 120;
const NB_RECRUITERS = 100;
const NB_CANDIDATES = 100;
const NB_ADS = 100;

// Mot de passe commun aux comptes seed
const SEED_PASSWORD = "Passw0rd!";
const SEED_EMAIL_DOMAIN = "seed.local"; // pour pouvoir tout supprimer d'un coup

// Enums DB (doivent EXACTEMENT matcher tes ENUM MySQL)
const CONTRACT_TYPES = [
  "cdi",
  "cdd",
  "interim",
  "stage",
  "alternance",
  "freelance",
];
const WORKING_TIMES = ["temps_plein", "temps_partiel"];
const EXPERIENCE_LEVELS = [
  "non_precise",
  "debutant",
  "intermediaire",
  "confirme",
  "expert",
];
const REMOTE_OPTIONS = ["non", "hybride", "full_remote"];
const STATUSES = ["brouillon", "active", "fermee"];

/** util */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("🔰 Seed DEMO – start");
  const conn = await pool.getConnection();
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");

    // Optionnel: nettoyer les anciens seeds
    console.log("🧹 Clean previous seed data…");
    await conn.query(
      `DELETE FROM application_logs WHERE created_by_person_id IN (SELECT person_id FROM people WHERE email LIKE ?)`,
      [`%@${SEED_EMAIL_DOMAIN}`]
    );
    await conn.query(
      `DELETE FROM applications WHERE person_id IN (SELECT person_id FROM people WHERE email LIKE ?)`,
      [`%@${SEED_EMAIL_DOMAIN}`]
    );
    await conn.query(
      `DELETE FROM advertisements WHERE contact_person_id IN (SELECT person_id FROM people WHERE email LIKE ?)`,
      [`%@${SEED_EMAIL_DOMAIN}`]
    );
    await conn.query(`DELETE FROM people WHERE email LIKE ?`, [
      `%@${SEED_EMAIL_DOMAIN}`,
    ]);
    // On supprime aussi les companies « seed »
    await conn.query(`DELETE FROM companies WHERE company_name LIKE 'SEED %'`);

    // 1) Companies -----------------------------------------------------------
    console.log("🏢 Insert companies…");
    const companyIds = [];
    for (let i = 0; i < NB_COMPANIES; i++) {
      const name = `SEED ${faker.company.name()}`;
      // on insère a minima company_name (adapter si ta table a des NOT NULL en plus)
      const [res] = await conn.query(
        `INSERT INTO companies (company_name) VALUES (?)`,
        [name]
      );
      companyIds.push(res.insertId);
    }

    // 2) Users – recruiters & candidates ------------------------------------
    console.log("👤 Insert users (recruiters & candidates) …");
    const pwdHash = await bcrypt.hash(SEED_PASSWORD, 10);

    const recruiterIdsByCompany = new Map();
    for (const cid of companyIds) recruiterIdsByCompany.set(cid, []);

    const recruiterIds = [];
    for (let i = 0; i < NB_RECRUITERS; i++) {
      const cid = pick(companyIds);
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email = `${first}.${last}.${i}@${SEED_EMAIL_DOMAIN}`.toLowerCase();

      const [res] = await conn.query(
        `INSERT INTO people (first_name, last_name, email, password_hash, person_type, company_id, is_active)
         VALUES (?, ?, ?, ?, 'recruteur', ?, 1)`,
        [first, last, email, pwdHash, cid]
      );
      recruiterIds.push(res.insertId);
      recruiterIdsByCompany.get(cid).push(res.insertId);
    }

    const candidateIds = [];
    for (let i = 0; i < NB_CANDIDATES; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const email =
        `${first}.${last}.cand.${i}@${SEED_EMAIL_DOMAIN}`.toLowerCase();

      const [res] = await conn.query(
        `INSERT INTO people (first_name, last_name, email, password_hash, person_type, company_id, is_active)
         VALUES (?, ?, ?, ?, 'candidat', NULL, 1)`,
        [first, last, email, pwdHash]
      );
      candidateIds.push(res.insertId);
    }

    // 3) Advertisements ------------------------------------------------------
    console.log("📣 Insert advertisements…");
    // NB: ta table 'advertisements' a ces colonnes (vu dans ton DESCRIBE):
    // ad_id, company_id, contact_person_id, job_title, job_description,
    // requirements, location, contract_type, working_time, experience_level,
    // remote_option, salary_min, salary_max, currency, deadline_date, status
    // created_at, updated_at

    // liste simple de villes FR (évite faker.city parfois exotique)
    const cities = [
      "Paris",
      "Lyon",
      "Marseille",
      "Toulouse",
      "Nice",
      "Lille",
      "Nantes",
      "Bordeaux",
      "Strasbourg",
      "Montpellier",
    ];

    let created = 0;
    // on tourne tant qu’on a NB_ADS, en s’assurant d’avoir un recruteur dans la boîte
    while (created < NB_ADS) {
      const cid = pick(companyIds);
      const recs = recruiterIdsByCompany.get(cid);
      if (!recs || recs.length === 0) continue; // pas de recruteur dans cette boîte -> on saute

      const contactId = pick(recs);

      const title = faker.helpers.arrayElement([
        "Développeur Full Stack",
        "Développeur Frontend React",
        "Ingénieur Backend Node.js",
        "Data Analyst",
        "UX/UI Designer",
        "DevOps Engineer",
        "Product Manager",
        "QA Engineer",
      ]);

      const contractType = pick(CONTRACT_TYPES);
      const workingTime = pick(WORKING_TIMES);
      const experience = pick(EXPERIENCE_LEVELS);
      const remote = pick(REMOTE_OPTIONS);

      const min = faker.number.int({ min: 28000, max: 45000 });
      const max = min + faker.number.int({ min: 3000, max: 20000 });

      const jobDescription = [
        `Environnement: ${faker.helpers.arrayElement([
          "TypeScript",
          "React",
          "Node.js/Express",
          "PostgreSQL",
          "Docker",
          "AWS",
          "GCP",
        ])}.`,
        `Méthodologie: ${faker.helpers.arrayElement([
          "agile",
          "scrum",
          "kanban",
        ])}.`,
        `Équipe: ${faker.number.int({ min: 4, max: 12 })} personnes.`,
      ].join(" ");

      const requirements = [
        `Expérience: ${faker.helpers.arrayElement([
          "junior",
          "intermédiaire",
          "confirmé",
        ])}.`,
        `Outils: ${faker.helpers.arrayElement([
          "GitHub",
          "Jira",
          "GitLab",
          "CI/CD",
        ])}.`,
      ].join(" ");

      const location = pick(cities);
      const deadline = faker.date.soon({ days: 120 }); // dans ~ 4 mois
      const status = pick(STATUSES);

      await conn.query(
        `INSERT INTO advertisements
         (company_id, contact_person_id, job_title, job_description, requirements, location,
          contract_type, working_time, experience_level, remote_option,
          salary_min, salary_max, currency, deadline_date, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          cid,
          contactId,
          title,
          jobDescription,
          requirements,
          location,
          contractType,
          workingTime,
          experience,
          remote,
          min,
          max,
          "EUR",
          deadline,
          status,
        ]
      );

      created++;
    }

    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    console.log(
      `✅ Seed DONE: ${companyIds.length} companies, ${recruiterIds.length} recruiters, ${candidateIds.length} candidates, ${created} ads`
    );
    console.log(`ℹ️ Comptes de démo (mot de passe commun): ${SEED_PASSWORD}`);
    console.log(`ℹ️ Domaine email des seeds: *@${SEED_EMAIL_DOMAIN}`);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
