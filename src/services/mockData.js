import bcrypt from "bcryptjs";
import {
  sanitizeSort,
  getEditableFields,
  normalizeFieldValue,
} from "../models/adminRepositoryUtils.js";

const DEFAULT_PASSWORD =
  process.env.MOCK_DEFAULT_PASSWORD?.trim() || "password";
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

const baseCompanies = [
  {
    company_id: 1,
    company_name: "TechNova",
    industry: "Informatique",
    company_size: "51-200",
    website: "https://technova.fr",
    city: "Paris",
    country: "France",
    created_at: new Date("2023-02-10T09:00:00Z"),
    updated_at: new Date("2024-01-12T10:00:00Z"),
  },
  {
    company_id: 2,
    company_name: "GreenPulse",
    industry: "Énergie",
    company_size: "201-500",
    website: "https://greenpulse.eu",
    city: "Lyon",
    country: "France",
    created_at: new Date("2023-05-03T14:00:00Z"),
    updated_at: new Date("2024-01-05T08:30:00Z"),
  },
  {
    company_id: 3,
    company_name: "DataFlow Labs",
    industry: "Conseil",
    company_size: "51-200",
    website: "https://dataflow-labs.com",
    city: "Lille",
    country: "France",
    created_at: new Date("2023-03-18T11:15:00Z"),
    updated_at: new Date("2024-02-01T07:45:00Z"),
  },
  {
    company_id: 4,
    company_name: "BlueRock Finance",
    industry: "Finance",
    company_size: "501-1000",
    website: "https://bluerock-finance.com",
    city: "Bordeaux",
    country: "France",
    created_at: new Date("2023-01-28T08:00:00Z"),
    updated_at: new Date("2024-01-28T08:00:00Z"),
  },
  {
    company_id: 5,
    company_name: "Helios Health",
    industry: "Santé",
    company_size: "101-250",
    website: "https://helios-health.fr",
    city: "Marseille",
    country: "France",
    created_at: new Date("2023-04-12T10:00:00Z"),
    updated_at: new Date("2024-02-03T09:00:00Z"),
  },
];

const basePeople = [
  {
    person_id: 1,
    first_name: "Alice",
    last_name: "Martin",
    email: "alice.martin@example.com",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 45 12 32 11",
    linkedin_url: "https://linkedin.com/in/alice-martin",
    person_type: "candidat",
    is_active: 1,
    company_id: null,
    position: null,
    created_at: new Date("2023-12-02T09:00:00Z"),
    updated_at: new Date("2024-01-15T11:00:00Z"),
  },
  {
    person_id: 2,
    first_name: "Bruno",
    last_name: "Leroy",
    email: "bruno.leroy@example.com",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 78 90 12 34",
    linkedin_url: null,
    person_type: "candidat",
    is_active: 1,
    company_id: null,
    position: null,
    created_at: new Date("2023-11-22T09:00:00Z"),
    updated_at: new Date("2024-01-15T11:00:00Z"),
  },
  {
    person_id: 3,
    first_name: "Clara",
    last_name: "Dubois",
    email: "clara.dubois@example.com",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 54 11 22 33",
    linkedin_url: "https://linkedin.com/in/clara-dubois",
    person_type: "candidat",
    is_active: 1,
    company_id: null,
    position: null,
    created_at: new Date("2023-11-10T09:00:00Z"),
    updated_at: new Date("2024-01-10T11:00:00Z"),
  },
  {
    person_id: 4,
    first_name: "David",
    last_name: "Roche",
    email: "david.roche@example.com",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 10 98 76 55",
    linkedin_url: null,
    person_type: "candidat",
    is_active: 1,
    company_id: null,
    position: null,
    created_at: new Date("2023-10-05T09:00:00Z"),
    updated_at: new Date("2024-01-08T11:00:00Z"),
  },
  {
    person_id: 5,
    first_name: "Emma",
    last_name: "Girard",
    email: "emma.girard@example.com",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 22 44 55 66",
    linkedin_url: "https://linkedin.com/in/emma-girard",
    person_type: "candidat",
    is_active: 1,
    company_id: null,
    position: null,
    created_at: new Date("2023-09-12T09:00:00Z"),
    updated_at: new Date("2024-01-06T11:00:00Z"),
  },
  {
    person_id: 6,
    first_name: "Hugo",
    last_name: "Lambert",
    email: "hugo.lambert@technova.fr",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 33 77 88 99",
    linkedin_url: "https://linkedin.com/in/hugo-lambert",
    person_type: "recruteur",
    is_active: 1,
    company_id: 1,
    position: "Talent Acquisition Manager",
    created_at: new Date("2023-07-20T09:00:00Z"),
    updated_at: new Date("2024-01-20T11:00:00Z"),
  },
  {
    person_id: 7,
    first_name: "Inès",
    last_name: "Bernard",
    email: "ines.bernard@greenpulse.eu",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 98 76 54 32",
    linkedin_url: null,
    person_type: "recruteur",
    is_active: 1,
    company_id: 2,
    position: "HR Manager",
    created_at: new Date("2023-07-10T09:00:00Z"),
    updated_at: new Date("2024-01-20T11:00:00Z"),
  },
  {
    person_id: 8,
    first_name: "Julien",
    last_name: "Perez",
    email: "julien.perez@dataflow-labs.com",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 12 34 56 78",
    linkedin_url: "https://linkedin.com/in/julien-perez",
    person_type: "recruteur",
    is_active: 1,
    company_id: 3,
    position: "Lead Recruiter",
    created_at: new Date("2023-06-15T09:00:00Z"),
    updated_at: new Date("2024-01-20T11:00:00Z"),
  },
  {
    person_id: 9,
    first_name: "Sarah",
    last_name: "Colin",
    email: "sarah.colin@bluerock-finance.com",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: "+33 6 88 77 66 55",
    linkedin_url: "https://linkedin.com/in/sarah-colin",
    person_type: "recruteur",
    is_active: 1,
    company_id: 4,
    position: "Talent Lead",
    created_at: new Date("2023-06-05T09:00:00Z"),
    updated_at: new Date("2024-01-20T11:00:00Z"),
  },
  {
    person_id: 10,
    first_name: "Admin",
    last_name: "JobBoard",
    email: "admin@jobboard.local",
    password_hash: DEFAULT_PASSWORD_HASH,
    phone: null,
    linkedin_url: null,
    person_type: "admin",
    is_active: 1,
    company_id: null,
    position: null,
    created_at: new Date("2023-06-01T09:00:00Z"),
    updated_at: new Date("2024-01-20T11:00:00Z"),
  },
];

