import { pool } from "../config/db.js";

export const System = {
  async ping() {
    const [[row]] = await pool.query("SELECT 1 AS ok");
    return row?.ok === 1;
  },
};

export default System;
