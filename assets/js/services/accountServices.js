import { supabase as sb } from '../config/app.js';
import { currencyFormat, getGenderDesc, getMaritalStatusDesc, getNumberIDFromString } from './dashboardServices.js';
import { getCurrentAccountFilterValues, refreshAccountsTable } from '../controllers/dashboard.js';
import { getGenderID, getMaritalStatusID, getProfileInfo } from './dashboardServices.js';
import { insertTransaction } from './transactionServices.js';
const profile = await getProfileInfo();
export function accountIDFormat(id) {
  const idStr = id.toString();
  const prefix = 'ACC' + (idStr.length < 12 ? '0'.repeat(12 - idStr.length) : '');
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
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("generateAccountID:", error.message);
    return null;
  }

  const lastID = data?.id ?? 0;
  const newID = lastID + 1;
  return accountIDFormat(newID);
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
async function openAccountViewModal(formattedID) {
  try {
    const account = await getAccountById(formattedID);

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
      acc_balance: document.getElementById("va-balance"),
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
async function openAccountEditModal(formattedID) {
  try {
    document.getElementById("account-edit-modal").classList.add("show");
    const accSaveBtn = document.getElementById("account-edit-save");

    const account = await getAccountById(formattedID);

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


    } else {
      console.error("Account data not found for ID:", formattedID);
    }

    accSaveBtn.onclick = async () => {
      const updatedData = {
        marital_status: await getMaritalStatusID(editFields.marital_status.value),
        email: editFields.email.value,
        contact_no: editFields.contact_no.value,
        home: editFields.home.value,
        city: editFields.city.value,
        postal_code: editFields.postal_code.value,
        updated_at: new Date().toISOString()
      };

      await updateAccount(account.id, updatedData);
      closeAccountEditModal();
      await refreshAccountsTable();
    };

  } catch (error) {
    console.error("openAccountEditModal:", error.message);
  }
}

window.closeAccountEditModal = () => {
  document.getElementById("account-edit-modal").classList.remove("show");
}

//Account Delete Modal
async function openAccountDeleteModal(formattedID) {
  try {
    document.getElementById("account-delete-modal").classList.add("show");
    const accDeleteBtn = document.getElementById("account-delete-confirm");



    accDeleteBtn.onclick = async () => {
      const account = await getAccountById(formattedID);
      if (!account) {
        console.error("Account data not found for ID:", formattedID);
        return;
      }
      await updateAccountIsActiveOff(formattedID);
      alert("Account deleted successfully!");

      const closingAccData = {
        acc_id: account.id,
        acc_fname: account.f_name,
        acc_lname: account.l_name,
        acc_name: `${account.f_name} ${account.l_name}`,
        transac_type: 2,
        date_time: new Date().toISOString(),
        amount: account.acc_balance,
        transac_with: "System",
        processed_by: profile.id ?? null,
      };

      const result = await insertTransaction(closingAccData);
      if (result) {
        alert("Account closed successfully!");
        await updateBalanceWithdraw(account.id, closingAccData.amount);
        closeAccountDeleteModal();
        await refreshAccountsTable();
      }
    }
  } catch (error) {
    console.error("openAccountDeleteModal:", error.message);
  }
}

window.closeAccountDeleteModal = () => {
  document.getElementById("account-delete-modal").classList.remove("show");
}


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
      acc_id: newAccount.id,
      acc_fname: newAccount.f_name,
      acc_lname: newAccount.l_name,
      acc_name: `${newAccount.f_name} ${newAccount.l_name}`,
      transac_with: "System",
      transac_type: 1,
      date_time: newAccount.created_at,
      amount: parseFloat(newAccount.acc_balance),
      processed_by: profile.id ?? null,
    };
    await insertTransaction(transactionData);
  }

  return data[0];
}

