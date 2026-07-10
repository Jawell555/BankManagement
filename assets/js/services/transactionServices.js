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

    const lastRefID = data?.ref_id ?? "REF000001";
    const newRefID = lastRefID.replace(/\d+$/, (match) => {
        return (parseInt(match) + 1).toString().padStart(6, "0");
    });

    return newRefID;
}

export async function getTransactions() {
  const { data, error } = await sb
    .from("bank_transaction")
    .select("*")
    .order("created_at", { ascending: false });

    if (error) {
        console.error("getTransactions:", error.message);
        return [];
    }

    return data ?? [];
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
