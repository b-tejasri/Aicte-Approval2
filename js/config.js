/* ═══════════════════════════════════════════════════════
   js/config.js — Global Config, State & Constants
   ═══════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000/vvit';

// ── Global State ──────────────────────────────────────
let currentRole = '';
let institutionId = 0;
let institutionName = '';
let currentUploadSection = '';
let allInstitutions = [];
let chartInstances = {};
let currentReviewApprovalId = null;
let uploadedSections = [];
let dashboardData = {};

// ── OTP State ─────────────────────────────────────────
let regCountdownTimer = null;
let regEmailForOTP = '';

// ── Section Definitions ───────────────────────────────
const SECTION_DEFS = [
  { key: 'faculty',        icon: '👨‍🏫', title: 'Faculty Details',       desc: 'Faculty list, qualifications, designations, experience, PhD details.' },
  { key: 'labs',           icon: '🔬', title: 'Laboratory Details',     desc: 'Lab names, departments, area in sqft, equipment count per lab.' },
  { key: 'infrastructure', icon: '🏫', title: 'Infrastructure Details', desc: 'Classrooms, library books, computers, total area, hostel capacity.' },
  { key: 'students',       icon: '👨‍🎓', title: 'Student Details',       desc: 'Enrollment data, UG/PG count, programs offered list.' },
  { key: 'financials',     icon: '💰', title: 'Financial Details',      desc: 'Annual budget, fee structure (UG/PG fees).' },
  { key: 'accreditation',  icon: '🎓', title: 'Accreditation Details',  desc: 'NAAC grade, NBA accredited programs, ISO 9001:2015 certification.' },
];

const SECTION_LABELS = {
  faculty: 'Faculty', labs: 'Labs', infrastructure: 'Infrastructure',
  students: 'Students', financials: 'Financials', accreditation: 'Accreditation'
};

const ALL_SECTIONS = ['faculty', 'labs', 'infrastructure', 'students', 'financials', 'accreditation'];
