import { supabase as sb } from '../config/app.js';

function currencyFormat(amount) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function employeeIDFormat(id) {
  const idStr = id.toString();
  const prefix = 'EMP' + (idStr.length < 6 ? '0'.repeat(6 - idStr.length) : '');
  return prefix + idStr;
}
//Sidebar

export async function getProfileEmailAndName() {
  const { data: authData, error: authError } = await sb.auth.getUser();

  if (authError) {
    console.error("getProfileEmailAndName auth:", authError.message);
    return null;
  }

  const email = authData?.user?.email ?? null;
  if (!email) {
    console.error("getProfileEmailAndName: no logged-in user email");
    return null;
  }

  const { data: row, error: fullNameError } = await sb
    .from("employees_with_full_name")
    .select("full_name")
    .eq("email", email)
    .maybeSingle();

  if (fullNameError) {
    console.error("getProfileEmailAndName query:", fullNameError.message);
    return null;
  }

  return {
    name: row?.full_name ?? "",
    email
  };
}


//Dashboard
export async function loadDashboardStats() {
  const { count: adminsCount, error: adminsErr } = await sb
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("employee_type", 2);

  const { count: employeesCount, error: employeesErr } = await sb
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("employee_type", 1);

  const { count: savingsCount, error: savingsErr } = await sb
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("acc_type", 1);

  const { count: currentCount, error: currentErr } = await sb
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("acc_type", 2);

  const { data: totalBalance, error: totalBalanceErr } = await sb.rpc('get_total_balance');

  const { data: totalDeposit, error: totalDepositErr } = await sb.rpc('get_total_deposit');

  const { data: totalWithdraw, error: totalWithdrawErr } = await sb.rpc('get_total_withdraw');

  const { data: totalBankTransactions, error: totalBankTransactionsErr } = await sb.rpc('get_total_transactions');


  if (totalBalanceErr) console.error("totalBalanceErr:", totalBalanceErr.message);
  if (totalDepositErr) console.error("totalDepositErr:", totalDepositErr.message);
  if (totalWithdrawErr) console.error("totalWithdrawErr:", totalWithdrawErr.message);
  if (totalBankTransactionsErr) console.error("totalBankTransactionsErr:", totalBankTransactionsErr.message);
  if (adminsErr) console.error("adminsErr:", adminsErr.message);
  if (employeesErr) console.error("employeesErr:", employeesErr.message);
  if (savingsErr) console.error("savingsErr:", savingsErr.message);
  if (currentErr) console.error("currentErr:", currentErr.message);

  return {
    totalAdmins: adminsCount,
    totalEmployees: employeesCount,
    totalSavings: savingsCount,
    totalCurrent: currentCount,
    totalBankBalance: currencyFormat(totalBalance),
    totalBankDeposit: currencyFormat(totalDeposit),
    totalBankWithdraw: currencyFormat(totalWithdraw),
    totalBankTransactions: currencyFormat(totalBankTransactions)
  };
}

