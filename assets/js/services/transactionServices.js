import { supabase as sb } from '../config/app.js';

export async function generateRefID() {
    const { data, error } = await sb
        .from("bank_transaction")
        .select("ref_id")
        .order("ref_id", { descending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("generateRefID:", error.message);
        return null;
    }

    const lastRefID = data?.ref_id ?? 0;
    const newRefID = lastRefID+1;
    return formatRefID(newRefID);
}

function formatRefID(refID) {
    const refIDStr = refID.toString().padStart(6, '0');
    const prefix = 'REF' + (refIDStr.length < 6 ? '0'.repeat(6 - refIDStr.length) : '');
    return prefix + refIDStr;
}


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
  const transactionTypeId = await getTransactionTypeId(type);

  const from = (page - 1) * TRANSACTION_PAGE_SIZE;
  const to = from + TRANSACTION_PAGE_SIZE - 1;

  let query = sb
    .from("bank_transaction")
    .select("*", { count: "exact" })
    .order("transac_date", { ascending: false });

  // Type filter: 0 means All
  if (transactionTypeId !== 0) {
    query = query.eq("transac_type", transactionTypeId);
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
    query = query.gte("transac_date", `${startDate}T00:00:00`);
  }

  if (endDate) {
    const nextDay = new Date(`${endDate}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);

    query = query.lt("transac_date", nextDay.toISOString());
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
      <td>${transaction.ref_id ?? ""}</td>
      <td>${accountIDFormat(transaction.acc_id)}</td>
      <td>${transaction.acc_name ?? ""}</td>
      <td>${await getTransactionTypeDesc(transaction.transac_type) ?? ""}</td>
      <td>${currencyFormat(transaction.amount ?? 0)}</td>
      <td>${transaction.transac_with ?? ""}</td>
      <td>${transaction.processed_by ?? ""}</td>
      <td>
        ${transaction.transac_date
          ? new Date(transaction.transac_date).toLocaleString()
          : ""}
      </td>
    `;

    tbody.appendChild(tr);
  }

  if (!data?.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">No transactions found.</td>
      </tr>
    `;
  }

  return {
    data: data ?? [],
    count: count ?? 0
  };
}

export async function insertTransaction(transactionData) {
    const { data, error } = await sb
        .from("bank_transaction")
        .insert([transactionData])
        .select();

    if (error) {
        console.error("insertTransaction:", error.message);
        return null;
    }else{
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