import { getProfileInfo } from '../services/dashboardServices.js';
import { loadDashboardStats } from '../services/dashboardServices.js';
import { initDashboardData } from '../services/dashboardServices.js';
import { employeeFilter, updateEmployeeStatusOff } from '../services/dashboardServices.js';
import { employeeIDFormat, getEmployeeByID, getMaritalStatusDesc, getGenderDesc, getEmployeeType } from '../services/dashboardServices.js';
import { generateEmployeeID } from '../services/dashboardServices.js';
import { createEmployee } from '../services/dashboardServices.js';
import { getEmployeeTypeId } from '../services/dashboardServices.js';
import { getGenderID } from '../services/dashboardServices.js';
import { getMaritalStatusID } from '../services/dashboardServices.js';
import { accountsFilter, accountIDFormat } from '../services/accountServices.js';
import {
  generateAccountID,
  getPresentedIDTypeID,
  getAccountTypeId,
  getAccountById
} from "../services/accountServices.js";
import { createAccount } from "../services/accountServices.js";
import { updateEmployee, currencyFormat } from '../services/dashboardServices.js';

import { supabase as sb } from '../config/app.js';

const menuItems = document.querySelectorAll('.menu-item[data-content]');
const contents = document.querySelectorAll('.content');

const signOutButton = document.getElementById('sign-out');
const employeeTrigger = document.getElementById('employee-trigger');
const employeeSubmenu = document.getElementById('employee-submenu');
const accountTrigger = document.getElementById('account-trigger');
const accountSubmenu = document.getElementById('account-submenu');
const operationsTrigger = document.getElementById('operation-trigger');
const operationsSubmenu = document.getElementById('operation-submenu');

employeeTrigger?.addEventListener('click', (e) => {
  e.preventDefault();
  employeeSubmenu.classList.toggle('open');
  employeeTrigger.classList.toggle('open');
  if (employeeSubmenu.classList.contains('open')) {
    employeeTrigger.querySelector('.fas').classList.replace('fa-chevron-down', 'fa-chevron-up');
  } else {
    employeeTrigger.querySelector('.fas').classList.replace('fa-chevron-up', 'fa-chevron-down');
  }
});

accountTrigger?.addEventListener('click', (e) => {
  e.preventDefault();
  accountSubmenu.classList.toggle('open');
  accountTrigger.classList.toggle('open');
  if (accountSubmenu.classList.contains('open')) {
    accountTrigger.querySelector('.fas').classList.replace('fa-chevron-down', 'fa-chevron-up');
  } else {
    accountTrigger.querySelector('.fas').classList.replace('fa-chevron-up', 'fa-chevron-down');
  }
});

operationsTrigger?.addEventListener('click', (e) => {
  e.preventDefault();
  operationsSubmenu.classList.toggle('open');
  operationsTrigger.classList.toggle('open');
  if (operationsSubmenu.classList.contains('open')) {
    operationsTrigger.querySelector('.fas').classList.replace('fa-chevron-down', 'fa-chevron-up');
  } else {
    operationsTrigger.querySelector('.fas').classList.replace('fa-chevron-up', 'fa-chevron-down');
  }
});

showContent('dashboard');

menuItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = item.dataset.content;
    showContent(targetId);
  });
});

function showContent(contentId) {
  menuItems.forEach(item => {
    item.classList.toggle('active', item.dataset.content === contentId);
  });

  contents.forEach(section => {
    section.classList.toggle('active', section.id === contentId);
  });

  const title = contentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  document.title = `${title} | Summit PhilBank`;
}

signOutButton?.addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = 'index.html';
});

/* Date */
const depositLiveDateTime = document.getElementById('deposit-live-datetime');
const withdrawLiveDateTime = document.getElementById('withdraw-live-datetime');
const transferLiveDateTime = document.getElementById('transfer-live-datetime');

function updateDateTime() {
  const now = new Date();
  depositLiveDateTime.value = now.toLocaleString();
  withdrawLiveDateTime.value = now.toLocaleString();
  transferLiveDateTime.value = now.toLocaleString();
}
updateDateTime();
setInterval(updateDateTime, 1000);
//LOAD SIDEBAR INFO
const profile = await getProfileInfo();

const sidebarNameEl = document.getElementById("current-username");
const sidebarEmailEl = document.getElementById("current-email");

sidebarNameEl.textContent = profile.name ?? "Loading...";
sidebarEmailEl.textContent = profile.email ?? "Loading...";


//load dashboard stats


const totalAdminsEl = document.getElementById("total-admins");
const totalEmployeesEl = document.getElementById("total-employees");
const totalSavingsEl = document.getElementById("savings-accounts");
const totalCurrentEl = document.getElementById("current-accounts");
const totalBankBalanceEl = document.getElementById("bank-balance-amount");
const totalBankDepositEl = document.getElementById("deposit-total");
const totalBankWithdrawEl = document.getElementById("withdraw-total");
const totalBankTransactionsEl = document.getElementById("external-transaction-total");