export async function getAccountById(accountID) {
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

async function updateAccountIsActiveOff(accountID) {
  const accID = typeof accountID === "number" ? accountID : getAccNumberIDFromString(accountID);
  if (accID == null) {
    console.error("Invalid account ID format:", accountID);
    return null;
  }
  const { data, error } = await sb
    .from("accounts")
    .update({ is_active: false })
    .eq("id", accID)
    .select();

  if (error) {
    console.error("updateAccountIsActiveOff:", error.message);
    return null;
  }
  return data;
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
    .eq("id", accID)
    .select();

  if (error) {
    console.error("updateAccount:", error.message);
    return null;
  }

  return data;
}

export async function updateBalanceDeposit(accountID, amount) {
  const accID =
    typeof accountID === "number"
      ? accountID
      : getAccNumberIDFromString(accountID);

  const depositAmount = Number(amount);

  if (accID == null) {
    console.error("Invalid account ID format:", accountID);
    return null;
  }

  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    console.error("Invalid deposit amount:", amount);
    return null;
  }

  const { data: account, error: getError } = await sb
    .from("accounts")
    .select("acc_balance")
    .eq("id", accID)
    .single();

  if (getError) {
    console.error("Could not get account balance:", getError.message);
    return null;
  }

  const newBalance = Number(account.acc_balance ?? 0) + depositAmount;

  const { data, error: updateError } = await sb
    .from("accounts")
    .update({
      acc_balance: newBalance
    })
    .eq("id", accID)
    .select()
    .single();

  if (updateError) {
    console.error("updateBalanceDeposit:", updateError.message);
    return null;
  }

  return data;
}

export async function updateBalanceWithdraw(accountID, amount) {
  const accID =
    typeof accountID === "number"
      ? accountID
      : getAccNumberIDFromString(accountID);

  const withdrawAmount = Number(amount);

  if (accID == null) {
    console.error("Invalid account ID format:", accountID);
    return null;
  }

  if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
    console.error("Invalid withdraw amount:", amount);
    return null;
  }

  const { data: account, error: getError } = await sb
    .from("accounts")
    .select("acc_balance")
    .eq("id", accID)
    .single();

  if (getError) {
    console.error("Could not get account balance:", getError.message);
    return null;
  }

  const newBalance = Number(account.acc_balance ?? 0) - withdrawAmount;
  if (newBalance < 0) {
    console.error("Insufficient funds for withdrawal. Current balance:", account.acc_balance);
    return null;
  }
  const { data, error: updateError } = await sb
    .from("accounts")
    .update({
      acc_balance: newBalance
    })
    .eq("id", accID)
    .select()
    .single();

  if (updateError) {
    console.error("updateBalanceDeposit:", updateError.message);
    return null;
  }

  return data;
}

export async function updateBalanceTransfer(senderAccountID, receiverAccountID, amount) {
  const senderID =
    typeof senderAccountID === "number"
      ? senderAccountID
      : getAccNumberIDFromString(senderAccountID);

  const receiverID =
    typeof receiverAccountID === "number"
      ? receiverAccountID
      : getAccNumberIDFromString(receiverAccountID);

  const transferAmount = Number(amount);

  if (senderID == null || receiverID == null) {
    console.error("Invalid account ID format:", senderAccountID, receiverAccountID);
    return null;
  }

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    console.error("Invalid transfer amount:", amount);
    return null;
  }

  // Update sender's balance
  const { data: senderAccount, error: getSenderError } = await sb
    .from("accounts")
    .select("acc_balance")
    .eq("id", senderID)
    .single();

  if (getSenderError) {
    console.error("Could not get sender account balance:", getSenderError.message);
    return null;
  }

  const newSenderBalance = Number(senderAccount.acc_balance ?? 0) - transferAmount;
  if (newSenderBalance < 0) {
    console.error("Insufficient funds for transfer. Current balance:", senderAccount.acc_balance);
    return null;
  }

  const { data: updatedSender, error: updateSenderError } = await sb
    .from("accounts")
    .update({
      acc_balance: newSenderBalance
    })
    .eq("id", senderID)
    .select()
    .single();

  if (updateSenderError) {
    console.error("updateBalanceTransfer (sender):", updateSenderError.message);
    return null;
  }

  // Update receiver's balance
  const { data: receiverAccount, error: getReceiverError } = await sb
    .from("accounts")
    .select("acc_balance")
    .eq("id", receiverID)
    .single();

  if (getReceiverError) {
    console.error("Could not get receiver account balance:", getReceiverError.message);
    return null;
  }

  const newReceiverBalance = Number(receiverAccount.acc_balance ?? 0) + transferAmount;

  const { data: updatedReceiver, error: updateReceiverError } = await sb
    .from("accounts")
    .update({
      acc_balance: newReceiverBalance
    })
    .eq("id", receiverID)
    .select()
    .single();

  if (updateReceiverError) {
    console.error("updateBalanceTransfer (receiver):", updateReceiverError.message);
    return null;
  }

  return { updatedSender, updatedReceiver };
}