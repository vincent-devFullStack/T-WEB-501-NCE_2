import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[DB] Missing env var: ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === "production";
ssl: process.env.DB_SSL === "true" || isProd
  ? { rejectUnauthorized: false }
  : undefined;

// Options MySQL2 utiles
const pool = mysql.createPool({
  host: required("DB_HOST"),
  port: Number(process.env.DB_PORT || 3306),
  user: required("DB_USER"),
  password: required("DB_PASS"),
  database: required("DB_NAME"),

  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,

  // qualité de sérialisation
  decimalNumbers: true, // renvoie nombres, pas strings
  dateStrings: false, // renvoie Date pour DATETIME
  multipleStatements: false, // sécurité

  // SSL seulement si demandé
  ssl:
    process.env.DB_SSL === "true" || isProd
      ? { rejectUnauthorized: false }
      : undefined,

  // timezone côté connexion (si besoin)
  timezone: process.env.DB_TZ || "Z",
});

// petit helper pour requêter proprement
export async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ping au démarrage pour fail-fast
export async function assertDbConnection() {
  const r = await query("SELECT 1 AS ok");
  if (!r?.[0]?.ok) throw new Error("[DB] Ping failed");
  return true;
}

// arrêt propre
export async function closeDb() {
  await pool.end();
}

export { pool };
