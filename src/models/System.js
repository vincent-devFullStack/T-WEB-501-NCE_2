import { pool } from "../config/db.js";
import { isMockDataEnabled } from "../services/mockData.js";

export const System = {
  async ping() {
    if (isMockDataEnabled()) {
      return true;
    }
    const [[row]] = await pool.query("SELECT 1 AS ok");
    return row?.ok === 1;
  },
};

export default System;