const baseAdvertisements = [
  {
    ad_id: 1,
    company_id: 1,
    contact_person_id: 6,
    creator_id: 6,
    job_title: "Développeur Full-Stack Node.js",
    job_description:
      "Rejoignez l'équipe produit pour concevoir les prochaines fonctionnalités de la plateforme TechNova.",
    requirements:
      "3 ans d'expérience, maîtrise de Node.js/Express et d'un framework front.",
    location: "Paris",
    contract_type: "cdi",
    working_time: "temps_plein",
    experience_level: "intermediaire",
    remote_option: "hybride",
    salary_min: 45000,
    salary_max: 55000,
    currency: "EUR",
    deadline_date: new Date("2024-05-30T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-05T09:00:00Z"),
    updated_at: new Date("2024-02-05T09:00:00Z"),
  },
  {
    ad_id: 2,
    company_id: 1,
    contact_person_id: 6,
    creator_id: 6,
    job_title: "Product Designer",
    job_description:
      "Vous travaillerez avec les équipes produit pour améliorer l’expérience utilisateur du Job Board.",
    requirements: "Figma, design system, user research et prototypage rapide.",
    location: "Paris",
    contract_type: "cdi",
    working_time: "temps_plein",
    experience_level: "confirme",
    remote_option: "hybride",
    salary_min: 52000,
    salary_max: 62000,
    currency: "EUR",
    deadline_date: new Date("2024-06-15T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-12T09:00:00Z"),
    updated_at: new Date("2024-02-02T09:00:00Z"),
  },
  {
    ad_id: 3,
    company_id: 2,
    contact_person_id: 7,
    creator_id: 7,
    job_title: "Chef de projet Énergies renouvelables",
    job_description:
      "Pilotez des projets solaires et éoliens sur l’ensemble du territoire.",
    requirements:
      "Expérience en gestion de projets industriels, connaissances réglementaires.",
    location: "Lyon",
    contract_type: "cdi",
    working_time: "temps_plein",
    experience_level: "confirme",
    remote_option: "hybride",
    salary_min: 48000,
    salary_max: 60000,
    currency: "EUR",
    deadline_date: new Date("2024-06-01T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-08T09:00:00Z"),
    updated_at: new Date("2024-02-01T09:00:00Z"),
  },
  {
    ad_id: 4,
    company_id: 2,
    contact_person_id: 7,
    creator_id: 7,
    job_title: "Chargé de communication RSE",
    job_description:
      "Déployez les campagnes de communication autour des engagements climat de GreenPulse.",
    requirements: "Excellentes capacités rédactionnelles, appétence RSE.",
    location: "Lyon",
    contract_type: "cdd",
    working_time: "temps_partiel",
    experience_level: "intermediaire",
    remote_option: "hybride",
    salary_min: 32000,
    salary_max: 38000,
    currency: "EUR",
    deadline_date: new Date("2024-04-20T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-15T09:00:00Z"),
    updated_at: new Date("2024-02-04T09:00:00Z"),
  },
  {
    ad_id: 5,
    company_id: 3,
    contact_person_id: 8,
    creator_id: 8,
    job_title: "Consultant Data Engineer",
    job_description:
      "Accompagnez nos clients grands comptes dans la mise en place d’usines data modernes.",
    requirements: "Maîtrise de SQL, Python et d’une stack cloud (AWS/Azure).",
    location: "Lille",
    contract_type: "cdi",
    working_time: "temps_plein",
    experience_level: "confirme",
    remote_option: "full_remote",
    salary_min: 50000,
    salary_max: 65000,
    currency: "EUR",
    deadline_date: new Date("2024-05-15T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-18T09:00:00Z"),
    updated_at: new Date("2024-02-06T09:00:00Z"),
  },
  {
    ad_id: 6,
    company_id: 3,
    contact_person_id: 8,
    creator_id: 8,
    job_title: "Stagiaire Analyste Data",
    job_description:
      "Stage de 6 mois pour contribuer aux études data science au sein du Lab.",
    requirements: "Formation Bac+4/5, compétences Python et visualisation.",
    location: "Lille",
    contract_type: "stage",
    working_time: "temps_plein",
    experience_level: "debutant",
    remote_option: "hybride",
    salary_min: 1200,
    salary_max: 1400,
    currency: "EUR",
    deadline_date: new Date("2024-03-31T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-22T09:00:00Z"),
    updated_at: new Date("2024-02-07T09:00:00Z"),
  },
  {
    ad_id: 7,
    company_id: 4,
    contact_person_id: 9,
    creator_id: 9,
    job_title: "Analyste Financier Confirmé",
    job_description:
      "Analysez la performance des portefeuilles clients BlueRock.",
    requirements: "Expérience cabinet d’audit ou banque d’investissement.",
    location: "Bordeaux",
    contract_type: "cdi",
    working_time: "temps_plein",
    experience_level: "confirme",
    remote_option: "hybride",
    salary_min: 52000,
    salary_max: 68000,
    currency: "EUR",
    deadline_date: new Date("2024-04-30T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-25T09:00:00Z"),
    updated_at: new Date("2024-02-08T09:00:00Z"),
  },
  {
    ad_id: 8,
    company_id: 4,
    contact_person_id: 9,
    creator_id: 9,
    job_title: "Assistant Contrôle de gestion",
    job_description:
      "Poste junior pour suivre les budgets internes et les plans d’investissements.",
    requirements: "Bonne maîtrise d’Excel, appétence data.",
    location: "Bordeaux",
    contract_type: "alternance",
    working_time: "temps_plein",
    experience_level: "debutant",
    remote_option: "hybride",
    salary_min: 1400,
    salary_max: 1600,
    currency: "EUR",
    deadline_date: new Date("2024-05-05T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-01-28T09:00:00Z"),
    updated_at: new Date("2024-02-08T09:00:00Z"),
  },
  {
    ad_id: 9,
    company_id: 5,
    contact_person_id: 6,
    creator_id: 6,
    job_title: "Responsable Partenariats Santé",
    job_description:
      "Développez les relations avec les hôpitaux partenaires de Helios.",
    requirements: "Solide réseau dans le secteur médical, capacités négociation.",
    location: "Marseille",
    contract_type: "cdi",
    working_time: "temps_plein",
    experience_level: "confirme",
    remote_option: "hybride",
    salary_min: 48000,
    salary_max: 62000,
    currency: "EUR",
    deadline_date: new Date("2024-05-25T23:59:59Z"),
    status: "active",
    created_at: new Date("2024-02-01T09:00:00Z"),
    updated_at: new Date("2024-02-08T09:00:00Z"),
  },
  {
    ad_id: 10,
    company_id: 5,
    contact_person_id: 6,
    creator_id: 6,
    job_title: "Coordinateur événementiel (brouillon)",
    job_description:
      "Organisation des salons carrières pour promouvoir Helios Health.",
    requirements: "Organisation, aisance relationnelle, mobilité nationale.",
    location: "Marseille",
    contract_type: "cdd",
    working_time: "temps_plein",
    experience_level: "intermediaire",
    remote_option: "hybride",
    salary_min: 36000,
    salary_max: 40000,
    currency: "EUR",
    deadline_date: new Date("2024-05-30T23:59:59Z"),
    status: "brouillon",
    created_at: new Date("2024-02-05T09:00:00Z"),
    updated_at: new Date("2024-02-08T09:00:00Z"),
  },
];