const stats = await loadDashboardStats();

async function initDasboardStats() {
  const stats = await loadDashboardStats();
  totalAdminsEl.textContent = stats.totalAdmins;
  totalEmployeesEl.textContent = stats.totalEmployees;
  totalSavingsEl.textContent = stats.totalSavings;
  totalCurrentEl.textContent = stats.totalCurrent;
  totalBankBalanceEl.textContent = stats.totalBankBalance;
  totalBankDepositEl.textContent = stats.totalBankDeposit;
  totalBankWithdrawEl.textContent = stats.totalBankWithdraw;
  totalBankTransactionsEl.textContent = stats.totalBankTransactions;
}
await initDashboardData();
await initDasboardStats();

document.querySelector('[data-content="dashboard"]').addEventListener('click', async () => {
  await initDashboardData();
  await initDasboardStats();
});


//View Employee
// Refresh Employee Table every operation clicked

function getCurrentFilterValues() {
  const keyword = document.getElementById('employee-filter').value;
  const type = document.getElementById('employee-type-filter').value;
  return { keyword, type };
}

async function refreshEmployeeTable() {
  const { keyword, type } = getCurrentFilterValues();
  await employeeFilter(keyword, type, 1); // Reset to page 1 after any operation
}

document.querySelector('[data-content="view-employees"]').addEventListener('click', async () => {
  const { keyword, type } = getCurrentFilterValues();
  await employeeFilter(keyword, type, 1);
});

document.getElementById('employee-filter-btn').addEventListener('click', async (event) => {
  const { keyword, type } = getCurrentFilterValues();
  await employeeFilter(keyword, type, 1);
});

// View, Edit, Delete Employee Modal
const toggleModal = (modalType, action, employeeId = null) => {
  const modal = document.getElementById(`employee-${modalType}-modal`);

  if (!modal) {
    console.error(`Could not find the element #employee-${modalType}-modal`);
    return;
  }

  if (action === 'open') {
    if (employeeId) {
      modal.dataset.employeeId = employeeId;
    }
    modal.classList.add('show');
  } else if (action === 'close') {
    modal.classList.remove('show');
    delete modal.dataset.employeeId;
  }
};

// Global expose layer (maintaining your existing window API structure)
window.openEmployeeViewModal = async (id) => {
  toggleModal('view', 'open', id);

  try {
    const employee = await getEmployeeByID(id);

    const viewFields = {
      id: document.getElementById('ve-id'),
      fName: document.getElementById('ve-fname'),
      lName: document.getElementById('ve-lname'),
      gender: document.getElementById('ve-gender'),
      birth: document.getElementById('ve-birth'),
      marital: document.getElementById('ve-marital'),
      email: document.getElementById('ve-email'),
      contact: document.getElementById('ve-contact'),
      address: document.getElementById('ve-address'),
      city: document.getElementById('ve-city'),
      postal: document.getElementById('ve-postal'),
      education: document.getElementById('ve-education'),
      experience: document.getElementById('ve-experience'),
      title: document.getElementById('ve-title'),
      type: document.getElementById('ve-type'),
      createdAt: document.getElementById('ve-hire-date'),
      updatedAt: document.getElementById('ve-date-updated')
    };

    if (employee) {
      viewFields.id.textContent = await employeeIDFormat(employee.id) ?? "";
      viewFields.fName.textContent = employee.first_name ?? "";
      viewFields.lName.textContent = employee.last_name ?? "";
      viewFields.gender.textContent = await getGenderDesc(employee.gender) ?? "";
      viewFields.birth.textContent = employee.date_birth ? new Date(employee.date_birth).toLocaleDateString() : "";
      viewFields.marital.textContent = await getMaritalStatusDesc(employee.marital_status) ?? "";
      viewFields.email.textContent = employee.email ?? "";
      viewFields.contact.textContent = employee.contact_no ?? "";
      viewFields.address.textContent = employee.home ?? "";
      viewFields.city.textContent = employee.city ?? "";
      viewFields.postal.textContent = employee.postal_code ?? "";
      viewFields.education.textContent = employee.attainment ?? "";
      viewFields.experience.textContent = employee.experience ?? "";
      viewFields.title.textContent = employee.job_title ?? "";
      viewFields.type.textContent = await getEmployeeType(employee.employee_type) ?? "";
      viewFields.createdAt.textContent = employee.created_at ? new Date(employee.created_at).toLocaleString() : "";
      viewFields.updatedAt.textContent = employee.updated_at ? new Date(employee.updated_at).toLocaleString() : "";
    }
    else {
      console.error("Employee data not found for ID:", employeeId);
    }

  } catch (error) {
    console.error("Error fetching employee data:", error);
  }
};
window.closeEmployeeViewModal = () => toggleModal('view', 'close');

