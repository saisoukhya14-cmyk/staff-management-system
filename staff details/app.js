// Supabase client initialization
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration (fallback to hard‑coded values if not provided via config.js)
const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || 'https://cwaayduboikqihempgbn.supabase.co';
const SUPABASE_KEY = window.APP_CONFIG?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3YWF5ZHVib2lrcWloZW1wZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNzI1MDMsImV4cCI6MjA4MDc0ODUwM30.mZULa8vhq_o4a6J631he9PCJy_iTwm2vhMWFtJ4AoCE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Salary configuration (used for salary calculations)
const SALARY_CONFIG = {
    driver: { base: 10000, increment: 2000, thresholdMonths: 2 },
    helper: { base: 8000, increment: 1000, thresholdMonths: 2 }
};

// -----------------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------------
function calculateMonthsWorked(dateString) {
    if (!dateString) return 0;
    const start = new Date(dateString);
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += now.getMonth();
    if (now.getDate() < start.getDate()) months--;
    return Math.max(0, months);
}

function calculateSalary(role, joinedDate) {
    const cfg = SALARY_CONFIG[role];
    const months = calculateMonthsWorked(joinedDate);
    const eligible = months > cfg.thresholdMonths;
    const total = eligible ? cfg.base + cfg.increment : cfg.base;
    return { total, base: cfg.base, bonus: eligible ? cfg.increment : 0, monthsWorked: months, isEligible: eligible };
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// -----------------------------------------------------------------------------
// Card rendering
// -----------------------------------------------------------------------------
function createCard(person, role) {
    const { total, base, bonus, monthsWorked, isEligible } = calculateSalary(role, person.created_at);

    // Use actual salary from database if available, otherwise use calculated value
    const actualSalary = person.salary || person.base_salary || total;
    const displayBase = person.base_salary || base;
    const displayTotal = person.salary || actualSalary;

    const isActive = person.active || person.is_active || person.status === 'active';
    const statusColor = isActive ? 'var(--accent-green)' : '#ef4444';
    const statusText = isActive ? 'Active' : 'Inactive';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
    ${person.photo_url ? `<div class="staff-photo" style="text-align: center; margin-bottom: 1rem;">
      <img src="${person.photo_url}" alt="${person.name || 'Staff'}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-blue);">
    </div>` : ''}
    <div class="staff-header">
      <div>
        <h3 class="staff-name">${person.name || person.full_name || 'No Name'}</h3>
        <div style="font-size: 0.8rem; color: ${statusColor}; margin-top: 0.2rem;">● ${statusText}</div>
      </div>
      <span class="staff-id">ID: ${person.id}</span>
    </div>
    <div class="details-row"><span class="label">Phone</span><span class="value">${person.phone || person.phone_number || person.mobile || 'N/A'}</span></div>
    <div class="details-row"><span class="label">Email</span><span class="value">${person.email || 'N/A'}</span></div>
    ${person.aadhar_url ? `<div class="details-row"><span class="label">Aadhar</span><span class="value"><a href="${person.aadhar_url}" target="_blank" style="color: var(--accent-blue); text-decoration: none;">📄 View Document</a></span></div>` : ''}
    <div class="details-row"><span class="label">Joined</span><span class="value">${formatDate(person.created_at)}</span></div>
    <div class="details-row"><span class="label">Tenure</span><span class="value">${monthsWorked} month${monthsWorked !== 1 ? 's' : ''}</span></div>
    <div style="margin: 1rem 0; border-top: 1px solid var(--border-color);"></div>
    <div class="details-row"><span class="label">Base Salary</span><span class="value">₹${displayBase.toLocaleString()}</span></div>
    ${isEligible ? `<div class="details-row"><span class="label">Experience Bonus</span><span class="value" style="color: var(--accent-green)">+₹${bonus.toLocaleString()}</span></div>` : ''}
    <div class="details-row" style="margin-top: 0.5rem; align-items: center;"><span class="label">Total Salary</span><span class="salary">₹${displayTotal.toLocaleString()}</span></div>
    ${isEligible ? `<div style="margin-top: 0.5rem"><span class="badge badge-bonus">Bonus Applied</span></div>` : ''}
    <div class="action-buttons" style="margin-top:0.5rem; display:flex; gap:0.5rem;">
      <button class="edit-btn" data-id="${person.id}" data-role="${role}">✏️</button>
      <button class="delete-btn" data-id="${person.id}" data-role="${role}">🗑️</button>
      <button class="bonus-btn" data-id="${person.id}" data-role="${role}">Add ₹500 Bonus</button>
    </div>
  `;
    return card;
}

// -----------------------------------------------------------------------------
// CRUD helpers
// -----------------------------------------------------------------------------
async function addStaff(data) {
    const { error } = await supabase.from(data.role).insert([data]);
    if (error) throw error;
}

async function updateStaff(id, role, data) {
    const { error } = await supabase.from(role).update(data).eq('id', id);
    if (error) throw error;
}

async function deleteStaff(id, role) {
    const { error } = await supabase.from(role).delete().eq('id', id);
    if (error) throw error;
}

async function fetchRecord(id, role) {
    const { data, error } = await supabase.from(role).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

// -----------------------------------------------------------------------------
// RPC helpers for bonus salary
// -----------------------------------------------------------------------------
async function addDriverBonus(driverId) {
    const { data, error } = await supabase.rpc('add_driver_salary', {
        p_driver_id: driverId,
        p_amount: 500
    });
    if (error) throw error;
    return data;
}

async function addHelperBonus(helperId) {
    const { data, error } = await supabase.rpc('add_helper_salary', {
        p_helper_id: helperId,
        p_amount: 500
    });
    if (error) throw error;
    return data;
}

// -----------------------------------------------------------------------------
// UI logic
// -----------------------------------------------------------------------------
function attachCardListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            const { id, role } = e.currentTarget.dataset;
            try {
                const record = await fetchRecord(id, role);
                // Populate modal for edit
                document.getElementById('name').value = record.name || record.full_name || '';
                document.getElementById('role').value = role;
                document.getElementById('phone').value = record.phone || record.phone_number || record.mobile || '';
                document.getElementById('email').value = record.email || '';
                document.getElementById('photo-url').value = record.photo_url || '';
                document.getElementById('aadhar-url').value = record.aadhar_url || '';
                document.getElementById('joined-date').value = record.created_at ? record.created_at.split('T')[0] : '';
                document.getElementById('edit-id').value = id;
                document.getElementById('edit-role').value = role;
                document.getElementById('modal-title').textContent = 'Edit Staff Member';
                document.querySelector('.submit-btn').textContent = 'Update Staff';
                document.getElementById('add-modal').showModal();
            } catch (err) {
                console.error('Failed to load staff for editing:', err);
                alert('Unable to load staff details for editing.');
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            const { id, role } = e.currentTarget.dataset;
            if (!confirm('Are you sure you want to delete this staff member?')) return;
            try {
                await deleteStaff(id, role);
                alert('Staff member deleted successfully.');
                fetchAndRender();
            } catch (err) {
                console.error('Delete error:', err);
                alert('Failed to delete staff member.');
            }
        });
    });

    document.querySelectorAll('.bonus-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            const { id, role } = e.currentTarget.dataset;
            if (!confirm('Add ₹500 bonus to this staff member?')) return;
            try {
                if (role === 'driver') {
                    await addDriverBonus(id);
                } else if (role === 'helper') {
                    await addHelperBonus(id);
                }
                // Add small delay to ensure database has updated
                await new Promise(resolve => setTimeout(resolve, 300));
                await fetchAndRender();
                alert('Staff salary updated!');
            } catch (err) {
                console.error('Bonus error:', err);
                alert(`Failed to add bonus: ${err.message}`);
            }
        });
    });
}

async function fetchAndRender() {
    const driversGrid = document.getElementById('drivers-grid');
    const helpersGrid = document.getElementById('helpers-grid');
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';
    try {
        const { data: drivers, error: dErr } = await supabase.from('driver').select('*');
        if (dErr) throw dErr;
        const { data: helpers, error: hErr } = await supabase.from('helper').select('*');
        if (hErr) throw hErr;

        driversGrid.innerHTML = '';
        if (drivers && drivers.length) {
            drivers.forEach(d => driversGrid.appendChild(createCard(d, 'driver')));
        } else {
            driversGrid.innerHTML = '<div class="loader">No drivers found.</div>';
        }

        helpersGrid.innerHTML = '';
        if (helpers && helpers.length) {
            helpers.forEach(h => helpersGrid.appendChild(createCard(h, 'helper')));
        } else {
            helpersGrid.innerHTML = '<div class="loader">No helpers found.</div>';
        }

        attachCardListeners();

        if ((!drivers || drivers.length === 0) && (!helpers || helpers.length === 0)) {
            const hint = document.createElement('div');
            hint.className = 'error-message';
            hint.style.background = 'rgba(56, 189, 248, 0.1)';
            hint.style.color = '#38bdf8';
            hint.style.border = '1px solid #38bdf8';
            hint.innerHTML = `
        <h3>👻 No Data Visible?</h3>
        <p>If you have added data in Supabase but don't see it here, check these two things:</p>
        <ul style="text-align:left;display:inline-block;">
          <li><strong>RLS Policies:</strong> Ensure READ access is enabled for anon/public users.</li>
          <li><strong>Table Names:</strong> Verify tables are named <code>driver</code> and <code>helper</code> (lowercase).</li>
        </ul>`;
            errorContainer.appendChild(hint);
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        errorContainer.innerHTML = `<div class="error-message"><strong>Error connecting to database:</strong> ${err.message}</div>`;
        driversGrid.innerHTML = '';
        helpersGrid.innerHTML = '';
    }
}

function setupModal() {
    const fab = document.getElementById('fab-add');
    const modal = document.getElementById('add-modal');
    const closeBtn = document.getElementById('close-modal');
    const form = document.getElementById('add-form');
    const dateInput = document.getElementById('joined-date');
    const submitBtn = form.querySelector('.submit-btn');

    // Reset to Add mode when FAB is clicked
    fab.addEventListener('click', () => {
        document.getElementById('modal-title').textContent = 'Add New Staff';
        submitBtn.textContent = 'Add Staff Member';
        document.getElementById('edit-id').value = '';
        document.getElementById('edit-role').value = '';
        form.reset();
        dateInput.valueAsDate = new Date();
        modal.showModal();
    });

    closeBtn.addEventListener('click', () => modal.close());
    modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving...';

        const name = document.getElementById('name').value.trim();
        const role = document.getElementById('role').value;
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const photoUrl = document.getElementById('photo-url').value.trim();
        const aadharUrl = document.getElementById('aadhar-url').value.trim();
        const joinedDate = document.getElementById('joined-date').value;
        const editId = document.getElementById('edit-id').value;
        const editRole = document.getElementById('edit-role').value;

        try {
            const staffData = {
                name,
                phone,
                email,
                photo_url: photoUrl || null,
                aadhar_url: aadharUrl || null,
                created_at: joinedDate,
                status: 'active'
            };

            if (editId) {
                await updateStaff(editId, editRole, staffData);
                alert('Staff member updated successfully.');
            } else {
                staffData.role = role;
                await addStaff(staffData);
                alert(`Successfully added ${name} as a ${role}!`);
            }
            modal.close();
            form.reset();
            dateInput.valueAsDate = new Date();
            fetchAndRender();
        } catch (err) {
            console.error('Error saving staff:', err);
            alert(`Error: ${err.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    });
}

// Initialise app
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRender();
    setupModal();
});
