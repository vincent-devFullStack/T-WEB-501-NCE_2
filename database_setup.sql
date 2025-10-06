-- ===========================
-- Schema: Job Advertisement
-- ===========================

-- BDD + encodage recommandé (compatible MariaDB/MySQL 5.7+)
CREATE DATABASE IF NOT EXISTS job_advertisement
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE job_advertisement;

-- ==================
-- Table: companies
-- ==================
CREATE TABLE IF NOT EXISTS companies (
  company_id   INT AUTO_INCREMENT PRIMARY KEY,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ================
-- Table: people
-- ================
CREATE TABLE IF NOT EXISTS people (
  person_id     INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  phone         VARCHAR(50),
  linkedin_url  VARCHAR(255),
  person_type   ENUM('candidat','recruteur','admin') DEFAULT 'candidat',
  is_active     TINYINT(1) DEFAULT 1,
  company_id    INT NULL,
  position      VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_people_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL,
  INDEX idx_person_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ======================
-- Table: advertisements
-- ======================
CREATE TABLE IF NOT EXISTS advertisements (
  ad_id             INT AUTO_INCREMENT PRIMARY KEY,
  company_id        INT NOT NULL,
  contact_person_id INT NULL,
  job_title         VARCHAR(255) NOT NULL,
  job_description   TEXT,
  requirements      TEXT,
  location          VARCHAR(255),

  contract_type     ENUM('cdi','cdd','interim','stage','alternance','freelance') DEFAULT 'cdi',
  working_time      ENUM('temps_plein','temps_partiel') DEFAULT 'temps_plein',
  experience_level  ENUM('non_precise','debutant','intermediaire','confirme','expert') DEFAULT 'non_precise',
  remote_option     ENUM('non','hybride','full_remote') DEFAULT 'non',

  salary_min        DECIMAL(10,2) NULL,
  salary_max        DECIMAL(10,2) NULL,
  currency          CHAR(3) NULL,

  deadline_date     DATE,
  status            ENUM('active','fermee','brouillon') DEFAULT 'brouillon',

  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_ads_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
  CONSTRAINT fk_ads_contact_person
    FOREIGN KEY (contact_person_id) REFERENCES people(person_id) ON DELETE SET NULL,

  INDEX idx_ad_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===================
-- Table: applications
-- ===================
CREATE TABLE IF NOT EXISTS applications (
  application_id   INT AUTO_INCREMENT PRIMARY KEY,
  ad_id            INT NOT NULL,
  person_id        INT NOT NULL,
  application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status           ENUM('soumise','en_revision','entretien_prevu','rejetee','acceptee') DEFAULT 'soumise',
  cover_letter     TEXT,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_app_ad     FOREIGN KEY (ad_id)     REFERENCES advertisements(ad_id) ON DELETE CASCADE,
  CONSTRAINT fk_app_person FOREIGN KEY (person_id) REFERENCES people(person_id)        ON DELETE CASCADE,

  UNIQUE KEY unique_application (ad_id, person_id),
  INDEX idx_application_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================
-- Table: application_logs (emails envoyés, appels, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS application_logs (
  log_id               INT AUTO_INCREMENT PRIMARY KEY,
  application_id       INT NOT NULL,
  event_type           ENUM('email','call','message','status_change','note') NOT NULL,
  direction            ENUM('out','in') NULL,
  subject              VARCHAR(255) NULL,
  body                 TEXT NULL,
  occurred_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  meta                 TEXT NULL, -- JSON as TEXT for portability
  created_by_person_id INT NULL,

  CONSTRAINT fk_logs_app     FOREIGN KEY (application_id)       REFERENCES applications(application_id) ON DELETE CASCADE,
  CONSTRAINT fk_logs_creator FOREIGN KEY (created_by_person_id) REFERENCES people(person_id)            ON DELETE SET NULL,

  INDEX idx_logs_app   (application_id),
  INDEX idx_logs_event (event_type, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
