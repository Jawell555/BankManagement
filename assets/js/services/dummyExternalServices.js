import {supabase as sb} from '../config/app.js';

export function formatExternalBankID(bankID) {
    const extIDStr = bankID.toString().padStart(12, '0');
    const prefix = 'OTH' + (extIDStr.length < 12 ? '0'.repeat(12 - extIDStr.length) : '');
    return prefix + extIDStr;
}

export function getExternalBankIDFromString(str) {
  const s = String(str ?? "").trim().toUpperCase();

  // must be OTH + digits only, e.g. OTH000001
  if (!/^OTH\d+$/.test(s)) return null;

  const n = Number.parseInt(s.slice(3), 10);
  return Number.isNaN(n) ? null : n;
}

export async function getExternalAccountById(id) {
    const numericId = getExternalBankIDFromString(id);
    if (numericId === null) {
        console.error("getExternalAccountById: Invalid external bank ID format:", id);
        return null;
    }
    const { data, error } = await sb
        .from("external_bank")
        .select("*")
        .eq("id", numericId)
        .single();

    if (error) {
        console.error("getDummyExternalAccountById:", error.message);
        return null;
    }

    console.log("getExternalAccountById: Retrieved external account:", data);

    return data;
}


