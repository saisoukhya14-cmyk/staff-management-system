// Supabase client initialization
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL;
const SUPABASE_KEY = window.APP_CONFIG?.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const billsTableBody = document.getElementById('bills-table-body');
const searchInput = document.getElementById('search-input');
const detailsModal = document.getElementById('details-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalContent = document.getElementById('modal-content');
const errorContainer = document.getElementById('error-container');

// State
let allBills = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchBills();

    // Event Listeners
    searchInput.addEventListener('input', handleSearch);
    closeModalBtn.addEventListener('click', () => detailsModal.close());

    // Close modal when clicking outside
    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) detailsModal.close();
    });
});

async function fetchBills() {
    try {
        billsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Loading bills...</td></tr>';

        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allBills = data;
        renderBills(allBills);

    } catch (error) {
        console.error('Error fetching bills:', error);
        showError('Failed to load bills. Please try refreshing the page.');
    }
}

function renderBills(bills) {
    if (bills.length === 0) {
        billsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No bills found.</td></tr>';
        return;
    }

    billsTableBody.innerHTML = bills.map(bill => `
        <tr>
            <td>${formatDate(bill.invoice_date)}</td>
            <td>${bill.invoice_number || 'N/A'}</td>
            <td>${bill.customer_name || 'N/A'}</td>
            <td>${bill.vehicle_number || 'N/A'}</td>
            <td>₹${formatCurrency(bill.grand_total)}</td>
            <td>
                <button class="action-btn view-btn" onclick="window.viewBillDetails('${bill.id}')">View</button>
                <button class="action-btn delete-btn" onclick="window.deleteBill('${bill.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function handleSearch(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allBills.filter(bill =>
        (bill.invoice_number && bill.invoice_number.toLowerCase().includes(term)) ||
        (bill.customer_name && bill.customer_name.toLowerCase().includes(term)) ||
        (bill.vehicle_number && bill.vehicle_number.toLowerCase().includes(term))
    );
    renderBills(filtered);
}

// Global functions for button clicks
window.viewBillDetails = async (id) => {
    const bill = allBills.find(b => b.id === id);
    if (!bill) return;

    modalContent.innerHTML = '<div style="text-align: center; padding: 20px;">Loading details...</div>';
    detailsModal.showModal();

    try {
        // Fetch items
        const { data: items, error } = await supabase
            .from('bill_items')
            .select('*')
            .eq('bill_id', id)
            .order('s_no', { ascending: true });

        if (error) throw error;

        renderBillDetails(bill, items);

    } catch (error) {
        console.error('Error fetching details:', error);
        modalContent.innerHTML = '<div style="color: red; padding: 20px;">Failed to load bill items.</div>';
    }
};

window.deleteBill = async (id) => {
    if (!confirm('Are you sure you want to delete this bill? This cannot be undone.')) return;

    try {
        const { error } = await supabase
            .from('bills')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Remove from local state and re-render
        allBills = allBills.filter(b => b.id !== id);
        renderBills(allBills);

    } catch (error) {
        console.error('Error deleting bill:', error);
        showError('Failed to delete bill.');
    }
};

function renderBillDetails(bill, items) {
    const itemsHtml = items.length > 0 ? `
        <table class="items-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>HSN</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Taxable</th>
                    <th>Tax</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
        const rate = item.price || 0;
        const taxable = item.taxable_amount || (rate * (item.quantity || 0));
        const total = item.total_amount || 0;
        const tax = total - taxable; // Calculate tax difference

        return `
                    <tr>
                        <td>${item.s_no || '-'}</td>
                        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.job_type || item.item_code}">
                            ${item.job_type || item.item_code || 'N/A'}
                        </td>
                        <td>${item.hsn_code || '-'}</td>
                        <td>${item.quantity || 0}</td>
                        <td>₹${formatCurrency(rate)}</td>
                        <td>₹${formatCurrency(taxable)}</td>
                        <td>₹${formatCurrency(tax)}</td>
                        <td>₹${formatCurrency(total)}</td>
                    </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    ` : '<p style="text-align: center; margin-top: 20px; color: var(--text-secondary);">No line items found.</p>';

    modalContent.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Invoice Number</label>
                <span>${bill.invoice_number || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Date</label>
                <span>${formatDate(bill.invoice_date)}</span>
            </div>
            <div class="detail-item">
                <label>Customer</label>
                <span>${bill.customer_name || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>GST Number</label>
                <span>${bill.gst_number || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Vehicle</label>
                <span>${bill.vehicle_number || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <label>Grand Total</label>
                <span style="color: var(--accent-green); font-weight: bold;">₹${formatCurrency(bill.grand_total)}</span>
            </div>
        </div>

        <h3 style="margin-top: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">Line Items</h3>
        ${itemsHtml}
        
        ${bill.file_url ? `
            <div style="margin-top: 20px; text-align: right;">
                <a href="${bill.file_url}" target="_blank" class="secondary-btn" style="text-decoration: none; display: inline-block;">View Original File</a>
            </div>
        ` : ''}
    `;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function formatCurrency(amount) {
    return parseFloat(amount || 0).toFixed(2);
}

function showError(message) {
    errorContainer.innerHTML = `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 10px; border-radius: 6px; margin-bottom: 20px;">${message}</div>`;
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 5000);
}
