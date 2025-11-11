import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const requiredEnvVars = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME"];
const missingEnvVars = requiredEnvVars.filter(
  (name) => !process.env[name] || !String(process.env[name]).trim()
);

const hasRealDatabase = missingEnvVars.length === 0;
const isProd = process.env.NODE_ENV === "production";

function getEnv(name, fallback = null) {
  const value = process.env[name];
  if (value == null) return fallback;
  return typeof value === "string" ? value.trim() : value;
}

let pool;

if (hasRealDatabase) {
  pool = mysql.createPool({
    host: getEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    user: getEnv("DB_USER"),
    password: getEnv("DB_PASS"),
    database: getEnv("DB_NAME"),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
    decimalNumbers: true,
    dateStrings: false,
    multipleStatements: false,
    ssl:
      process.env.DB_SSL === "true" || isProd
        ? { rejectUnauthorized: false }
        : undefined,
    timezone: process.env.DB_TZ || "Z",
  });
} else {
  console.warn(
    "[DB] Variables de connexion manquantes. Le serveur basculera en mode mock.",
    { missingEnvVars }
  );
  pool = {
    async query() {
      throw new Error("[DB] Pool indisponible (mode mock)");
    },
    async end() {
      return;
    },
  };
}

export async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function assertDbConnection() {
  if (!hasRealDatabase) {
    throw new Error(
      `[DB] Configuration incomplète (${missingEnvVars.join(", ")})`
    );
  }
  const r = await query("SELECT 1 AS ok");
  if (!r?.[0]?.ok) throw new Error("[DB] Ping failed");
  return true;
}

export async function closeDb() {
  await pool.end();
}

export { pool, hasRealDatabase };
