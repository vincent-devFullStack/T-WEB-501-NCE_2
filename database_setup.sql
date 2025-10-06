-- ===========================
-- Schema: Job Advertisements 
-- ===========================

-- BDD + encodage recommandé
CREATE DATABASE IF NOT EXISTS job_advertisements
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE job_advertisements;

-- ==================
-- Table: companies
-- ==================
CREATE TABLE companies (
  company_id   INT PRIMARY KEY AUTO_INCREMENT,
  company_name VARCHAR(255) NOT NULL,
  industry     VARCHAR(100),
  company_size VARCHAR(50),
  website      VARCHAR(255),
  address      TEXT,
  city         VARCHAR(100),
  country      VARCHAR(100),
  email        VARCHAR(255),
  description  TEXT,
  logo_url     VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company_name (company_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ================
-- Table: people
-- (contacts & candidats)
-- ================
CREATE TABLE people (
  person_id     INT PRIMARY KEY AUTO_INCREMENT,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),             -- si tu fais de l'auth, sinon nullable
  phone         VARCHAR(50),
  linkedin_url  VARCHAR(255),
  person_type   ENUM('contact','candidat') DEFAULT 'candidat',
  company_id    INT NULL,
  position      VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_people_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL,
  INDEX idx_person_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ======================
-- Table: advertisements
-- ======================
CREATE TABLE advertisements (
  ad_id             INT PRIMARY KEY AUTO_INCREMENT,
  company_id        INT NOT NULL,
  contact_person_id INT NULL,                   -- personne de type 'contact'
  job_title         VARCHAR(255) NOT NULL,
  job_description   TEXT,
  requirements      TEXT,
  location          VARCHAR(255),

  contract_type     ENUM('cdi','cdd','interim','stage','alternance','freelance') DEFAULT 'cdi',
  working_time      ENUM('temps_plein','temps_partiel') DEFAULT 'temps_plein',
  experience_level  ENUM('non_precise','debutant','intermediaire','confirme','expert') DEFAULT 'non_precise',
  remote_option     ENUM('non','hybride','full_remote') DEFAULT 'non',

  -- salaire exploitable (au lieu de VARCHAR)
  salary_min        DECIMAL(10,2) NULL,
  salary_max        DECIMAL(10,2) NULL,
  currency          CHAR(3) NULL,              -- ex: EUR, USD

  deadline_date     DATE,
  status            ENUM('active','fermee','brouillon') DEFAULT 'brouillon',

  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_ads_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_ads_contact_person
    FOREIGN KEY (contact_person_id) REFERENCES people(person_id) ON DELETE SET NULL,

  -- borne de salaire cohérente (MySQL <8 ignore CHECK, ok pour TP)
  CHECK (
    (salary_min IS NULL AND salary_max IS NULL)
    OR (salary_min IS NOT NULL AND salary_max IS NOT NULL AND salary_min <= salary_max)
  ),

  INDEX idx_ad_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ===================
-- Table: applications
-- ===================
CREATE TABLE applications (
  application_id   INT PRIMARY KEY AUTO_INCREMENT,
  ad_id            INT NOT NULL,
  person_id        INT NOT NULL,                -- candidat
  application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status           ENUM('soumise','en_revision','entretien_prevu','rejetee','acceptee') DEFAULT 'soumise',
  cover_letter     TEXT,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_app_ad  FOREIGN KEY (ad_id)     REFERENCES advertisements(ad_id) ON DELETE CASCADE,
  CONSTRAINT fk_app_person FOREIGN KEY (person_id) REFERENCES people(person_id) ON DELETE CASCADE,

  -- 1 candidature unique par candidat et par annonce
  UNIQUE KEY unique_application (ad_id, person_id),
  INDEX idx_application_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- Table: application_logs (emails envoyés, appels, etc.)
-- -> répond explicitement à "emails sent, people/ad concerned"
-- =====================================================
CREATE TABLE application_logs (
  log_id               INT PRIMARY KEY AUTO_INCREMENT,
  application_id       INT NOT NULL,
  event_type           ENUM('email','call','message','status_change','note') NOT NULL,
  direction            ENUM('out','in') NULL,         -- utile pour email/call/message
  subject              VARCHAR(255) NULL,
  body                 TEXT NULL,
  occurred_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  meta                 JSON NULL,                     -- ex: headers email, message_id, phone
  created_by_person_id INT NULL,                      -- qui a réalisé l'action (contact/candidat)

  CONSTRAINT fk_logs_app     FOREIGN KEY (application_id)       REFERENCES applications(application_id) ON DELETE CASCADE,
  CONSTRAINT fk_logs_creator FOREIGN KEY (created_by_person_id) REFERENCES people(person_id)          ON DELETE SET NULL,

  INDEX idx_logs_app   (application_id),
  INDEX idx_logs_event (event_type, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