window.openEmployeeEditModal = async (id) => {
  toggleModal('edit', 'open', id);

  try {
    const saveButton = document.getElementById('employee-edit-save');
    const employee = await getEmployeeByID(id);

    const viewFields = {
      id: document.getElementById('ved-id'),
      first_name: document.getElementById('ved-fname'),
      last_name: document.getElementById('ved-lname'),
      gender: document.getElementById('ved-gender'),
      date_birth: document.getElementById('ved-birth'),
      marital_status: document.getElementById('ved-marital'),
      email: document.getElementById('ved-email'),
      contact_no: document.getElementById('ved-contact'),
      home: document.getElementById('ved-address'),
      city: document.getElementById('ved-city'),
      postal_code: document.getElementById('ved-postal'),
      attainment: document.getElementById('ved-education'),
      experience: document.getElementById('ved-experience'),
      job_title: document.getElementById('ved-title'),
      employee_type: document.getElementById('ved-type'),
      created_at: document.getElementById('ved-hire-date'),
      updated_at: document.getElementById('ved-date-updated')
    };

    if (employee) {
      viewFields.id.value = await employeeIDFormat(employee.id) ?? "";
      viewFields.first_name.value = employee.first_name ?? "";
      viewFields.last_name.value = employee.last_name ?? "";
      viewFields.gender.value = await getGenderDesc(employee.gender) ?? "";
      viewFields.date_birth.value = employee.date_birth ? new Date(employee.date_birth).toLocaleDateString() : "";
      viewFields.marital_status.value = await getMaritalStatusDesc(employee.marital_status) ?? "";
      viewFields.email.value = employee.email ?? "";
      viewFields.contact_no.value = employee.contact_no ?? "";
      viewFields.home.value = employee.home ?? "";
      viewFields.city.value = employee.city ?? "";
      viewFields.postal_code.value = employee.postal_code ?? "";
      viewFields.attainment.value = employee.attainment ?? "";
      viewFields.experience.value = employee.experience ?? "";
      viewFields.job_title.value = employee.job_title ?? "";
      viewFields.employee_type.value = await getEmployeeType(employee.employee_type) ?? "";
      viewFields.created_at.value = employee.created_at ? new Date(employee.created_at).toLocaleString() : "";
      viewFields.updated_at.value = employee.updated_at ? new Date(employee.updated_at).toLocaleString() : "";
    }
    else {
      console.error("Employee data not found for ID:", employeeId);
    }

    saveButton.onclick = async () => {
      const updatedEmployeeData = {
        marital_status: await getMaritalStatusID(viewFields.marital_status.value),
        email: viewFields.email.value.trim(),
        contact_no: viewFields.contact_no.value.trim(),
        city: viewFields.city.value.trim(),
        postal_code: viewFields.postal_code.value.trim(),
        home: viewFields.home.value.trim(),
        job_title: viewFields.job_title.value.trim(),
        employee_type: await getEmployeeTypeId(viewFields.employee_type.value),
        updated_at: new Date().toISOString()
      };

      await updateEmployee(employee.id, updatedEmployeeData);
      closeEmployeeEditModal();
      await refreshEmployeeTable();
    }

  } catch (error) {
    console.error("Error fetching employee data:", error);
  }
};

window.closeEmployeeEditModal = () => toggleModal('edit', 'close');

window.openEmployeeDeleteModal = (id) => toggleModal('delete', 'open', id);
window.closeEmployeeDeleteModal = () => toggleModal('delete', 'close');

// Handle Delete Employee
window.confirmDeleteEmployee = async () => {
  const employeeId = document.getElementById('employee-delete-modal').dataset.employeeId;
  if (!employeeId) {
    console.error("No employee ID found on the modal!");
    return;
  }

  await updateEmployeeStatusOff(employeeId);
  closeEmployeeDeleteModal();
  alert("Employee deleted successfully!");
  await refreshEmployeeTable();

};

//Add Employee

const employeeID = document.getElementById('employee-id');
const employeeFirstName = document.getElementById('employee-first-name');
const employeeLastName = document.getElementById('employee-last-name');
const employeeBirth = document.getElementById('employee-birth');
const employeeGender = document.getElementById('employee-gender');
const employeeMarital = document.getElementById('employee-marital');
const employeeEmail = document.getElementById('employee-email');
const employeeContact = document.getElementById('employee-contact');

const employeePostal = document.getElementById('employee-postal');
const employeeAddress = document.getElementById('employee-address');
const employeeCity = document.getElementById('employee-city');

const employeeEducation = document.getElementById('employee-education');
const employeeExperience = document.getElementById('employee-experience');
const employeeTitle = document.getElementById('employee-title');

const employeeUsername = document.getElementById('employee-username');
const employeeType = document.getElementById('employee-type');
const employeePassword = document.getElementById('employee-password');


