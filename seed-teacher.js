/**
 * Seed Script: Creates a sample Teacher user with attendance, leaves, and permissions.
 *
 * Usage:
 *   node seed-teacher.js
 *
 * Prerequisites:
 *   - Backend running at http://localhost:3000/erp/api
 *   - An admin account already exists (default: admin@school.com / admin123)
 *
 * What it creates:
 *   - Teacher staff/user: teacher@school.com / teacher123 (designation: Teacher)
 *   - Attendance records for the current month (mix of PRESENT, ABSENT, LATE)
 *   - Leave applications: 2 approved, 1 pending, 1 rejected
 *   - Permission (short leave) requests: 2 approved, 1 pending
 */

const BASE_URL = "http://127.0.0.1:3000/erp/api";

// ─── Admin credentials (update if different) ────────────────────
const ADMIN_EMAIL = "admin@school.com";
const ADMIN_PASSWORD = "admin123";

// ─── Teacher to create ──────────────────────────────────────────
const TEACHER = {
  name: "Priya Sharma",
  email: "teacher@school.com",
  password: "teacher123",
  phone: "9876543210",
  designation: "Teacher",
  department: "Mathematics",
  qualification: "M.Sc., B.Ed.",
  joiningDate: "2024-06-01",
  salary: 35000,
  category: "TEACHING_REGULAR",
  paymentMode: "BANK_TRANSFER",
  bankName: "State Bank of India",
  bankAccountNo: "1234567890",
  bankIfsc: "SBIN0001234",
};

// ─── Helpers ────────────────────────────────────────────────────

async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data?.message || data || res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

function dateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getWorkingDaysThisMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();
  const days = [];
  for (let d = 1; d <= todayDate; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    if (dow !== 0) {
      days.push(dateStr(year, month + 1, d));
    }
  }
  return days;
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log("Logging in as admin...");
  let adminToken;
  try {
    const loginRes = await api("/auth/login", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    adminToken = loginRes.access_token;
    console.log("  Admin login successful");
  } catch (err) {
    console.error("  Admin login failed:", err.message);
    console.error("  Update ADMIN_EMAIL and ADMIN_PASSWORD in this script.");
    process.exit(1);
  }

  // ── 1. Create teacher staff member ────────────────────────────
  console.log("\nCreating teacher staff member...");
  let staffId;
  try {
    const nextId = await api("/staff/next-employee-id", { token: adminToken });
    const employeeId = nextId.employeeId || nextId;

    const staff = await api("/staff", {
      method: "POST",
      token: adminToken,
      body: { ...TEACHER, employeeId },
    });
    staffId = staff.id || staff.staffId || staff._id;
    console.log(`  Teacher created — staffId: ${staffId}, employeeId: ${employeeId}`);
  } catch (err) {
    if (err.message.includes("already exists") || err.message.includes("duplicate") || err.message.includes("409")) {
      console.log("  Teacher may already exist, trying to find...");
      try {
        const allStaff = await api("/staff", { token: adminToken });
        const list = allStaff.data || allStaff;
        const existing = (Array.isArray(list) ? list : []).find(
          (s) => s.email === TEACHER.email || s.user?.email === TEACHER.email
        );
        if (existing) {
          staffId = existing.id || existing._id;
          console.log(`  Found existing teacher — staffId: ${staffId}`);
        } else {
          throw new Error("Could not find existing teacher");
        }
      } catch (findErr) {
        console.error("  Failed:", findErr.message);
        process.exit(1);
      }
    } else {
      console.error("  Failed:", err.message);
      process.exit(1);
    }
  }

  // ── 2. Log in as the teacher ──────────────────────────────────
  console.log("\nLogging in as teacher...");
  let teacherToken;
  try {
    const tLogin = await api("/auth/login", {
      method: "POST",
      body: { email: TEACHER.email, password: TEACHER.password },
    });
    teacherToken = tLogin.access_token;
    const teacherUser = tLogin.user;
    // Use staffId from login if available, else keep the one from creation
    staffId = teacherUser?.staffId || staffId;
    console.log(`  Teacher login OK — role: ${teacherUser?.role}, staffId: ${staffId}`);
  } catch (err) {
    console.error("  Teacher login failed:", err.message);
    process.exit(1);
  }

  // ── 3. Seed attendance for this month (bulk-mark, one day at a time) ──
  console.log("\nSeeding attendance records...");
  const workDays = getWorkingDaysThisMonth();
  let attendanceSeeded = 0;
  for (const date of workDays) {
    const rand = Math.random();
    let status, checkIn, checkOut;
    if (rand < 0.80) { status = "PRESENT"; checkIn = "08:55"; checkOut = "16:30"; }
    else if (rand < 0.90) { status = "LATE"; checkIn = "09:45"; checkOut = "16:30"; }
    else { status = "ABSENT"; checkIn = null; checkOut = null; }

    try {
      await api("/hr/attendance/bulk-mark", {
        method: "POST",
        token: adminToken,
        body: {
          date,
          entries: [{ staffId, status, checkIn, checkOut }],
        },
      });
      attendanceSeeded++;
    } catch (err) {
      if (!err.message.includes("already") && !err.message.includes("duplicate") && !err.message.includes("409")) {
        // silent skip
      }
    }
  }
  console.log(`  ${attendanceSeeded}/${workDays.length} attendance records created`);

  // ── 4. Ensure leave types exist ───────────────────────────────
  console.log("\nChecking leave types...");
  let leaveTypes = [];
  try {
    const existing = await api("/hr/leave/types", { token: adminToken });
    leaveTypes = Array.isArray(existing) ? existing : existing.data || [];
    if (leaveTypes.length === 0) {
      console.log("  Creating default leave types...");
      for (const lt of [
        { name: "Casual Leave", code: "CL", maxPerYear: 12, carryForward: false },
        { name: "Sick Leave", code: "SL", maxPerYear: 10, carryForward: false },
        { name: "Earned Leave", code: "EL", maxPerYear: 15, carryForward: true },
      ]) {
        try {
          const created = await api("/hr/leave/types", { method: "POST", token: adminToken, body: lt });
          leaveTypes.push(created);
        } catch (err) {
          console.log(`  Leave type ${lt.name}: ${err.message}`);
        }
      }
    }
    console.log(`  ${leaveTypes.length} leave types available`);
  } catch (err) {
    console.log(`  Leave types: ${err.message}`);
  }

  // ── 5. Apply leaves as teacher ────────────────────────────────
  console.log("\nApplying leave requests...");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const leaveRequests = [
    { leaveTypeId: leaveTypes[0]?.id, fromDate: dateStr(year, month, 5), toDate: dateStr(year, month, 5), days: 1, reason: "Family function — need one day", staffId },
    { leaveTypeId: leaveTypes[1]?.id, fromDate: dateStr(year, month, 10), toDate: dateStr(year, month, 11), days: 2, reason: "Fever and cold — doctor advised rest", staffId },
    { leaveTypeId: leaveTypes[0]?.id, fromDate: dateStr(year, month > 1 ? month - 1 : 12, 20), toDate: dateStr(year, month > 1 ? month - 1 : 12, 20), days: 1, reason: "Personal work — bank visit", staffId },
    { leaveTypeId: leaveTypes[2]?.id, fromDate: dateStr(year, month, 25), toDate: dateStr(year, month, 27), days: 3, reason: "Vacation trip planned", staffId },
  ];

  const leaveIds = [];
  for (const leave of leaveRequests) {
    if (!leave.leaveTypeId) { console.log("  Skipping leave — no leave type ID"); continue; }
    try {
      const created = await api("/hr/leave/apply", { method: "POST", token: teacherToken, body: leave });
      leaveIds.push(created.id || created._id);
      console.log(`  Leave applied: ${leave.reason.slice(0, 40)}`);
    } catch (err) {
      console.log(`  Leave: ${err.message}`);
    }
  }

  // Approve/reject some leaves as admin
  if (leaveIds.length > 0) {
    for (let i = 0; i < Math.min(2, leaveIds.length); i++) {
      try { await api(`/hr/leave/applications/${leaveIds[i]}/approve`, { method: "PATCH", token: adminToken, body: { remarks: "Approved" } }); } catch {}
    }
    if (leaveIds.length > 2) {
      try { await api(`/hr/leave/applications/${leaveIds[2]}/reject`, { method: "PATCH", token: adminToken, body: { remarks: "Too many leaves this month" } }); } catch {}
    }
    console.log("  2 approved, 1 rejected, 1 pending");
  }

  // ── 6. Apply permissions (short leave) as teacher ─────────────
  console.log("\nApplying permission requests...");
  const permissionRequests = [
    { staffId, date: dateStr(year, month, 3), fromTime: "14:00", toTime: "16:00", hours: 2, reason: "Doctor appointment in the afternoon" },
    { staffId, date: dateStr(year, month, 8), fromTime: "09:00", toTime: "10:30", hours: 1.5, reason: "Child school admission interview" },
    { staffId, date: dateStr(year, month, 15), fromTime: "11:00", toTime: "12:00", hours: 1, reason: "Bank work — passbook update" },
  ];

  const permIds = [];
  for (const perm of permissionRequests) {
    try {
      const created = await api("/hr/permission/apply", { method: "POST", token: teacherToken, body: perm });
      permIds.push(created.id || created._id);
      console.log(`  Permission applied: ${perm.reason.slice(0, 40)}`);
    } catch (err) {
      console.log(`  Permission: ${err.message}`);
    }
  }

  if (permIds.length > 0) {
    for (let i = 0; i < Math.min(2, permIds.length); i++) {
      try { await api(`/hr/permission/${permIds[i]}/approve`, { method: "PATCH", token: adminToken, body: { remarks: "Approved" } }); } catch {}
    }
    console.log("  2 approved, 1 pending");
  }

  // ── Done ──────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("SEED COMPLETE!");
  console.log("=".repeat(60));
  console.log(`\n  Teacher Login Credentials:`);
  console.log(`    Email:    ${TEACHER.email}`);
  console.log(`    Password: ${TEACHER.password}`);
  console.log(`\n  What was seeded:`);
  console.log(`    Staff profile : ${TEACHER.name} (${TEACHER.designation})`);
  console.log(`    Attendance    : ${attendanceSeeded} records this month`);
  console.log(`    Leaves        : ${leaveIds.length} applications (2 approved, 1 rejected, 1 pending)`);
  console.log(`    Permissions   : ${permIds.length} requests (2 approved, 1 pending)`);
  console.log("");
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