async function loadLatestEmployees() {
  const tbody = document.getElementById("dashboard-table-body");
  if (!tbody) return;

  const { data, error } = await sb
    .from("employees")
    .select("id, first_name, last_name, email, employee_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("loadLatestEmployees:", error.message);
    return;
  }

  tbody.innerHTML = "";

  for (const emp of (data ?? [])) {
    const empType = await getEmployeeType(emp.employee_type);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${employeeIDFormat(emp.id) ?? ""}</td>
      <td>${emp.first_name ?? ""} ${emp.last_name ?? ""}</td>
      <td>${emp.email ?? ""}</td>
      <td>${empType}</td>
      <td>${emp.created_at ? new Date(emp.created_at).toLocaleString() : ""}</td>
    `;
    tbody.appendChild(tr);
  }
}

export async function getEmployeeType(type_id) {
  if (type_id == null) return "";

  const { data, error } = await sb
    .from("employee_type")
    .select("emp_desc")
    .eq("id", type_id)
    .single();

  if (error) {
    console.error("getEmployeeType:", error.message);
    return "";
  }

  return data?.emp_desc ?? "";
}

//call once loaded
export async function initDashboardData() {
  await loadDashboardStats();
  await loadLatestEmployees();
};

//View Employee
//ID For Search

export function getNumberIDFromString(str) {
  const s = String(str ?? "").trim().toUpperCase();

  // must be EMP + digits only, e.g. EMP000001
  if (!/^EMP\d+$/.test(s)) return null;

  const n = Number.parseInt(s.slice(3), 10);
  return Number.isNaN(n) ? null : n;
}

//Employee Description to Id
export async function getEmployeeTypeId(emp_desc) {
  const { data, error } = await sb
    .from("employee_type")
    .select("id")
    .eq("emp_desc", emp_desc)
    .maybeSingle();

  if (error) {
    console.error("getEmployeeTypeId:", error.message);
    return null;
  }

  return data?.id ?? 0;
}

export async function getEmployeesTable() {
  const tbody = document.getElementById("employee-table-body");
  if (!tbody) return;

  const { data, error } = await sb
    .from("employees")
    .select("id, first_name, last_name, email, contact_no, created_at")
    .order("created_at", { ascending: false })
    .eq("is_active", true);

  if (error) {
    console.error("getEmployeesTable:", error.message);
    return;
  }

  tbody.innerHTML = "";

  for (const emp of (data ?? [])) {
    const empType = await getEmployeeType(emp.employee_type);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${employeeIDFormat(emp.id) ?? ""}</td>
      <td>${emp.first_name ?? ""} ${emp.last_name ?? ""}</td>
      <td>${emp.email ?? ""}</td>
      <td>${emp.contact_no ?? ""}</td>
      <td>${emp.created_at ? new Date(emp.created_at).toLocaleString() : ""}</td>
      <td>
        <button class="view-btn" onClick="openViewModal('${employeeIDFormat(emp.id)}')">View</button>
        <button class="edit-btn" onClick="openEditModal('${employeeIDFormat(emp.id)}')">Edit</button>
        <button class="delete-btn" onClick="openDeleteModal('${employeeIDFormat(emp.id)}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

export async function employeeFilter(emp, type) {
  const tbody = document.getElementById("employee-table-body");
  if (!tbody) return;

  const keyword = (emp ?? "").trim();
  const typeNum = await getEmployeeTypeId(type);

  let query = sb
    .from("employees_with_full_name")
    .select("id, first_name, last_name, email, contact_no, employee_type, created_at, full_name")
    .order("created_at", { ascending: false })
    .eq("is_active", true);

  // type filter (0 = all)
  if (typeNum !== 0) {
    query = query.eq("employee_type", typeNum);
  }

  // search filter
  if (keyword) {
    const employeeID = getNumberIDFromString(keyword); // e.g. "EMP000123" -> 123

    if (employeeID != null) {
      // numeric ID search
      query = query.or(
        `id.eq.${employeeID}`
      );
    } else {
      // text search only
      query = query.or(
        `full_name.ilike.%${keyword}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("employeeFilter:", error.message);
    return;
  }

  // render rows
  tbody.innerHTML = "";
  for (const empRow of data ?? []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${employeeIDFormat(empRow.id)}</td>
      <td>${empRow.first_name ?? ""} ${empRow.last_name ?? ""}</td>
      <td>${empRow.email ?? ""}</td>
      <td>${empRow.contact_no ?? ""}</td>
      <td>${empRow.created_at ? new Date(empRow.created_at).toLocaleString() : ""}</td>
      <td>
        <button class="view-btn" onClick="openViewModal('${employeeIDFormat(empRow.id)}')">View</button>
        <button class="edit-btn" onClick="openEditModal('${employeeIDFormat(empRow.id)}')">Edit</button>
        <button class="delete-btn" onClick="openDeleteModal('${employeeIDFormat(empRow.id)}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

//Add Employee 
export async function generateEmployeeID() {
  const { data, error } = await sb
    .from("employees")
    .select("id")
    .order("id", { descending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("generateEmployeeID:", error.message);
    return null;
  }

  const lastID = data?.id ?? 0;
  const newID = lastID + 1;
  return employeeIDFormat(newID);
}

export async function createEmployee(payload) {
  const { data, error } = await sb.functions.invoke("create-employee", {
    body: payload
  });

  if (error) {
    console.error("create-employee error:", error.message);
    return null;
  }

  return data;
}

export async function getGenderID(gender_desc) {
  const { data, error } = await sb
    .from("genders")
    .select("id")
    .ilike("gender_desc", gender_desc)
    .single();

  if (error) {
    console.error("getGenderID:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function getMaritalStatusID(status_desc) {
  const { data, error } = await sb
    .from("marital_status")
    .select("id")
    .ilike("marital_desc", status_desc)
    .single();

  if (error) {
    console.error("getMaritalStatusID:", error.message);
    return null;
  }

  return data?.id ?? null;
}

export async function getGenderDesc(gender_id) {
  const { data, error } = await sb
    .from("genders")
    .select("gender_desc")
    .eq("id", gender_id)
    .maybeSingle();

  if (error) {
    console.error("getGenderDesc:", error.message);
    return null;
  }

  return data?.gender_desc ?? null;
}

export async function getMaritalStatusDesc(status_id) {
  const { data, error } = await sb
    .from("marital_status")
    .select("marital_desc")
    .eq("id", status_id)
    .maybeSingle();

  if (error) {
    console.error("getMaritalStatusDesc:", error.message);
    return null;
  }

  return data?.marital_desc ?? null;
}


//Status Off

export async function updateEmployeeStatusOff(employeeID) {
  const numericID = getNumberIDFromString(employeeID);
  if (numericID == null) {
    console.error("updateEmployeeStatusOff: invalid employeeID format");
    return null;
  }
  const { data, error } = await sb
    .from("employees")
    .update({ is_active: false }, {updated_at: new Date().toISOString()})
    .eq("id", numericID);

  if (error) {
    console.error("updateEmployeeStatusOff:", error.message);
    return null;
  }

  return data;
}

//Get Employee By ID
export async function getEmployeeByID(employeeID) {
  const numericID = getNumberIDFromString(employeeID);
  if (numericID == null) {
    console.error("getEmployeeByID: invalid employeeID format");
    return null;
  }
  const { data, error } = await sb
    .from("employees")
    .select("*")
    .eq("id", numericID)
    .single();

  if (error) {
    console.error("getEmployeeByID:", error.message);
    return null;
  }

  return data;
}
