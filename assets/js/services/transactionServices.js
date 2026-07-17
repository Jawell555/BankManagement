import { supabase as sb } from '../config/app.js';
import { accountIDFormat, getAccNumberIDFromString } from './accountServices.js';
import { currencyFormat, employeeIDFormat, getEmployeeNameById } from './dashboardServices.js';

export function stringToAmount(str) {
  const cleanAmountString = str.replace(/[₱,\s]/g, "");
  const amount = parseFloat(cleanAmountString);
  return Number.isNaN(amount) ? 0 : amount;
}

export async function generateRefID() {
  const { data, error } = await sb
    .from("bank_transaction")
    .select("ref_id")
    .order("ref_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("generateRefID:", error.message);
    return null;
  }

  const lastRefID = data?.ref_id ?? 0;
  const newRefID = lastRefID + 1;
  return formatRefID(newRefID);
}

function formatRefID(refID) {
  const refIDStr = refID.toString().padStart(12, '0');
  const prefix = 'REF' + (refIDStr.length < 12 ? '0'.repeat(12 - refIDStr.length) : '');
  return prefix + refIDStr;
}
const transacPagenumber = document.getElementById("transaction-page-numbers");
let currentTransactionPage = 1;
const TRANSACTION_PAGE_SIZE = 20;

export async function getFilteredTransactions(
  acc,
  type,
  startDate,
  endDate,
  page = 1
) {
  const tbody = document.getElementById("transaction-table-body");

  if (!tbody) {
    console.error("Transaction table body was not found.");
    return { data: [], count: 0 };
  }

  const keyword = (acc ?? "").trim();

  let transactionTypeIds = [];


  if (type === "deposit") {
    transactionTypeIds = [3, 4]; // cash deposit, check deposit
  } else if (type === "withdrawal") {
    transactionTypeIds = [5, 6]; // cash withdrawal, check withdrawal
  } else if (type === "transfer") {
    transactionTypeIds = [7, 8]; // internal transfer, external transfer
  } else if (type !== "all") {
    transactionTypeIds = [await getTransactionTypeId(type)];
  }


  const from = (page - 1) * TRANSACTION_PAGE_SIZE;
  const to = from + TRANSACTION_PAGE_SIZE - 1;

  let query = sb
    .from("bank_transaction")
    .select("*", { count: "exact" })
    .order("date_time", { ascending: false });

  if (transactionTypeIds.length > 0) {
    query = query.in("transac_type", transactionTypeIds);
  }

  // Account number or account-name filter
  if (keyword) {
    const accID = getAccNumberIDFromString(keyword);

    if (accID != null) {
      query = query.eq("acc_id", accID);
    } else {
      query = query.ilike("acc_name", `%${keyword}%`);
    }

  }

  // Date range
  if (startDate) {
    query = query.gte("date_time", `${startDate}T00:00:00`);
    
  }

  if (endDate) {
    const nextDay = new Date(`${endDate}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);

    query = query.lt("date_time", nextDay.toISOString());
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("getFilteredTransactions:", error.message);
    tbody.innerHTML = `
      <tr>
        <td colspan="8">Unable to load transactions.</td>
      </tr>
    `;
    return { data: [], count: 0 };
  }

  tbody.innerHTML = "";

  for (const transaction of data ?? []) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${formatRefID(transaction.ref_id) ?? ""}</td>
      <td>${accountIDFormat(transaction.acc_id)}</td>
      <td>${transaction.acc_name ?? ""}</td>
      <td>${await getTransactionTypeDesc(transaction.transac_type) ?? ""}</td>
      <td>${transaction.transac_with ?? ""}</td>
      <td>
        ${transaction.date_time
        ? new Date(transaction.date_time).toLocaleString()
        : ""}
      </td>
      <td>${await getEmployeeNameById(transaction.processed_by) ?? ""}</td>
      <td>${currencyFormat(transaction.amount ?? 0)}</td>
    `;

    tbody.appendChild(tr);
  }

  renderTransactionPaginationControls(count, acc, type, startDate, endDate);
}

function renderTransactionPaginationControls(totalCount, currentAcc, currentType, currentStartDate, currentEndDate) {
  // Look for an existing accounts controls container or create one right below the account table
  let controlsContainer = document.getElementById("transaction-pagination-controls");
  if (!controlsContainer) {
    controlsContainer = document.createElement("div");
    controlsContainer.id = "transaction-pagination-controls";
    document.getElementById("transaction-table-body").closest("table").after(controlsContainer);
  }

  const totalPages = Math.ceil(totalCount / TRANSACTION_PAGE_SIZE) || 1;

  controlsContainer.innerHTML = `
    <button id="transaction-btn-prev" ${currentTransactionPage === 1 ? "disabled" : ""}><i class="fas fa-chevron-left"></i></button>
    <span id="transaction-page-numbers">${currentTransactionPage} of ${totalPages}</span>
    <button id="transaction-btn-next" ${currentTransactionPage === totalPages ? "disabled" : ""}><i class="fas fa-chevron-right"></i></button>
  `;

  // Attach event listeners to rerun the accounts filter on click
  document.getElementById("transaction-btn-prev").addEventListener("click", () => {
    if (currentTransactionPage > 1) getFilteredTransactions(currentAcc, currentType, currentStartDate, currentEndDate, currentTransactionPage - 1);
  });

  document.getElementById("transaction-btn-next").addEventListener("click", () => {
    if (currentTransactionPage < totalPages) getFilteredTransactions(currentAcc, currentType, currentStartDate, currentEndDate, currentTransactionPage + 1);
  });
}

export async function insertTransaction(transactionData) {
  const { data, error } = await sb
    .from("bank_transaction")
    .insert([transactionData])
    .select();

  if (error) {
    console.error("insertTransaction:", error.message);
    return null;
  } else {
    console.log("Transaction inserted successfully:", data);
  }
  return data;
}

export async function getTransactionTypeId(type) {

  const { data, error } = await sb
    .from("transac_type")
    .select("id")
    .ilike("transactype_desc", type)
    .maybeSingle();

  if (error) {
    console.error("getTransactionTypeId:", error.message);
    return 0; // Default to "All" if there's an error
  }

  return data?.id ?? 0; // Return 0 for "All" if no match is found
}

export async function getTransactionTypeDesc(typeId) {
  const { data, error } = await sb
    .from("transac_type")
    .select("transactype_desc")
    .eq("id", typeId)
    .maybeSingle();

  if (error) {
    console.error("getTransactionTypeDesc:", error.message);
    return null;
  }

  return data?.transactype_desc ?? null;
}

export function getTellerTransferFee(amount) {
  if (amount < 50000) return 100;
  if (amount < 500000) return 250;
  if (amount < 1000000) return 500;
  return 1000;
}