document.querySelector('[type="submit"][name="add-employee-form"]').addEventListener('click', async (event) => {
  event.preventDefault();

  const employeeData = {
    first_name: employeeFirstName.value,
    last_name: employeeLastName.value,
    role: "employee",
    full_name: `${employeeFirstName.value} ${employeeLastName.value}`,
    date_birth: employeeBirth.value,
    gender: await getGenderID(employeeGender.value),
    marital_status: await getMaritalStatusID(employeeMarital.value),
    email: employeeEmail.value,
    contact_no: employeeContact.value,
    postal_code: employeePostal.value,
    home: employeeAddress.value,
    city: employeeCity.value,
    attainment: employeeEducation.value,
    experience: employeeExperience.value,
    job_title: employeeTitle.value,
    username: employeeUsername.value,
    employee_type: await getEmployeeTypeId(employeeType.value),
  };

  const newEmployee = await createEmployee(employeeData);
  if (newEmployee) {
    alert("Employee added successfully!");
    await refreshAddEmployeeContent();
  }
});

document.querySelector('[data-content="add-employees"]').addEventListener('click', async () => {

  const newEmployeeID = await generateEmployeeID();
  employeeID.value = newEmployeeID;
});

async function refreshAddEmployeeContent() {
  employeeID.value = await generateEmployeeID();
  employeeFirstName.value = "";
  employeeLastName.value = "";
  employeeBirth.value = "";
  employeeGender.value = "";
  employeeMarital.value = "";
  employeeEmail.value = "";
  employeeContact.value = "";
  employeePostal.value = "";
  employeeAddress.value = "";
  employeeCity.value = "";
  employeeEducation.value = "";
  employeeExperience.value = "";
  employeeTitle.value = "";
  employeeUsername.value = "";
}

//View Accounts
export function getCurrentAccountFilterValues() {
  const keyword = document.getElementById('account-filter').value;
  const type = document.getElementById('account-type-filter').value;
  return { keyword, type };
}

export async function refreshAccountsTable() {
  const { keyword, type } = getCurrentAccountFilterValues();
  await accountsFilter(keyword, type, 1); // Reset to page 1 after any operation
}

let accountsTablesLoaded = false;
document.querySelector('[data-content="view-accounts"]').addEventListener('click', async () => {
  if (!accountsTablesLoaded) {
    const { keyword, type } = getCurrentAccountFilterValues();
    await accountsFilter(keyword, type, 1); // Reset to page 1 after any operation  
    accountsTablesLoaded = true;
  }
});

document.getElementById('account-filter-btn').addEventListener('click', async (event) => {
  const { keyword, type } = getCurrentAccountFilterValues();
  await accountsFilter(keyword, type, 1); // Reset to page 1 after filter is applied
});

// Form + inputs
const addAccountForm = document.getElementById("add-account-form"); // <- form element
const accountID = document.getElementById("account-id");

// Personal Information
const accountFirstName = document.getElementById("account-first-name");
const accountLastName = document.getElementById("account-last-name");
const accountBirth = document.getElementById("account-birth");
const accountGender = document.getElementById("account-gender");
const accountIDType = document.getElementById("account-id-type");
const accountIDNumber = document.getElementById("account-id-number");
const accountMarital = document.getElementById("account-marital");
const accountEmail = document.getElementById("account-email");
const accountContact = document.getElementById("account-contact");

// Address Information
const accountPostal = document.getElementById("account-postal");
const accountAddress = document.getElementById("account-address");
const accountCity = document.getElementById("account-city");

// Account Information
const accountTitle = document.getElementById("account-title");
const accountType = document.getElementById("account-type");
const accountBalance = document.getElementById("account-balance");

function toNullIfEmpty(v) {
  const s = (v ?? "").trim();
  return s === "" ? null : s;
}

function requiredField(input, label) {
  if (!input?.value?.trim()) {
    alert(`Please fill in ${label}.`);
    return false;
  }
  return true;
}

// Set account ID when page/section loads (not on submit click)
async function initAccountID() {
  if (accountID) accountID.value = await generateAccountID();
}
initAccountID();