const baseApplications = [
  {
    application_id: 1,
    ad_id: 1,
    person_id: 1,
    status: "recu",
    cv_path: "https://cdn.example.com/cv/alice-martin.pdf",
    cover_letter: "Intéressée par la stack Node/React proposée.",
    notes: null,
    application_date: new Date("2024-02-05T11:00:00Z"),
    created_at: new Date("2024-02-05T11:00:00Z"),
    updated_at: new Date("2024-02-05T11:00:00Z"),
  },
  {
    application_id: 2,
    ad_id: 1,
    person_id: 2,
    status: "a_recevoir",
    cv_path: "https://cdn.example.com/cv/bruno-leroy.pdf",
    cover_letter: "Expérience confirmée sur stack Node.",
    notes: null,
    application_date: new Date("2024-02-06T08:30:00Z"),
    created_at: new Date("2024-02-06T08:30:00Z"),
    updated_at: new Date("2024-02-08T09:10:00Z"),
  },
  {
    application_id: 3,
    ad_id: 2,
    person_id: 3,
    status: "a_appeler",
    cv_path: "https://cdn.example.com/cv/clara-dubois.pdf",
    cover_letter: "Forte expérience UX/UI sur marketplaces.",
    notes: null,
    application_date: new Date("2024-02-07T10:15:00Z"),
    created_at: new Date("2024-02-07T10:15:00Z"),
    updated_at: new Date("2024-02-08T09:05:00Z"),
  },
  {
    application_id: 4,
    ad_id: 3,
    person_id: 4,
    status: "recu",
    cv_path: "https://cdn.example.com/cv/david-roche.pdf",
    cover_letter: "5 ans d'expérience dans la gestion de projets éoliens.",
    notes: null,
    application_date: new Date("2024-02-05T13:00:00Z"),
    created_at: new Date("2024-02-05T13:00:00Z"),
    updated_at: new Date("2024-02-05T13:00:00Z"),
  },
  {
    application_id: 5,
    ad_id: 4,
    person_id: 5,
    status: "recrute",
    cv_path: "https://cdn.example.com/cv/emma-girard.pdf",
    cover_letter: "Spécialiste communication et créatrice de contenus.",
    notes: "Excellent fit culturel",
    application_date: new Date("2024-02-01T09:30:00Z"),
    created_at: new Date("2024-02-01T09:30:00Z"),
    updated_at: new Date("2024-02-07T15:00:00Z"),
  },
  {
    application_id: 6,
    ad_id: 5,
    person_id: 1,
    status: "recu",
    cv_path: "https://cdn.example.com/cv/alice-martin.pdf",
    cover_letter: "Passionnée par la data et les environnements cloud.",
    notes: null,
    application_date: new Date("2024-02-08T12:20:00Z"),
    created_at: new Date("2024-02-08T12:20:00Z"),
    updated_at: new Date("2024-02-08T12:20:00Z"),
  },
  {
    application_id: 7,
    ad_id: 5,
    person_id: 2,
    status: "refuse",
    cv_path: "https://cdn.example.com/cv/bruno-leroy.pdf",
    cover_letter: "Disponible immédiatement.",
    notes: "Tech stack partiellement maîtrisée",
    application_date: new Date("2024-02-02T15:45:00Z"),
    created_at: new Date("2024-02-02T15:45:00Z"),
    updated_at: new Date("2024-02-06T14:10:00Z"),
  },
  {
    application_id: 8,
    ad_id: 6,
    person_id: 3,
    status: "recu",
    cv_path: "https://cdn.example.com/cv/clara-dubois.pdf",
    cover_letter: "Recherche stage data science de fin d'études.",
    notes: null,
    application_date: new Date("2024-02-04T10:00:00Z"),
    created_at: new Date("2024-02-04T10:00:00Z"),
    updated_at: new Date("2024-02-04T10:00:00Z"),
  },
  {
    application_id: 9,
    ad_id: 7,
    person_id: 4,
    status: "a_recevoir",
    cv_path: "https://cdn.example.com/cv/david-roche.pdf",
    cover_letter: "Double expérience audit & conseil.",
    notes: null,
    application_date: new Date("2024-02-03T09:10:00Z"),
    created_at: new Date("2024-02-03T09:10:00Z"),
    updated_at: new Date("2024-02-08T09:10:00Z"),
  },
  {
    application_id: 10,
    ad_id: 8,
    person_id: 5,
    status: "recu",
    cv_path: "https://cdn.example.com/cv/emma-girard.pdf",
    cover_letter: "Recherche alternance pour compléter Master CCA.",
    notes: null,
    application_date: new Date("2024-02-06T09:00:00Z"),
    created_at: new Date("2024-02-06T09:00:00Z"),
    updated_at: new Date("2024-02-06T09:00:00Z"),
  },
];

