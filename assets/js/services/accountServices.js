import { supabase as sb } from '../config/app.js';
import { currencyFormat, getGenderDesc, getMaritalStatusDesc, getNumberIDFromString } from './dashboardServices.js';
import { getCurrentAccountFilterValues } from '../controllers/dashboard.js';

function accountIDFormat(id) {
  const idStr = id.toString();
  const prefix = 'ACC' + (idStr.length < 6 ? '0'.repeat(6 - idStr.length) : '');
  return prefix + idStr;
}

export async function getAccountTypeDesc(typeId) {
  const { data, error } = await sb
    .from("account_type")
    .select("acctype_desc")
    .eq("id", typeId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getAccountTypeDesc:", error.message);
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

// export async function getAccountsTable() {
//   const tbody = document.getElementById("account-table-body");
//   if (!tbody) return;

//   const { data, error } = await sb
//     .from("accounts")
//     .select("id, f_name, l_name, email, contact_no, acc_type, created_at")
//     .order("created_at", { ascending: false });

//   if (error) {
//     console.error("getAllAccountsTable:", error.message);
//     return;
//   }

//   tbody.innerHTML = "";

//   for (const acc of (data ?? [])) {
//     const accType = await getAccountType(acc.acc_type);

//     const tr = document.createElement("tr");
//     tr.innerHTML = `
//           <td>${accountIDFormat(acc.id) ?? ""}</td>
//           <td>${acc.f_name ?? ""} ${acc.l_name ?? ""}</td>
//           <td>${acc.email ?? ""}</td>
//           <td>${acc.contact_no ?? ""}</td>
//           <td>${accType ?? ""}</td>
//           <td>${acc.created_at ? new Date(acc.created_at).toLocaleString() : ""}</td>
//           <td>
//             <button class="view-btn" id="view-btn-${acc.id}">View</button>
//             <button class="edit-btn" id="edit-btn-${acc.id}">Edit</button>
//             <button class="delete-btn" id="delete-btn-${acc.id}">Delete</button>
//           </td>
//         `;
//     tbody.appendChild(tr);
//   }
// }
const accPageNumber = document.getElementById("acc-page-numbers");
let currentAccPage = 1;
const ACC_PAGE_SIZE = 10;

export async function accountsFilter(acc, type, page = 1) {
  currentAccPage = page; // Update tracker
  accPageNumber.textContent = currentAccPage;
  const tbody = document.getElementById("account-table-body");
  if (!tbody) return;

  const keyword = (acc ?? "").trim();
  const typeNum = await getAccountTypeId(type);

  // 1. Calculate Supabase range indices
  const from = (page - 1) * ACC_PAGE_SIZE;
  const to = from + ACC_PAGE_SIZE - 1;

  // 2. Add { count: "exact" } to retrieve the grand total for pagination math
  let query = sb
    .from("accounts_with_full_name")
    .select("id, f_name, l_name, email, contact_no, acc_type, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .eq("is_active", true); // Only active accounts

  // type filter (0 = all)
  if (typeNum !== 0) {
    query = query.eq("acc_type", typeNum);
  }

  // search filter
  if (keyword) {
    const accID = getAccNumberIDFromString(keyword);

    if (accID != null) {
      // numeric ID search
      query = query.or(`id.eq.${accID}`);
    } else {
      // text search only
      query = query.or(`full_name.ilike.%${keyword}%`);
    }
  }

  // 3. Apply the pagination range limitation to the query
  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("accountsFilter:", error.message);
    return;
  }

  // render rows
  tbody.innerHTML = "";
  for (const accRow of data ?? []) {
    const formattedID = accountIDFormat(accRow.id);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formattedID}</td>
      <td>${accRow.f_name ?? ""} ${accRow.l_name ?? ""}</td>
      <td>${accRow.email ?? ""}</td>
      <td>${accRow.contact_no ?? ""}</td>
      <td>${await getAccountTypeDesc(accRow.acc_type) ?? ""}</td>
      <td>${accRow.created_at ? new Date(accRow.created_at).toLocaleString() : ""}</td>
      <td>
        <button class="view-btn" data-id="${formattedID}">View</button>
        <button class="edit-btn" data-id="${formattedID}">Edit</button>
        <button class="delete-btn" data-id="${formattedID}">Delete</button>
      </td>
    `;
    tr.querySelector(`.view-btn`).addEventListener("click", () => openAccountViewModal(formattedID));
    tr.querySelector(`.edit-btn`).addEventListener("click", () => openAccountEditModal(formattedID));
    tr.querySelector(`.delete-btn`).addEventListener("click", () => openAccountDeleteModal(formattedID));

    tbody.appendChild(tr);
  }
  // 4. Call helper function to draw/update your account pagination controls
  renderAccountPaginationControls(count, acc, type);
}

// 5. Helper function to render the Account Prev / Page Indicator / Next UI
function renderAccountPaginationControls(totalCount, currentAcc, currentType) {
  // Look for an existing accounts controls container or create one right below the account table
  let controlsContainer = document.getElementById("acc-pagination-controls");
  if (!controlsContainer) {
    controlsContainer = document.createElement("div");
    controlsContainer.id = "acc-pagination-controls";
    document.getElementById("account-table-body").closest("table").after(controlsContainer);
  }

  const totalPages = Math.ceil(totalCount / ACC_PAGE_SIZE) || 1;

  controlsContainer.innerHTML = `
    <button id="acc-btn-prev" ${currentAccPage === 1 ? "disabled" : ""}><i class="fas fa-chevron-left"></i></button>
    <span id="acc-page-numbers">${currentAccPage} of ${totalPages}</span>
    <button id="acc-btn-next" ${currentAccPage === totalPages ? "disabled" : ""}><i class="fas fa-chevron-right"></i></button>
  `;

  // Attach event listeners to rerun the accounts filter on click
  document.getElementById("acc-btn-prev").addEventListener("click", () => {
    if (currentAccPage > 1) accountsFilter(currentAcc, currentType, currentAccPage - 1);
  });

  document.getElementById("acc-btn-next").addEventListener("click", () => {
    if (currentAccPage < totalPages) accountsFilter(currentAcc, currentType, currentAccPage + 1);
  });
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

//Account View Modal
async function openAccountViewModal (formattedID) {
  try {
    console.log("openAccountViewModal called with accountID:", formattedID);
    const account = await getAccountById(formattedID);
    console.log("Viewing Account:", account);

    const viewFields = {
      id: document.getElementById("va-id"),
      f_name: document.getElementById("va-fname"),
      l_name: document.getElementById("va-lname"),
      date_birth: document.getElementById("va-birth"),
      gender: document.getElementById("va-gender"),
      presented_id: document.getElementById("va-presented-id"),
      id_no: document.getElementById("va-id-no"),
      marital_status: document.getElementById("va-marital"),
      email: document.getElementById("va-email"),
      contact_no: document.getElementById("va-contact"),
      address: document.getElementById("va-home"),
      city: document.getElementById("va-city"),
      postal_code: document.getElementById("va-postal"),
      acc_title: document.getElementById("va-title"),
      acc_type: document.getElementById("va-type"),
      balance: document.getElementById("va-balance"),
      date_created: document.getElementById("va-date-created"),
      date_updated: document.getElementById("va-date-updated"),
    };

    if (account) {
      viewFields.id.textContent = accountIDFormat(account.id);
      viewFields.f_name.textContent = account.f_name ?? "";
      viewFields.l_name.textContent = account.l_name ?? "";
      viewFields.date_birth.textContent = account.date_birth ? new Date(account.date_birth).toLocaleDateString() : "";
      viewFields.gender.textContent = await getGenderDesc(account.gender) ?? "";
      viewFields.presented_id.textContent = await getPresentedIDTypeDesc(account.presented_id) ?? "";
      viewFields.id_no.textContent = account.id_no ?? "";
      viewFields.marital_status.textContent = await getMaritalStatusDesc(account.marital_status) ?? "";
      viewFields.email.textContent = account.email ?? "";
      viewFields.contact_no.textContent = account.contact_no ?? "";
      viewFields.address.textContent = account.home ?? "";
      viewFields.city.textContent = account.city ?? "";
      viewFields.postal_code.textContent = account.postal_code ?? "";
      viewFields.acc_title.textContent = account.acc_title ?? "";
      viewFields.acc_type.textContent = await getAccountTypeDesc(account.acc_type) ?? "";
      viewFields.acc_balance.textContent = account.acc_balance ? currencyFormat(account.acc_balance) : currencyFormat(0);
      viewFields.date_created.textContent = account.created_at ? new Date(account.created_at).toLocaleDateString() : "";
      viewFields.date_updated.textContent = account.updated_at ? new Date(account.updated_at).toLocaleDateString() : "";

      document.getElementById("account-view-modal").classList.add("show");
    } else {
      console.error("Account data not found for ID:", formattedID);
    }
  } catch (error) {
    console.error("openAccountViewModal:", error.message);
  }
}
window.closeAccountViewModal = () => {
  document.getElementById("account-view-modal").classList.remove("show");
}

//Account Edit Modal
async function openAccountEditModal (formattedID) {
  try {
    console.log("openAccountEditModal called with accountID:", formattedID);
    const account = await getAccountById(formattedID);
    console.log("Editing Account:", account);

    const editFields = {
      id: document.getElementById("vad-id"),
      f_name: document.getElementById("vad-fname"),
      l_name: document.getElementById("vad-lname"),
      date_birth: document.getElementById("vad-birth"),
      gender: document.getElementById("vad-gender"),
      presented_id: document.getElementById("vad-presented-id"),
      id_no: document.getElementById("vad-id-no"),
      marital_status: document.getElementById("vad-marital"),
      email: document.getElementById("vad-email"),
      contact_no: document.getElementById("vad-contact"),
      home: document.getElementById("vad-home"),
      city: document.getElementById("vad-city"),
      postal_code: document.getElementById("vad-postal"),
      acc_title: document.getElementById("vad-title"),
      acc_type: document.getElementById("vad-type"),
    };

    if (account) {
      editFields.id.value = accountIDFormat(account.id);
      editFields.f_name.value = account.f_name ?? "";
      editFields.l_name.value = account.l_name ?? "";
      editFields.date_birth.value = account.date_birth ? new Date(account.date_birth).toLocaleDateString() : "";
      editFields.gender.value = await getGenderDesc(account.gender) ?? "";
      editFields.presented_id.value = await getPresentedIDTypeDesc(account.presented_id) ?? "";
      editFields.id_no.value = account.id_no ?? "";
      editFields.marital_status.value = await getMaritalStatusDesc(account.marital_status) ?? "";
      editFields.email.value = account.email ?? "";
      editFields.contact_no.value = account.contact_no ?? "";
      editFields.home.value = account.home ?? "";
      editFields.city.value = account.city ?? "";
      editFields.postal_code.value = account.postal_code ?? "";
      editFields.acc_title.value = account.acc_title ?? "";
      editFields.acc_type.value = await getAccountTypeDesc(account.acc_type) ?? "";

      document.getElementById("account-edit-modal").classList.add("show");
    }else {
      console.error("Account data not found for ID:", formattedID);
    }
  } catch (error) {
    console.error("openAccountEditModal:", error.message);
  }
}

window.closeAccountEditModal = () => {
  document.getElementById("account-edit-modal").classList.remove("show");
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

async function getAccountById(accountID) {
  const accID = getAccNumberIDFromString(accountID);
  if (accID == null) {
    console.error("Invalid account ID format:", accountID);
    return null;
  }
  const { data, error } = await sb
    .from("accounts")
    .select("*")
    .eq("id", accID)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getAccountById:", error.message);
    return null;
  }
  return data ?? null;
}

async function getPresentedIDTypeDesc(presentedIDTypeID) {
  const { data, error } = await sb
    .from("presented_id")
    .select("id_desc")
    .eq("id", presentedIDTypeID)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getPresentedIDTypeDesc:", error.message);
    return null;
  }
  return data?.id_desc ?? null;
}


async function updateAccount(accountID, updatedData) {
  const accID = typeof accountID === "number" ? accountID : getAccNumberIDFromString(accountID);
  if (accID == null) {
    console.error("Invalid account ID format:", accountID);
    return null;
  }

  const { data, error } = await sb
    .from("accounts")
    .update(updatedData)
    .eq("id", accID);

  if (error) {
    console.error("updateAccount:", error.message);
    return null;
  }
  return data;
}