if (addAccountForm) {
  addAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Required text fields
    const requiredChecks = [
      [accountFirstName, "First Name"],
      [accountLastName, "Last Name"],
      [accountIDNumber, "ID Number"],
      [accountEmail, "Email"],
      [accountContact, "Contact Number"],
      [accountPostal, "Postal Code"],
      [accountAddress, "Address"],
      [accountCity, "City"],
      [accountTitle, "Account Title"]
    ];

    for (const [field, label] of requiredChecks) {
      if (!requiredField(field, label)) return;
    }

    // Date validation
    const birth = toNullIfEmpty(accountBirth.value);
    if (birth == null) {
      alert("Birth date is required.");
      return;
    }

    // FK lookups
    const presentedId = await getPresentedIDTypeID(accountIDType.value);
    if (presentedId == null) {
      alert("Please select a valid Presented ID type.");
      return;
    }

    const genderId = await getGenderID(accountGender.value);
    if (genderId == null) {
      alert("Please select a valid gender.");
      return;
    }

    const maritalStatusId = await getMaritalStatusID(accountMarital.value);
    if (maritalStatusId == null) {
      alert("Please select a valid marital status.");
      return;
    }

    const accountTypeId = await getAccountTypeId(accountType.value);
    if (accountTypeId == null) {
      alert("Please select a valid account type.");
      return;
    }

    // Numeric validation
    const balance = Number.parseFloat(accountBalance.value);
    if (Number.isNaN(balance) || balance < 0) {
      alert("Please enter a valid account balance (0 or more).");
      return;
    }

    const accountData = {
      f_name: accountFirstName.value.trim(),
      l_name: accountLastName.value.trim(),
      date_birth: birth,
      gender: genderId,
      presented_id: presentedId,
      id_no: accountIDNumber.value.trim(),
      marital_status: maritalStatusId,
      email: accountEmail.value.trim(),
      contact_no: accountContact.value.trim(),
      postal_code: accountPostal.value.trim(),
      home: accountAddress.value.trim(),
      city: accountCity.value.trim(),
      acc_title: accountTitle.value.trim(),
      acc_type: accountTypeId,
      acc_balance: balance,
      is_active: true
    };

    const newAccount = await createAccount(accountData);
    if (newAccount) {
      alert("Account added successfully!");
      await refreshAddAccountContent();
    }
  });
}

async function refreshAddAccountContent() {
  accountID.value = await generateAccountID();
  accountFirstName.value = "";
  accountLastName.value = "";
  accountBirth.value = "";
  accountGender.value = "";
  accountIDType.value = "";
  accountIDNumber.value = "";
  accountMarital.value = "";
  accountEmail.value = "";
  accountContact.value = "";
  accountPostal.value = "";
  accountAddress.value = "";
  accountCity.value = "";
  accountTitle.value = "";
  accountType.value = "";
  accountBalance.value = "0";
}
import { getFilteredTransactions, generateRefID, getTransactionTypeId, insertTransaction } from '../services/transactionServices.js';

import { updateBalanceDeposit, updateBalanceWithdraw } from '../services/accountServices.js';

// Account Operation (Deposit)
const depositSearch = document.getElementById("deposit-account-search");
const depositForm = document.getElementById("deposit-form");

const depositAccountTitle = document.getElementById("deposit-account-title");
const depositAccountName = document.getElementById("deposit-account-name");
const depositAccountNumber = document.getElementById("deposit-account-number");
const depositAccountBalance = document.getElementById("deposit-account-balance");
const depositAccountStatus = document.getElementById("deposit-account-status");
const depositAccountType = document.getElementById("deposit-account-type");

const depositReference = document.getElementById("deposit-reference");
const depositType = document.getElementById("deposit-type");
const depositDate = document.getElementById("deposit-live-datetime");
const depositAmount = document.getElementById("deposit-amount");
const depositorName = document.getElementById("deposit-depositor-name");

document.querySelector('[data-content="deposit-operations"]').addEventListener('click', async () => {
  await refreshDepositContent();
  await initializeDepositForm()
});

document.getElementById("deposit-search-btn").addEventListener("click", async (event) => {
  event.preventDefault();
  const accountNumber = depositSearch.value.trim();

  const account = await getAccountById(accountNumber);
  if (account) {
    depositAccountTitle.value = account.acc_title;
    depositAccountName.value = `${account.f_name} ${account.l_name}`;
    depositAccountNumber.value = accountIDFormat(account.id);
    depositAccountBalance.value = currencyFormat(account.acc_balance);
    depositAccountStatus.value = account.is_active ? "Active" : "Inactive";
    depositAccountType.value = account.acc_type;
  } else {
    alert("Account not found!");
  }
});

depositForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentAccountNumber = depositAccountNumber.value;

  if (!currentAccountNumber) {
    alert("Please search for an account first.");
    return;
  }
  const account = await getAccountById(currentAccountNumber);
  if (!account) {
    alert("Account not found!");
    return;
  }
  const depositData = {
    acc_id: account.id,
    acc_fname: account.f_name,
    acc_lname: account.l_name,
    acc_name: `${account.f_name} ${account.l_name}`,
    transac_type: await getTransactionTypeId(depositType.value),
    date_time: new Date().toISOString(),
    amount: parseFloat(depositAmount.value),
    transac_with: depositorName.value.trim(),
    processed_by: profile.id ?? null,
  };

  const result = await insertTransaction(depositData);
  if (result) {
    alert("Deposit successful!");
    await updateBalanceDeposit(account.id, depositData.amount);
    await refreshDepositContent();
  }
});

