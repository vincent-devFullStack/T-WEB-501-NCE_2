// src/services/authTokens.js
import jwt from "jsonwebtoken";

const TOKEN_COOKIE = "token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const isProd = process.env.NODE_ENV === "production";

function resolveMaxAge(expires) {
  if (!expires) return undefined;

  if (typeof expires === "number") {
    return expires * 1000; // seconds -> ms
  }

  if (typeof expires === "string") {
    const directSeconds = Number(expires);
    if (!Number.isNaN(directSeconds)) {
      return directSeconds * 1000;
    }

    const match = expires.match(/^(\d+)\s*([smhd])$/i);
    if (match) {
      const value = Number(match[1]);
      const unit = match[2].toLowerCase();
      const unitMs = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
      }[unit];
      if (unitMs) {
        return value * unitMs;
      }
    }
  }

  // défaut : 7 jours
  return 7 * 24 * 60 * 60 * 1000;
}

export function signJwt(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
    ...options,
  });
}

export function setAuthCookie(res, payload, options = {}) {
  const token = signJwt(payload, options.jwtOptions);

  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge:
      options.maxAge ??
      (options.jwtOptions?.expiresIn
        ? resolveMaxAge(options.jwtOptions.expiresIn)
        : resolveMaxAge(JWT_EXPIRES)),
  });

  return token;
}

export function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });
}

export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}

export const authCookie = {
  name: TOKEN_COOKIE,
  sign: setAuthCookie,
  clear: clearAuthCookie,
  verify: verifyJwt,
};
