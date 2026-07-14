import { getProfileEmailAndName } from '../services/dashboardServices.js';
import { loadDashboardStats } from '../services/dashboardServices.js';
import { initDashboardData } from '../services/dashboardServices.js';
// import { getEmployeesTable } from '../services/dashboardServices.js';
import { employeeFilter, updateEmployeeStatusOff } from '../services/dashboardServices.js';
import { employeeIDFormat, getEmployeeByID, getMaritalStatusDesc, getGenderDesc, getEmployeeType } from '../services/dashboardServices.js';
import { generateEmployeeID } from '../services/dashboardServices.js';
import { createEmployee } from '../services/dashboardServices.js';
import { getEmployeeTypeId } from '../services/dashboardServices.js';
import { getGenderID } from '../services/dashboardServices.js';
import { getMaritalStatusID } from '../services/dashboardServices.js';
// import { getAccountsTable } from '../services/accountServices.js';
import { accountsFilter } from '../services/accountServices.js';
import {
  generateAccountID,
  getPresentedIDTypeID,
  getAccountTypeId
} from "../services/accountServices.js";
import { createAccount } from "../services/accountServices.js";
import { updateEmployee } from '../services/dashboardServices.js';



const sb = window.supabaseClient;

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

const sidebarNameEl = document.getElementById("current-username");
const sidebarEmailEl = document.getElementById("current-email");

sidebarNameEl.textContent = await getProfileEmailAndName().then(info => info.name ?? "Loading...");
sidebarEmailEl.textContent = await getProfileEmailAndName().then(info => info.email ?? "Loading...");


//load dashboard stats


const totalAdminsEl = document.getElementById("total-admins");
const totalEmployeesEl = document.getElementById("total-employees");
const totalSavingsEl = document.getElementById("savings-accounts");
const totalCurrentEl = document.getElementById("current-accounts");
const totalBankBalanceEl = document.getElementById("bank-balance-amount");
const totalBankDepositEl = document.getElementById("deposit-total");
const totalBankWithdrawEl = document.getElementById("withdraw-total");
const totalBankTransactionsEl = document.getElementById("transacted-total");

const stats = await loadDashboardStats();

totalAdminsEl.textContent = stats.totalAdmins;
totalEmployeesEl.textContent = stats.totalEmployees;
totalSavingsEl.textContent = stats.totalSavings;
totalCurrentEl.textContent = stats.totalCurrent;
totalBankBalanceEl.textContent = stats.totalBankBalance;
totalBankDepositEl.textContent = stats.totalBankDeposit;
totalBankWithdrawEl.textContent = stats.totalBankWithdraw;
totalBankTransactionsEl.textContent = stats.totalBankTransactions;


document.querySelector('[data-content="dashboard"]').addEventListener('click', async () => {
  await initDashboardData();
});
await initDashboardData();

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
      console.log(`Opening ${modalType} modal for employee:`, employeeId);
      modal.dataset.employeeId = employeeId;
    }
    modal.classList.add('show');
  } else if (action === 'close') {
    modal.classList.remove('show');
    delete modal.dataset.employeeId;
  }
};

// Global expose layer (maintaining your existing window API structure)
window.openViewModal = async (id) => {
  toggleModal('view', 'open', id);

  try {
    console.log(`Fetching data for employee view layout: ${id}`);
    const employee = await getEmployeeByID(id);
    console.log("Viewing employee:", employee);

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
window.closeViewModal = () => toggleModal('view', 'close');

window.openEditModal = async (id) => {
  toggleModal('edit', 'open', id);

  try {
    const saveButton = document.getElementById('employee-edit-save');
    console.log(`Fetching data for employee view layout: ${id}`);
    const employee = await getEmployeeByID(id);
    console.log("Viewing employee:", employee);

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
      closeEditModal();
      await refreshEmployeeTable();
    }

  } catch (error) {
    console.error("Error fetching employee data:", error);
  }
};

window.closeEditModal = () => toggleModal('edit', 'close');

window.openDeleteModal = (id) => toggleModal('delete', 'open', id);
window.closeDeleteModal = () => toggleModal('delete', 'close');

// Handle Delete Employee
window.confirmDeleteEmployee = async () => {
  const employeeId = document.getElementById('employee-delete-modal').dataset.employeeId;
  const confirmed = confirm("Are you sure you want to delete this employee?");
  if (!employeeId) {
    console.error("No employee ID found on the modal!");
    return;
  }
  console.log(`Proceeding to delete employee with ID: ${employeeId}`);
  if (confirmed) {
    await updateEmployeeStatusOff(employeeId);
    closeDeleteModal();
    await refreshEmployeeTable();
  }
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