async function initializeDepositForm() {
  const referenceInput = document.getElementById("deposit-reference");
  const submitButton = depositForm.querySelector('button[type="submit"]');

  referenceInput.value = "";
  referenceInput.placeholder = "Generating reference...";
  submitButton.disabled = true;

  try {
    const newRefID = await generateRefID();

    // Ensures the input was not replaced while waiting.
    if (referenceInput.isConnected) {
      referenceInput.value = newRefID;
    }
  } catch (error) {
    console.error("Could not generate deposit reference:", error);
    alert("Could not generate a deposit reference.");
  } finally {
    submitButton.disabled = false;
  }
}

async function refreshDepositContent() {
  depositSearch.value = "";
  depositAccountTitle.value = "";
  depositAccountName.value = "";
  depositAccountNumber.value = "";
  depositAccountBalance.value = "";
  depositAccountStatus.value = "";
  depositAccountType.value = "";
  depositAmount.value = "";
  depositorName.value = "";
  depositReference.value = await generateRefID();
}

// Account Operation (Withdraw)
const withdrawSearch = document.getElementById("withdraw-account-search");
const withdrawForm = document.getElementById("withdraw-form");

const withdrawAccountTitle = document.getElementById("withdraw-account-title");
const withdrawAccountName = document.getElementById("withdraw-account-name");
const withdrawAccountNumber = document.getElementById("withdraw-account-number");
const withdrawAccountBalance = document.getElementById("withdraw-account-balance");
const withdrawAccountStatus = document.getElementById("withdraw-account-status");
const withdrawAccountType = document.getElementById("withdraw-account-type");

const withdrawReference = document.getElementById("withdraw-reference");
const withdrawType = document.getElementById("withdraw-type");
const withdrawDate = document.getElementById("withdraw-live-datetime");
const withdrawAmount = document.getElementById("withdraw-amount");
const withdraworName = document.getElementById("withdraw-withdrawer-name");

document.querySelector('[data-content="withdraw-operations"]').addEventListener('click', async () => {
  await refreshWithdrawContent();
  await initializeWithdrawForm();
});

document.getElementById("withdraw-search-btn").addEventListener("click", async (event) => {
  event.preventDefault();
  const accountNumber = withdrawSearch.value.trim();

  const account = await getAccountById(accountNumber);
  if (account) {
    withdrawAccountTitle.value = account.acc_title;
    withdrawAccountName.value = `${account.f_name} ${account.l_name}`;
    withdrawAccountNumber.value = accountIDFormat(account.id);
    withdrawAccountBalance.value = currencyFormat(account.acc_balance);
    withdrawAccountStatus.value = account.is_active ? "Active" : "Inactive";
    withdrawAccountType.value = account.acc_type;
  } else {
    alert("Account not found!");
  }
});

withdrawForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentAccountNumber = withdrawAccountNumber.value;

  if (!currentAccountNumber) {
    alert("Please search for an account first.");
    return;
  }
  const account = await getAccountById(currentAccountNumber);
  if (!account) {
    alert("Account not found!");
    return;
  }
  const withdrawData = {
    acc_id: account.id,
    acc_fname: account.f_name,
    acc_lname: account.l_name,
    acc_name: `${account.f_name} ${account.l_name}`,
    transac_type: await getTransactionTypeId(withdrawType.value),
    date_time: new Date().toISOString(),
    amount: parseFloat(withdrawAmount.value),
    transac_with: withdraworName.value.trim(),
    processed_by: profile.id ?? null,
  };

  const result = await insertTransaction(withdrawData);
  if (result) {
    alert("Withdrawal successful!");
    await updateBalanceWithdraw(account.id, withdrawData.amount);
    await refreshWithdrawContent();
  }
});

async function initializeWithdrawForm() {
  const referenceInput = document.getElementById("withdraw-reference");
  const submitButton = withdrawForm.querySelector('button[type="submit"]');

  referenceInput.value = "";
  referenceInput.placeholder = "Generating reference...";
  submitButton.disabled = true;

  try {
    const newRefID = await generateRefID();

    // Ensures the input was not replaced while waiting.
    if (referenceInput.isConnected) {
      referenceInput.value = newRefID;
    }
  } catch (error) {
    console.error("Could not generate withdraw reference:", error);
    alert("Could not generate a withdraw reference.");
  } finally {
    submitButton.disabled = false;
  }
}

async function refreshWithdrawContent() {
  withdrawSearch.value = "";
  withdrawAccountTitle.value = "";
  withdrawAccountName.value = "";
  withdrawAccountNumber.value = "";
  withdrawAccountBalance.value = "";
  withdrawAccountStatus.value = "";
  withdrawAccountType.value = "";
  withdrawAmount.value = "";
  withdraworName.value = "";
  withdrawReference.value = await generateRefID();
}