const state = {
  seeded: false,
  companies: [],
  people: [],
  ads: [],
  applications: [],
  applicationLogs: [],
};

let mockEnabled = process.env.FORCE_MOCK_DATA === "true";

function cloneValue(value) {
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    const copy = {};
    for (const [k, v] of Object.entries(value)) {
      copy[k] = cloneValue(v);
    }
    return copy;
  }
  return value;
}

function cloneRow(row) {
  if (!row) return row;
  return cloneValue(row);
}

function seedCollections() {
  if (state.seeded) return;
  state.companies.push(...baseCompanies.map(cloneRow));
  state.people.push(...basePeople.map(cloneRow));
  state.ads.push(...baseAdvertisements.map(cloneRow));
  state.applications.push(...baseApplications.map(cloneRow));
  state.seeded = true;
}

function ensureSeeded() {
  if (!state.seeded) {
    seedCollections();
  }
}

if (mockEnabled) {
  console.warn("[MOCK DATA] Mode activé via FORCE_MOCK_DATA=1");
  ensureSeeded();
}

export function enableMockDataMode(reason = "") {
  if (mockEnabled) return true;
  mockEnabled = true;
  console.warn(
    `[MOCK DATA] Mode activé${
      reason ? ` car ${reason}` : " suite à l'échec de la base de données"
    }`
  );
  ensureSeeded();
  return true;
}

export function isMockDataEnabled() {
  return mockEnabled;
}

function nextId(collection, key) {
  const maxId = collection.reduce(
    (max, item) => Math.max(max, Number(item?.[key]) || 0),
    0
  );
  return maxId + 1;
}

function compareBySort(rows, sortArray) {
  if (!Array.isArray(sortArray) || !sortArray.length) return rows;
  return rows.sort((a, b) => {
    for (const { column, direction } of sortArray) {
      const dir = direction === "ASC" ? 1 : -1;
      const av = a[column];
      const bv = b[column];
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av > bv) return dir;
      if (av < bv) return -dir;
    }
    return 0;
  });
}

function getCompanyById(id) {
  ensureSeeded();
  return state.companies.find((c) => c.company_id === Number(id)) || null;
}

function getCompanyName(id) {
  const company = getCompanyById(id);
  return company?.company_name ?? null;
}

function getPersonById(id) {
  ensureSeeded();
  return state.people.find((p) => p.person_id === Number(id)) || null;
}

function getAdById(id) {
  ensureSeeded();
  return state.ads.find((ad) => ad.ad_id === Number(id)) || null;
}

