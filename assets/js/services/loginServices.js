import { supabase as sb } from '../config/app.js';
import { isUserActive } from './dashboardServices.js';

const passwordField = document.getElementById('password');

export async function validateLogin(username, password) {

    if (!username || !password) {
        alert('Please enter both username and password.');
        return false;
    }
    if (!(await isUserActive(username))) {
        alert('User is not active.');
        return false;
    }

    const { data, error } = await sb.auth.signInWithPassword({
        email: username,
        password: password
    });

    if (error) {
        alert(error.message);
        passwordField.value = '';
        return false;
    }
    // optional: store minimal info
    sessionStorage.setItem("user_email", data.user.email);
    sessionStorage.setItem("user_id", data.user.id);

    alert("Login successful!");
    return true;
}