import { formatExternalBankID, getExternalAccountById, getExternalBankIDFromString } from '../services/dummyExternalServices.js';
import { getTellerTransferFee, stringToAmount } from '../services/transactionServices.js';

const senderSearch = document.getElementById("sender-account-search");
const receiverSearch = document.getElementById("receiver-account-search");

const transferForm = document.getElementById("transfer-form");

const senderAccountTitle = document.getElementById("sender-account-title");
const senderAccountName = document.getElementById("sender-account-name");
const senderAccountNumber = document.getElementById("sender-account-number");
const senderAccountBalance = document.getElementById("sender-account-balance");
const senderAccountStatus = document.getElementById("sender-account-status");

const receiverAccountTitle = document.getElementById("receiver-account-title");
const receiverAccountName = document.getElementById("receiver-account-name");
const receiverAccountNumber = document.getElementById("receiver-account-number");
const receiverAccountBalance = document.getElementById("receiver-account-balance");
const receiverAccountStatus = document.getElementById("receiver-account-status");

const transferReference = document.getElementById("transfer-reference");
const transferType = document.getElementById("transfer-type");
const transferDate = document.getElementById("transfer-live-datetime");
const transferAmount = document.getElementById("transfer-amount");
const transferFee = document.getElementById("transfer-fee");
const transferTotal = document.getElementById("transfer-total");

// Keep searched accounts available globally
let senderAccount = null;
let receiverAccount = null;

// Generate Reference Number

document.querySelector('[data-content="transfer-operations"]').addEventListener("click", async () => {
  await refreshTransferContent();
  await initializeTransferForm();
});


// Update Transfer Fee & Total


function updateTransferTotals() {
  const amount = parseFloat(transferAmount.value) || 0;
  if (amount < 0) {
    transferFee.textContent = currencyFormat(0);
    transferTotal.textContent = currencyFormat(0);
    return;
  }
  if (transferType.value === "internal transfer") {
    transferFee.textContent = currencyFormat(0);
    transferTotal.textContent = currencyFormat(amount);
  } else {
    const fee = getTellerTransferFee(amount);
    transferFee.textContent = currencyFormat(fee);
    transferTotal.textContent = currencyFormat(amount + fee);
  }
}

transferType.addEventListener("change", updateTransferTotals);
transferAmount.addEventListener("input", updateTransferTotals);


// Search Accounts

document.getElementById("transfer-search-btn").addEventListener("click", async (event) => {
  event.preventDefault();

  const senderAccNumber = senderSearch.value.trim();
  const receiverAccNumber = receiverSearch.value.trim();

  senderAccount = null;
  receiverAccount = null;

  senderAccount = await getAccountById(senderAccNumber);

  if (transferType.value === "internal transfer") {
    receiverAccount = await getAccountById(receiverAccNumber);
  } else {
    receiverAccount = await getExternalAccountById(receiverAccNumber);
  }

  if (!senderAccount) {
    alert("Sender account not found!");
    return;
  }
  if (!receiverAccount) {
    alert("Receiver account not found!");
    return;
  }
  if (senderAccount.id === receiverAccount.id) {
    alert("Sender and receiver accounts cannot be the same.");
    return;
  }

  // Sender
  senderAccountTitle.value = senderAccount.acc_title;
  senderAccountName.value = `${senderAccount.f_name} ${senderAccount.l_name}`;
  senderAccountNumber.value = accountIDFormat(senderAccount.id);
  senderAccountBalance.value = currencyFormat(senderAccount.acc_balance);
  senderAccountStatus.value = senderAccount.is_active ? "Active" : "Inactive";

  // Receiver
  if (transferType.value === "internal transfer") {
    receiverAccountTitle.value = receiverAccount.acc_title;
    receiverAccountName.value = `${receiverAccount.f_name} ${receiverAccount.l_name}`;
    receiverAccountNumber.value = accountIDFormat(receiverAccount.id);
    receiverAccountBalance.value = currencyFormat(receiverAccount.acc_balance);
    receiverAccountStatus.value = receiverAccount.is_active ? "Active" : "Inactive";
  } else {
    receiverAccountTitle.value = receiverAccount.name;
    receiverAccountName.value = receiverAccount.name;
    receiverAccountNumber.value = formatExternalBankID(receiverAccount.id);
    receiverAccountBalance.value = "-";
    receiverAccountStatus.value = "-";
  }
});

// Submit Transfer

transferForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!senderAccount) {
    alert("Please search for the sender account first.");
    return;
  }

  if (!receiverAccount) {
    alert("Please search for the receiver account first.");
    return;
  }

  const amount = stringToAmount(transferTotal.textContent) || 0;

  console.log("Transfer Amount:", { amount });
  if (amount <= 100) {
    alert("Please enter a valid transfer amount.");
    return;
  }

  const transferData = {
    acc_id: senderAccount.id,
    acc_fname: senderAccount.f_name,
    acc_lname: senderAccount.l_name,
    acc_name: `${senderAccount.f_name} ${senderAccount.l_name}`,
    transac_type: await getTransactionTypeId(transferType.value),
    date_time: new Date().toISOString(),
    amount: amount,
    transac_with: receiverAccountNumber.value,
    processed_by: profile?.id ?? null,
  };

  if (transferType.value === "internal transfer") {
    const { data, error } = await sb.functions.invoke("transfer-funds", {
      body: {
        senderAccountId: senderAccount.id,
        receiverAccountId: receiverAccount.id,
        amount: amount,
      },
    });


    if (error) {
      const response = await error.context?.json().catch(() => null);

      console.error("Transfer failed:", {
        message: error.message,
        response,
      });

      alert(response?.error ?? error.message);
      return;
    }

    console.log("Transfer succeeded:", data);
    alert("Transfer successful!");
    const result = await insertTransaction(transferData);
  } else {
    const { data, error } = await sb.functions.invoke("transfer-to-external", {
      body: {
        senderAccountId: senderAccount.id,
        externalBankId: receiverAccount.id,
        amount: amount,
      },
    });

    if (error) {
      const response = await error.context?.json().catch(() => null);

      console.error("Transfer failed:", {
        message: error.message,
        response,
      });

      alert(response?.error ?? error.message);
      return;
    }

    console.log("Transfer succeeded:", data);
    alert("Transfer successful!");
    const result = await insertTransaction(transferData);
  }





  await refreshTransferContent();

  senderAccount = null;
  receiverAccount = null;
});

async function initializeTransferForm() {
  const referenceInput = document.getElementById("transfer-reference");
  const submitButton = transferForm.querySelector('button[type="submit"]');

  referenceInput.value = "";
  referenceInput.placeholder = "Generating reference...";
  submitButton.disabled = true;

  try {
    const newRefID = await generateRefID();

    // Ensures the input was not replaced while waiting.
    if (referenceInput.isConnected) {
      referenceInput.value = newRefID;
    }
  } catch (error) {
    console.error("Could not generate transfer reference:", error);
    alert("Could not generate a transfer reference.");
  } finally {
    submitButton.disabled = false;
  }
}

async function refreshTransferContent() {
  senderSearch.value = "";
  receiverSearch.value = "";

  senderAccountTitle.value = "";
  senderAccountName.value = "";
  senderAccountNumber.value = "";
  senderAccountBalance.value = "";
  senderAccountStatus.value = "";

  receiverAccountTitle.value = "";
  receiverAccountName.value = "";
  receiverAccountNumber.value = "";
  receiverAccountBalance.value = "";
  receiverAccountStatus.value = "";

  transferAmount.value = "";
  transferReference.value = await generateRefID();
}

// Bank Balance
export function getTransactionFilterValues() {
  const keyword = document.getElementById('reference-filter').value;
  const type = document.getElementById('transaction-type-filter').value;
  const startDate = document.getElementById('start-date-filter').value;
  const endDate = document.getElementById('end-date-filter').value;
  return { keyword, type, startDate, endDate };
}

export async function refreshTransactionTable() {
  const { keyword, type, startDate, endDate } = getTransactionFilterValues();
  await getFilteredTransactions(keyword, type, startDate, endDate, 1);
}

let transactionTablesLoaded = false;
document.querySelector('[data-content="bank-balance"]').addEventListener('click', async () => {
  if (!transactionTablesLoaded) {
    const { keyword, type, startDate, endDate } = getTransactionFilterValues();
    await getFilteredTransactions(keyword, type, startDate, endDate, 1); // Reset to page 1 after any operation
    transactionTablesLoaded = true;
  }
});

document.getElementById('transaction-filter-btn').addEventListener('click', async (event) => {
  const { keyword, type, startDate, endDate } = getTransactionFilterValues();
  await getFilteredTransactions(keyword, type, startDate, endDate, 1); // Reset to page 1 after filter is applied
});

//change password
import { updatePassword, closeModal } from '../services/userServices.js';

const changePasswordBtn = document.getElementById("change-password-btn");
const changePasswordModal = document.getElementById("change-password-modal");

changePasswordBtn.addEventListener("click", () => {
  changePasswordModal.classList.add("show");
});

const closeChangePasswordModalBtn = document.getElementById("change-password-close");

closeChangePasswordModalBtn.addEventListener("click", () => {
  closeModal('change-password-modal');
});

const changePasswordForm = document.getElementById('change-password-form');

changePasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // 1. Grab inputs from the DOM
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');

  // 2. Call the exported service function
  const result = await updatePassword(
    currentPasswordInput.value,
    newPasswordInput.value,
    confirmPasswordInput.value
  );

  // 3. Alert the user with the result message
  alert(result.message);

  if (result.success) {
    // 4. Clear the input fields on success
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';

    // 5. Close the modal
    closeModal('change-password-modal');
  }
});