import { supabase as sb } from '../config/app.js';
import { getNumberIDFromString } from './dashboardServices.js';
function accountIDFormat(id) {
  const idStr = id.toString();
  const prefix = 'ACC' + (idStr.length < 6 ? '0'.repeat(6 - idStr.length) : '');
  return prefix + idStr;
}

export async function getAccountType(typeId) {
  const { data, error } = await sb
    .from("account_type")
    .select("acctype_desc")
    .eq("id", typeId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getAccountType:", error.message);
    return null;
  }
  return data?.acctype_desc ?? null;
};

//View Account

//get account details by ID
export function getAccNumberIDFromString(str) {
  const s = String(str ?? "").trim().toUpperCase();

  // must be ACC + digits only, e.g. ACC000001
  if (!/^ACC\d+$/.test(s)) return null;

  const n = Number.parseInt(s.slice(3), 10);
  return Number.isNaN(n) ? null : n;
}

export async function getAccountsTable() {
  const tbody = document.getElementById("account-table-body");
  if (!tbody) return;

  const { data, error } = await sb
    .from("accounts")
    .select("id, f_name, l_name, email, contact_no, acc_type, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllAccountsTable:", error.message);
    return;
  }

  tbody.innerHTML = "";

  for (const acc of (data ?? [])) {
    const accType = await getAccountType(acc.acc_type);

    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${accountIDFormat(acc.id) ?? ""}</td>
          <td>${acc.f_name ?? ""} ${acc.l_name ?? ""}</td>
          <td>${acc.email ?? ""}</td>
          <td>${acc.contact_no ?? ""}</td>
          <td>${accType ?? ""}</td>
          <td>${acc.created_at ? new Date(acc.created_at).toLocaleString() : ""}</td>
          <td>
            <button class="view-btn">View</button>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </td>
        `;
    tbody.appendChild(tr);
  }
}

export async function accountsFilter(acc, type) {
  const tbody = document.getElementById("account-table-body");
  if (!tbody) return;

  const keyword = (acc ?? "").trim();
  const typeNum = await getAccountTypeId(type);

  let query = sb
    .from("accounts_with_full_name")
    .select("id, f_name, l_name, email, contact_no, acc_type, created_at")
    .order("created_at", { ascending: false });

  // type filter (0 = all)
  if (typeNum !== 0) {
    query = query.eq("acc_type", typeNum);
  }

  // search filter
  if (keyword) {
    const accID = getAccNumberIDFromString(keyword); // e.g. "ACC000123" -> 123

    if (accID != null) {
      // numeric ID search
      query = query.or(
        `id.eq.${accID}`
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
    console.error("accountsFilter:", error.message);
    return;
  }

  // render rows
  tbody.innerHTML = "";
  for (const accRow of data ?? []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${accountIDFormat(accRow.id)}</td>
      <td>${accRow.f_name ?? ""} ${accRow.l_name ?? ""}</td>
      <td>${accRow.email ?? ""}</td>
      <td>${accRow.contact_no ?? ""}</td>
      <td>${await getAccountType(accRow.acc_type) ?? ""}</td>
      <td>${accRow.created_at ? new Date(accRow.created_at).toLocaleString() : ""}</td>
      <td>
        <button class="view-btn">View</button>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

//Add Account
export async function generateAccountID() {
  const { data, error } = await sb
    .from("accounts")
    .select("id")
    .order("id", { descending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("generateAccountID:", error.message);
    return null;
  }

  const lastID = data?.id ?? 0;
  return `ACC${(lastID + 1).toString().padStart(6, "0")}`;
}

export async function getAccountTypeId(typeName) {
  const { data, error } = await sb
    .from("account_type")
    .select("id")
    .ilike("acctype_desc", typeName)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getAccountTypeId:", error.message);
    return 0;
  }

  return data?.id ?? 0;
}

export async function getPresentedIDTypeID(ID_desc) {
  const { data, error } = await sb
    .from("presented_id")
    .select("id")
    .ilike("id_desc", ID_desc)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getPresentedIDTypeID:", error.message);
    return null;
  }

  return data?.id ?? null;
}

import { getGenderID, getMaritalStatusID, getProfileEmailAndName } from './dashboardServices.js';
import { insertTransaction } from './transactionServices.js';

export async function createAccount(accountData) {
  const { data, error } = await sb
    .from("accounts")
    .insert([accountData])
    .select();

  if (error) {
    console.error("createAccount:", error.message);
    return null;
  }
  if (data && data.length > 0) {
    const newAccount = data[0];
    // Insert initial transaction for the new account

    const transactionData = {
      ref_id: await generateRefID(),
      acc_id: newAccount.id,
      transac_with: "System",
      transac_type: 1,
      date_time: newAccount.created_at,
      amount: newAccount.initial_deposit,
      processed_by: await getProfileEmailAndName().then(info => info.name),
    };
    await insertTransaction(transactionData);
  }

  return data[0];
}