function getContactName(personId) {
  const person = getPersonById(personId);
  if (!person) return null;
  return [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function getTableCollection(tableKey) {
  ensureSeeded();
  switch (tableKey) {
    case "people":
      return state.people;
    case "companies":
      return state.companies;
    case "advertisements":
      return state.ads;
    case "applications":
      return state.applications;
    case "application_logs":
      return state.applicationLogs;
    default:
      return null;
  }
}

function ensureTimestamps(tableConfig, values, mode) {
  const now = new Date();
  const hasCreatedAt = tableConfig.fields.some(
    (field) => field.name === "created_at"
  );
  const hasUpdatedAt = tableConfig.fields.some(
    (field) => field.name === "updated_at"
  );
  if (mode === "create" && hasCreatedAt && values.created_at === undefined) {
    values.created_at = now;
  }
  if (hasUpdatedAt) {
    values.updated_at = now;
  }
}

async function extractValues(tableConfig, body, mode) {
  const values = {};
  const errors = [];
  const fields = getEditableFields(tableConfig, mode);
  for (const field of fields) {
    const hasValue = Object.prototype.hasOwnProperty.call(body, field.name);
    if (
      !hasValue &&
      mode === "create" &&
      field.required &&
      !field.specialHandler
    ) {
      errors.push(`Le champ ${field.label} est requis.`);
      continue;
    }
    if (!hasValue) continue;
    const { shouldUse, value } = normalizeFieldValue(field, body[field.name]);
    if (!shouldUse) continue;
    if (field.specialHandler) {
      const specialResult = await field.specialHandler(value);
      if (specialResult?.column) {
        values[specialResult.column] = specialResult.value;
      }
      continue;
    }
    values[field.name] = value;
  }
  if (errors.length) {
    const err = new Error(errors.join("\n"));
    err.statusCode = 422;
    throw err;
  }
  ensureTimestamps(tableConfig, values, mode);
  return values;
}

// Repositories will be defined below and exported
export const mockAdsRepo = {
  async findById(id) {
    ensureSeeded();
    const row = getAdById(id);
    return row ? cloneRow(row) : null;
  },

  async list({ limit = 20, offset = 0, status = null, search = "" } = {}) {
    ensureSeeded();
    let rows = [...state.ads];
    if (status) {
      const wanted = String(status).toLowerCase();
      rows = rows.filter(
        (ad) => String(ad.status).toLowerCase() === wanted
      );
    }
    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter((ad) => {
        const company = getCompanyName(ad.company_id) || "";
        return (
          (ad.job_title || "").toLowerCase().includes(needle) ||
          company.toLowerCase().includes(needle) ||
          (ad.location || "").toLowerCase().includes(needle)
        );
      });
    }
    rows.sort((a, b) => b.created_at - a.created_at);
    const total = rows.length;
    const slice = rows.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );
    return {
      items: slice.map(cloneRow),
      total,
    };
  },

  async create(data) {
    ensureSeeded();
    const now = new Date();
    const newAd = {
      ad_id: nextId(state.ads, "ad_id"),
      company_id: data.company_id ?? null,
      contact_person_id: data.contact_person_id ?? null,
      creator_id: data.creator_id ?? data.contact_person_id ?? null,
      job_title: data.job_title ?? "",
      job_description: data.job_description ?? "",
      requirements: data.requirements ?? "",
      location: data.location ?? "",
      contract_type: data.contract_type ?? "cdi",
      working_time: data.working_time ?? null,
      experience_level: data.experience_level ?? null,
      remote_option: data.remote_option ?? null,
      salary_min:
        data.salary_min != null ? Number(data.salary_min) : null,
      salary_max:
        data.salary_max != null ? Number(data.salary_max) : null,
      currency: data.currency ?? "EUR",
      deadline_date: data.deadline_date
        ? new Date(data.deadline_date)
        : null,
      status: data.status ?? "active",
      created_at: now,
      updated_at: now,
    };
    state.ads.push(newAd);
    return cloneRow(newAd);
  },

  async update(id, updates) {
    ensureSeeded();
    const row = getAdById(id);
    if (!row) return null;
    Object.assign(row, {
      ...updates,
      updated_at: new Date(),
    });
    return cloneRow(row);
  },

  async remove(id) {
    ensureSeeded();
    const idx = state.ads.findIndex((ad) => ad.ad_id === Number(id));
    if (idx === -1) return false;
    state.ads.splice(idx, 1);
    // supprimer aussi les candidatures associées
    state.applications = state.applications.filter(
      (app) => app.ad_id !== Number(id)
    );
    return true;
  },

  async listPublicActive({
    companyId = null,
    limit = null,
    offset = 0,
    withTotal = false,
  } = {}) {
    ensureSeeded();
    let rows = state.ads.filter((ad) => ad.status === "active");
    if (companyId) {
      const cid = Number(companyId);
      rows = rows.filter((ad) => ad.company_id === cid);
    }
    rows.sort((a, b) => b.created_at - a.created_at);
    const total = rows.length;
    const slice =
      limit == null
        ? rows
        : rows.slice(Number(offset), Number(offset) + Number(limit));
    const items = slice.map((ad) => ({
      ad_id: ad.ad_id,
      company_id: ad.company_id,
      job_title: ad.job_title,
      location: ad.location,
      contract_type: ad.contract_type,
      salary_min: ad.salary_min,
      salary_max: ad.salary_max,
      currency: ad.currency,
      created_at: cloneValue(ad.created_at),
      deadline_date: cloneValue(ad.deadline_date),
      company_name: getCompanyName(ad.company_id),
    }));
    return withTotal ? { items, total } : { items };
  },

  async countPublicActive({ companyId = null } = {}) {
    ensureSeeded();
    return state.ads.filter((ad) => {
      if (ad.status !== "active") return false;
      if (companyId && ad.company_id !== Number(companyId)) return false;
      return true;
    }).length;
  },

  async listPublicWithRelations() {
    ensureSeeded();
    return state.ads
      .filter((ad) => ad.status === "active")
      .map((ad) => ({
        ...cloneRow(ad),
        company_name: getCompanyName(ad.company_id),
        contact_name: getContactName(ad.contact_person_id),
      }));
  },

  async findPublicById(id) {
    ensureSeeded();
    const ad = getAdById(id);
    if (!ad || ad.status !== "active") return null;
    const company = getCompanyById(ad.company_id);
    return {
      ad_id: ad.ad_id,
      company_id: ad.company_id,
      contact_person_id: ad.contact_person_id,
      job_title: ad.job_title,
      job_description: ad.job_description,
      requirements: ad.requirements,
      location: ad.location,
      contract_type: ad.contract_type,
      salary_min: ad.salary_min,
      salary_max: ad.salary_max,
      currency: ad.currency,
      deadline_date: cloneValue(ad.deadline_date),
      status: ad.status,
      created_at: cloneValue(ad.created_at),
      updated_at: cloneValue(ad.updated_at),
      company_name: company?.company_name ?? null,
      industry: company?.industry ?? null,
      company_size: company?.company_size ?? null,
      website: company?.website ?? null,
      city: company?.city ?? null,
      country: company?.country ?? null,
    };
  },

  async findActiveById(id) {
    ensureSeeded();
    const ad = getAdById(id);
    if (!ad || ad.status !== "active") return null;
    return cloneRow(ad);
  },

  async ensureOwnership(adId, recruiterId) {
    ensureSeeded();
    const ad = getAdById(adId);
    if (!ad) return null;
    if (ad.contact_person_id !== Number(recruiterId)) return null;
    return cloneRow(ad);
  },

  async listForRecruiter(recruiterId) {
    ensureSeeded();
    return state.ads
      .filter((ad) => ad.contact_person_id === Number(recruiterId))
      .sort((a, b) => b.created_at - a.created_at)
      .map((ad) => ({
        ...cloneRow(ad),
        company_name: getCompanyName(ad.company_id),
      }));
  },

  async findForRecruiter(adId, recruiterId) {
    ensureSeeded();
    const ad = await this.ensureOwnership(adId, recruiterId);
    if (!ad) return null;
    return {
      ...ad,
      company_name: getCompanyName(ad.company_id),
    };
  },

  async createForRecruiter({ recruiterId, companyId, data }) {
    ensureSeeded();
    if (!companyId) throw new Error("company_id_required");
    const now = new Date();
    const newAd = {
      ad_id: nextId(state.ads, "ad_id"),
      company_id: Number(companyId),
      contact_person_id: Number(recruiterId),
      creator_id: Number(recruiterId),
      job_title: data?.job_title ?? "",
      job_description: data?.job_description ?? "",
      requirements: data?.requirements ?? "",
      location: data?.location ?? "",
      contract_type: data?.contract_type ?? "cdi",
      working_time: data?.working_time ?? null,
      experience_level: data?.experience_level ?? null,
      remote_option: data?.remote_option ?? null,
      salary_min:
        data?.salary_min != null ? Number(data.salary_min) : null,
      salary_max:
        data?.salary_max != null ? Number(data.salary_max) : null,
      currency: data?.currency ?? "EUR",
      deadline_date: data?.deadline_date
        ? new Date(data.deadline_date)
        : null,
      status: data?.status ?? "active",
      created_at: now,
      updated_at: now,
    };
    state.ads.push(newAd);
    return this.findForRecruiter(newAd.ad_id, recruiterId);
  },

  async updateForRecruiter(adId, recruiterId, updates) {
    ensureSeeded();
    const ad = getAdById(adId);
    if (!ad || ad.contact_person_id !== Number(recruiterId)) return null;
    const allowedKeys = [
      "job_title",
      "job_description",
      "requirements",
      "location",
      "contract_type",
      "working_time",
      "experience_level",
      "remote_option",
      "salary_min",
      "salary_max",
      "currency",
      "deadline_date",
      "status",
    ];
    for (const key of allowedKeys) {
      if (!Object.prototype.hasOwnProperty.call(updates, key)) continue;
      let value = updates[key];
      if (key === "salary_min" || key === "salary_max") {
        value = value != null ? Number(value) : null;
        if (!Number.isFinite(value)) value = null;
      }
      if (key === "deadline_date" && value) {
        value = new Date(value);
      }
      ad[key] = value;
    }
    ad.updated_at = new Date();
    return this.findForRecruiter(adId, recruiterId);
  },

  async removeForRecruiter(adId, recruiterId) {
    ensureSeeded();
    const idx = state.ads.findIndex(
      (ad) =>
        ad.ad_id === Number(adId) &&
        ad.contact_person_id === Number(recruiterId)
    );
    if (idx === -1) return false;
    state.ads.splice(idx, 1);
    state.applications = state.applications.filter(
      (app) => app.ad_id !== Number(adId)
    );
    return true;
  },

  async updateStatusForRecruiter(adId, recruiterId, status) {
    ensureSeeded();
    const ad = getAdById(adId);
    if (!ad || ad.contact_person_id !== Number(recruiterId)) return null;
    ad.status = status;
    ad.updated_at = new Date();
    return this.findForRecruiter(adId, recruiterId);
  },
};
export const mockApplicationsRepo = {
  async findById(id) {
    ensureSeeded();
    const row =
      state.applications.find(
        (app) => app.application_id === Number(id)
      ) || null;
    return row ? cloneRow(row) : null;
  },

  async listByAd(adId, { limit = 50, offset = 0 } = {}) {
    ensureSeeded();
    const rows = state.applications
      .filter((app) => app.ad_id === Number(adId))
      .sort((a, b) => b.application_date - a.application_date);
    const slice = rows.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );
    return slice.map(cloneRow);
  },

  async listByPerson(personId, { limit = 50, offset = 0 } = {}) {
    ensureSeeded();
    const rows = state.applications
      .filter((app) => app.person_id === Number(personId))
      .sort((a, b) => b.application_date - a.application_date);
    const slice = rows.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );
    return slice.map(cloneRow);
  },

  async create({
    adId,
    personId,
    status = "soumise",
    cvPath = null,
    coverLetter = null,
    notes = null,
  }) {
    ensureSeeded();
    const now = new Date();
    const row = {
      application_id: nextId(state.applications, "application_id"),
      ad_id: Number(adId),
      person_id: Number(personId),
      status,
      cv_path: cvPath,
      cover_letter: coverLetter,
      notes,
      application_date: now,
      created_at: now,
      updated_at: now,
    };
    state.applications.push(row);
    return cloneRow(row);
  },

  async update(id, data) {
    ensureSeeded();
    const row = state.applications.find(
      (app) => app.application_id === Number(id)
    );
    if (!row) return null;
    Object.assign(row, data, { updated_at: new Date() });
    return cloneRow(row);
  },

  async remove(id) {
    ensureSeeded();
    const idx = state.applications.findIndex(
      (app) => app.application_id === Number(id)
    );
    if (idx === -1) return false;
    state.applicationLogs.push({
      log_id: nextId(state.applicationLogs, "log_id"),
      application_id: state.applications[idx].application_id,
      previous_status: state.applications[idx].status,
      new_status: "deleted",
      changed_at: new Date(),
    });
    state.applications.splice(idx, 1);
    return true;
  },

  async listWithAdDetailsByPerson(
    personId,
    { statuses = null, limit = null, offset = 0 } = {}
  ) {
    ensureSeeded();
    let rows = state.applications.filter(
      (app) => app.person_id === Number(personId)
    );
    if (Array.isArray(statuses) && statuses.length) {
      const set = new Set(statuses);
      rows = rows.filter((app) => set.has(app.status));
    }
    rows.sort((a, b) => b.application_date - a.application_date);
    const slice =
      limit == null
        ? rows
        : rows.slice(Number(offset), Number(offset) + Number(limit));
    return slice.map((app) => {
      const ad = getAdById(app.ad_id);
      const company = ad ? getCompanyById(ad.company_id) : null;
      return {
        application_id: app.application_id,
        application_date: cloneValue(app.application_date),
        updated_at: cloneValue(app.updated_at),
        status: app.status,
        cv_path: app.cv_path,
        cover_letter: app.cover_letter,
        notes: app.notes,
        person_id: app.person_id,
        ad_id: ad?.ad_id ?? null,
        job_title: ad?.job_title ?? null,
        location: ad?.location ?? null,
        contract_type: ad?.contract_type ?? null,
        salary_min: ad?.salary_min ?? null,
        salary_max: ad?.salary_max ?? null,
        currency: ad?.currency ?? "EUR",
        deadline_date: cloneValue(ad?.deadline_date ?? null),
        company_name: company?.company_name ?? null,
      };
    });
  },

  async countByStatusForPerson(personId) {
    ensureSeeded();
    return state.applications
      .filter((app) => app.person_id === Number(personId))
      .reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});
  },

  async findByAdAndPerson(adId, personId) {
    ensureSeeded();
    const row =
      state.applications.find(
        (app) =>
          app.ad_id === Number(adId) &&
          app.person_id === Number(personId)
      ) || null;
    return row ? cloneRow(row) : null;
  },

  async hasNonRefusedForPerson(adId, personId) {
    ensureSeeded();
    return state.applications.some(
      (app) =>
        app.ad_id === Number(adId) &&
        app.person_id === Number(personId) &&
        app.status !== "refuse"
    );
  },

  async createOrReapply({ adId, personId, cvPath = null, coverLetter = null }) {
    ensureSeeded();
    const existing = state.applications.find(
      (app) =>
        app.ad_id === Number(adId) &&
        app.person_id === Number(personId)
    );
    if (existing && existing.status !== "refuse") {
      return { status: "exists", application: cloneRow(existing) };
    }

    if (existing) {
      existing.cv_path = cvPath;
      existing.cover_letter = coverLetter;
      existing.status = "recu";
      existing.application_date = new Date();
      existing.updated_at = new Date();
      return { status: "reapplied", applicationId: existing.application_id };
    }

    const now = new Date();
    const row = {
      application_id: nextId(state.applications, "application_id"),
      ad_id: Number(adId),
      person_id: Number(personId),
      cv_path: cvPath,
      cover_letter: coverLetter,
      status: "recu",
      notes: null,
      application_date: now,
      created_at: now,
      updated_at: now,
    };
    state.applications.push(row);
    return { status: "created", applicationId: row.application_id };
  },

  async listWithCandidateByAd(adId) {
    ensureSeeded();
    return state.applications
      .filter((app) => app.ad_id === Number(adId))
      .sort((a, b) => b.application_date - a.application_date)
      .map((app) => {
        const person = getPersonById(app.person_id);
        return {
          ...cloneRow(app),
          first_name: person?.first_name ?? null,
          last_name: person?.last_name ?? null,
          email: person?.email ?? null,
          phone: person?.phone ?? null,
        };
      });
  },

  async ensureBelongsToRecruiter(applicationId, recruiterId) {
    ensureSeeded();
    const app = state.applications.find(
      (row) => row.application_id === Number(applicationId)
    );
    if (!app) return null;
    const ad = getAdById(app.ad_id);
    if (!ad || ad.contact_person_id !== Number(recruiterId)) return null;
    return {
      application_id: app.application_id,
      ad_id: app.ad_id,
      status: app.status,
    };
  },

  async updateStatus(applicationId, status) {
    ensureSeeded();
    const row = state.applications.find(
      (app) => app.application_id === Number(applicationId)
    );
    if (!row) return null;
    row.status = status;
    row.updated_at = new Date();
    return cloneRow(row);
  },

  async updateStatusForRecruiter(applicationId, recruiterId, status) {
    ensureSeeded();
    const ownership = await this.ensureBelongsToRecruiter(
      applicationId,
      recruiterId
    );
    if (!ownership) return null;
    return this.updateStatus(applicationId, status);
  },

  async countNewForRecruiter(recruiterId) {
    ensureSeeded();
    return state.applications.filter((app) => {
      if (app.status !== "recu") return false;
      const ad = getAdById(app.ad_id);
      return ad?.contact_person_id === Number(recruiterId);
    }).length;
  },

  async countNewForAd(adId, recruiterId = null) {
    ensureSeeded();
    return state.applications.filter((app) => {
      if (app.ad_id !== Number(adId)) return false;
      if (app.status !== "recu") return false;
      if (!recruiterId) return true;
      const ad = getAdById(app.ad_id);
      return ad?.contact_person_id === Number(recruiterId);
    }).length;
  },
};
export const mockCompaniesRepo = {
  async findByNameInsensitive(name) {
    ensureSeeded();
    if (!name) return null;
    const target = String(name).trim().toLowerCase();
    return (
      state.companies.find(
        (c) => c.company_name?.toLowerCase() === target
      ) || null
    );
  },

  async create({ name }) {
    ensureSeeded();
    const normalized = String(name ?? "").trim();
    if (!normalized) throw new Error("company_name_required");
    const now = new Date();
    const row = {
      company_id: nextId(state.companies, "company_id"),
      company_name: normalized,
      industry: null,
      company_size: null,
      website: null,
      city: null,
      country: "France",
      created_at: now,
      updated_at: now,
    };
    state.companies.push(row);
    return cloneRow(row);
  },

  async ensureByName(name) {
    ensureSeeded();
    const existing = await this.findByNameInsensitive(name);
    if (existing) return cloneRow(existing);
    return this.create({ name });
  },

  async findById(id) {
    ensureSeeded();
    const company = getCompanyById(id);
    return company ? cloneRow(company) : null;
  },

  async attachToUser(personId, companyId) {
    ensureSeeded();
    const person = getPersonById(personId);
    if (!person) return null;
    person.company_id = Number(companyId);
    person.updated_at = new Date();
    return cloneRow(person);
  },

  async findByUserId(personId) {
    ensureSeeded();
    const person = getPersonById(personId);
    if (!person?.company_id) return null;
    const company = getCompanyById(person.company_id);
    return company ? cloneRow(company) : null;
  },

  async updateName(companyId, name) {
    ensureSeeded();
    const company = getCompanyById(companyId);
    if (!company) throw new Error("company_not_found");
    const normalized = String(name ?? "").trim();
    if (!normalized) throw new Error("company_name_required");
    company.company_name = normalized;
    company.updated_at = new Date();
    return cloneRow(company);
  },

  async listIndustries() {
    ensureSeeded();
    const set = new Set();
    state.companies.forEach((company) => {
      if (company.industry) {
        set.add(company.industry);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  },

  async listWithActiveAds({ industry = null } = {}) {
    ensureSeeded();
    const filtered = state.companies.filter((company) => {
      if (!industry) return true;
      return company.industry === industry;
    });
    return filtered
      .map((company) => {
        const activeCount = state.ads.filter(
          (ad) =>
            ad.company_id === company.company_id &&
            ad.status === "active"
        ).length;
        return {
          company_id: company.company_id,
          company_name: company.company_name,
          industry: company.industry,
          created_at: cloneValue(company.created_at),
          active_ads_count: activeCount,
        };
      })
      .sort((a, b) => a.company_name.localeCompare(b.company_name));
  },
};
export const mockUsersRepo = {
  async findById(id) {
    ensureSeeded();
    const person = getPersonById(id);
    return person ? cloneRow(person) : null;
  },

  async findByEmail(email) {
    ensureSeeded();
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const person =
      state.people.find(
        (p) => normalizeEmail(p.email) === normalized
      ) || null;
    return person ? cloneRow(person) : null;
  },

  async list({ limit = 20, offset = 0, role = null, search = "" } = {}) {
    ensureSeeded();
    let rows = [...state.people];
    if (role) {
      rows = rows.filter((p) => p.person_type === role);
    }
    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter((p) => {
        return (
          (p.first_name || "").toLowerCase().includes(needle) ||
          (p.last_name || "").toLowerCase().includes(needle) ||
          (p.email || "").toLowerCase().includes(needle)
        );
      });
    }
    rows.sort((a, b) => b.created_at - a.created_at);
    const total = rows.length;
    const slice = rows.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );
    return {
      items: slice.map(cloneRow),
      total,
    };
  },

  async create({
    firstName,
    lastName,
    email,
    passwordHash = null,
    phone = null,
    linkedinUrl = null,
    role = "candidat",
    isActive = 1,
    companyId = null,
    position = null,
  }) {
    ensureSeeded();
    const now = new Date();
    const row = {
      person_id: nextId(state.people, "person_id"),
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      email: normalizeEmail(email),
      password_hash: passwordHash,
      phone,
      linkedin_url: linkedinUrl,
      person_type: role,
      is_active: isActive,
      company_id: companyId ? Number(companyId) : null,
      position,
      created_at: now,
      updated_at: now,
    };
    state.people.push(row);
    return cloneRow(row);
  },

  async update(id, data) {
    ensureSeeded();
    const person = getPersonById(id);
    if (!person) return null;
    const map = {
      firstName: "first_name",
      lastName: "last_name",
      email: "email",
      passwordHash: "password_hash",
      phone: "phone",
      linkedinUrl: "linkedin_url",
      role: "person_type",
      isActive: "is_active",
      companyId: "company_id",
      position: "position",
    };
    for (const [key, column] of Object.entries(map)) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      let value = data[key];
      if (key === "email") value = normalizeEmail(value);
      if (key === "companyId") {
        value = value ? Number(value) : null;
      }
      person[column] = value;
    }
    person.updated_at = new Date();
    return cloneRow(person);
  },

  async setPasswordHash(id, passwordHash) {
    ensureSeeded();
    const person = getPersonById(id);
    if (!person) return null;
    person.password_hash = passwordHash;
    person.updated_at = new Date();
    return cloneRow(person);
  },

  async remove(id) {
    ensureSeeded();
    const idx = state.people.findIndex(
      (person) => person.person_id === Number(id)
    );
    if (idx === -1) return false;
    state.people.splice(idx, 1);
    return true;
  },

  async fetchProfileRow(personId) {
    ensureSeeded();
    const person = getPersonById(personId);
    if (!person) return null;
    const company = person.company_id
      ? getCompanyById(person.company_id)
      : null;
    return {
      person_id: person.person_id,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone,
      linkedin_url: person.linkedin_url,
      role: person.person_type,
      company_id: person.company_id,
      password_hash: person.password_hash,
      is_active: person.is_active,
      created_at: cloneValue(person.created_at),
      updated_at: cloneValue(person.updated_at),
      company_name: company?.company_name ?? null,
      industry: company?.industry ?? null,
    };
  },

  async findWithCompany(personId) {
    return this.fetchProfileRow(personId);
  },

  async getRecruiterContext(personId) {
    ensureSeeded();
    const person = getPersonById(personId);
    if (!person) return null;
    const company = person.company_id
      ? getCompanyById(person.company_id)
      : null;
    return {
      person_id: person.person_id,
      email: person.email,
      company_id: person.company_id,
      company_name: company?.company_name ?? null,
      industry: company?.industry ?? null,
    };
  },

  async ensureCandidateByEmail({ email, fullName = "", phone = null }) {
    ensureSeeded();
    const normalized = normalizeEmail(email);
    if (!normalized) throw new Error("email_required");
    const existing = await this.findByEmail(normalized);
    if (existing) {
      return existing.person_id;
    }
    const safeName = String(fullName || "").trim();
    let firstName = safeName;
    let lastName = "";
    if (safeName.includes(" ")) {
      const parts = safeName.split(" ");
      firstName = parts.shift();
      lastName = parts.join(" ");
    }
    if (!firstName) {
      firstName = normalized.split("@")[0] || "Candidat";
    }
    const created = await this.create({
      firstName,
      lastName,
      email: normalized,
      phone,
      role: "candidat",
      passwordHash: null,
    });
    return created.person_id;
  },
};
export const mockAdminRepository = {
  async list(tableKey, tableConfig, { page = 1, limit = 10, search = "", sort = null }) {
    ensureSeeded();
    const collection = getTableCollection(tableKey);
    if (!collection) {
      return { items: [], total: 0 };
    }
    const safeLimit = Math.max(1, Number(limit) || 10);
    const safePage = Math.max(1, Number(page) || 1);
    const cloned = collection.map(cloneRow);
    let rows = cloned;
    if (search && tableConfig.searchColumns?.length) {
      const needle = search.toLowerCase();
      rows = rows.filter((row) =>
        tableConfig.searchColumns.some((column) =>
          String(row[column] ?? "").toLowerCase().includes(needle)
        )
      );
    }

    const sortArray = sanitizeSort(tableConfig, sort);
    rows = compareBySort(rows, sortArray);

    const total = rows.length;
    const offset = (safePage - 1) * safeLimit;
    const slice = rows.slice(offset, offset + safeLimit);
    return { items: slice, total };
  },

  async findById(tableKey, tableConfig, id) {
    ensureSeeded();
    const collection = getTableCollection(tableKey);
    if (!collection) return null;
    const primaryKey = tableConfig.primaryKey;
    const row =
      collection.find((item) => item[primaryKey] === Number(id)) || null;
    return row ? cloneRow(row) : null;
  },

  async create(tableKey, tableConfig, body) {
    ensureSeeded();
    const collection = getTableCollection(tableKey);
    if (!collection) {
      throw new Error("Table inconnue en mode mock");
    }
    const values = await extractValues(tableConfig, body ?? {}, "create");
    const primaryKey = tableConfig.primaryKey;
    const row = {
      [primaryKey]: nextId(collection, primaryKey),
      ...values,
    };
    collection.push(row);
    return cloneRow(row);
  },

  async update(tableKey, tableConfig, id, body) {
    ensureSeeded();
    const collection = getTableCollection(tableKey);
    if (!collection) {
      throw new Error("Table inconnue en mode mock");
    }
    const primaryKey = tableConfig.primaryKey;
    const row = collection.find((item) => item[primaryKey] === Number(id));
    if (!row) return null;
    const values = await extractValues(tableConfig, body ?? {}, "update");
    Object.assign(row, values);
    if (tableConfig.fields.some((f) => f.name === "updated_at")) {
      row.updated_at = new Date();
    }
    return cloneRow(row);
  },

  async remove(tableKey, tableConfig, id) {
    ensureSeeded();
    const collection = getTableCollection(tableKey);
    if (!collection) return false;
    const primaryKey = tableConfig.primaryKey;
    const idx = collection.findIndex(
      (item) => item[primaryKey] === Number(id)
    );
    if (idx === -1) return false;
    collection.splice(idx, 1);
    return true;
  },
};
