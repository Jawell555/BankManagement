import {supabase as sb} from '../config/app.js';


export const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("show");
    }
};

export const updatePassword = async (currentPassword, newPassword, confirmPassword) => {
    // 1. Basic matching validation
    if (newPassword !== confirmPassword) {
        return { success: false, message: 'New password and confirm password do not match.' };
    }

    // 2. Pass BOTH the new and old password to updateUser directly
    const { data, error } = await sb.auth.updateUser({
        password: newPassword,
        current_password: currentPassword
    });

    if (error) {
        // If the current password was wrong, Supabase will return an error here
        return { success: false, message: 'Error: ' + error.message };
    }

    return { success: true, message: 'Password updated successfully.' };
};

