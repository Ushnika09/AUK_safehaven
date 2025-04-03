// Add this at the top of your admin.js
const jwt_decode = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

// ======================
// DEBUG UTILITIES
// ======================
const DEBUG_MODE = true;

function userDebugLog(module, message, data = null) {
  if (DEBUG_MODE) {
    console.log(`[${module}] ${message}`);
    if (data) {
      console.log(`[${module}] Data:`, data);
    }
  }
}

function userDebugError(module, message, error) {
  if (DEBUG_MODE) {
    console.error(`[${module}] ERROR: ${message}`);
    console.error(`[${module}] Error Details:`, error);
    if (error.stack) {
      console.error(`[${module}] Stack Trace:`, error.stack);
    }
  }
}

// admin.js - Complete Admin Dashboard Solution with Debug Logs

document.addEventListener("DOMContentLoaded", () => {
    console.log("[Admin] DOM fully loaded and parsed");
    let users=document.getElementById("users-table")
    users.style.display='none'
    let users1=document.getElementById("user-status-filter")
    users1.style.display='none'
    let user2=document.getElementById("user-search")
    user2.style.display='none'
    let users2=document.getElementById("add-user")
    users2.style.display='none'
    let rep1=document.getElementById("report-status-filter")
    rep1.style.display='none'
    let rep=document.getElementById("report-type-filter")
    rep.style.display='none'
    let rep2=document.getElementById("report-date-filter")
    rep2.style.display='none'
    let bulk=document.getElementById("bulk-action")
    bulk.style.display='none'
    

    
    // Check admin session
    if (!sessionStorage.getItem('adminAuth')) {
        console.log("[Auth] No adminAuth token found, redirecting to login");
        window.location.href = 'login.html';
        return;
    }

    // Display admin email
    const adminEmail = sessionStorage.getItem('adminEmail');
    if (adminEmail) {
        console.log("[Auth] Displaying admin email:", adminEmail);
        document.getElementById('admin-email-display').textContent = adminEmail;
    } else {
        console.warn("[Auth] No admin email found in session storage");
    }

    // Theme initialization
    initializeTheme();

    // Event listeners setup
    setupEventListeners();

    // Initial data load
    loadInitialData();

    setupReportModalActions();
});

function initializeTheme() {
    console.log("[Theme] Initializing theme settings");
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    console.log(`[Theme] Current theme: ${currentTheme}`);
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'dark';

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        console.log(`[Theme] Changing theme to: ${newTheme}`);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function setupEventListeners() {
    console.log("[Events] Setting up event listeners");
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        console.log("[Auth] Logout initiated");
        e.preventDefault();
        sessionStorage.removeItem('adminAuth');
        sessionStorage.removeItem('adminEmail');
        window.location.href = 'login.html';
    });

    // Tab switching
    const tabs = document.querySelectorAll('.admin-tabs ul li');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            console.log(`[Tabs] Switching to tab: ${tabId}`);
            
            // Remove active class from all tabs and content
            document.querySelectorAll('.admin-tabs ul li').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Load data for the tab if needed
            if (tabId === 'reports-tab') {
                console.log("[Tabs] Loading reports data");
                loadReports();
            } else if (tabId === 'users-tab') {
                console.log("[Tabs] Loading users data");
                loadUsers();
            }
        });
    });

    // Bulk actions button
    document.getElementById('bulk-action').addEventListener('click', () => {
        const selectedCount = document.querySelectorAll('#reports-table tbody input[type="checkbox"]:checked').length;
        console.log(`[Bulk] Selected ${selectedCount} items for bulk action`);
        
        if (selectedCount === 0) {
            console.warn("[Bulk] No items selected for bulk action");
            Swal.fire('Error', 'Please select at least one report', 'error');
            return;
        }
        
        document.getElementById('selected-count').textContent = selectedCount;
        document.getElementById('bulk-actions-modal').style.display = 'block';
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("[Modal] Closing modal");
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            console.log("[Modal] Clicked outside modal, closing");
            e.target.style.display = 'none';
        }
    });

    // Export data button
    document.getElementById('export-data').addEventListener('click', () => {
        const activeTab = document.querySelector('.admin-tabs ul li.active').getAttribute('data-tab');
        console.log(`[Export] Exporting data from ${activeTab}`);
        
        if (activeTab === 'reports-tab') {
            exportReports();
        } else if (activeTab === 'users-tab') {
            exportUsers();
        }
    });

    // Search functionality
    document.getElementById('global-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const activeTab = document.querySelector('.admin-tabs ul li.active').getAttribute('data-tab');
        console.log(`[Search] Searching for "${searchTerm}" in ${activeTab}`);
        
        if (activeTab === 'reports-tab') {
            filterReportsTable(searchTerm);
        } else if (activeTab === 'users-tab') {
            filterUsersTable(searchTerm);
        }
    });

    // Report filters
    document.getElementById('report-status-filter').addEventListener('change', () => {
        console.log("[Reports] Status filter changed");
        loadReports();
    });
    
    document.getElementById('report-type-filter').addEventListener('change', () => {
        console.log("[Reports] Type filter changed");
        loadReports();
    });
    
    document.getElementById('report-date-filter').addEventListener('change', () => {
        console.log("[Reports] Date filter changed");
        loadReports();
    });

    // User filters
    document.getElementById('user-status-filter').addEventListener('change', () => {
        console.log("[Users] Status filter changed");
        loadUsers();
    });
    
    document.getElementById('user-search').addEventListener('input', () => {
        const searchTerm = document.getElementById('user-search').value;
        console.log(`[Users] Searching for: ${searchTerm}`);
        filterUsersTable(searchTerm);
    });

    // Add user button
    document.getElementById('add-user').addEventListener('click', () => {
        console.log("[Users] Add user button clicked");
        showAddUserModal();
    });

    // Select all checkboxes
    document.getElementById('select-all-reports').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        console.log(`[Reports] Select all reports: ${isChecked}`);
        document.querySelectorAll('#reports-table tbody input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    });

    document.getElementById('select-all-users').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        console.log(`[Users] Select all users: ${isChecked}`);
        document.querySelectorAll('#users-table tbody input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = isChecked;
        });
    });
}

function loadInitialData() {
    console.log("[Init] Loading initial data");
    loadReports();
    updateDashboardStats();
}





async function updateDashboardStats() {
    console.log("[Dashboard] Updating statistics");
    
    try {
        // Fetch total reports
            const reportsRes = await fetch(`${API_BASE_URL}/api/reports/count`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
        });
        
        // Fetch total users
            const usersRes = await fetch(`${API_BASE_URL}/api/users/count`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
        });
        
        // Fetch resolved reports
            const resolvedRes = await fetch(`${API_BASE_URL}/api/reports/count?status=resolved`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
        });
        
        // Update the UI
        if (reportsRes.ok) {
            const reportsData = await reportsRes.json();
            console.log(`[Dashboard] Total reports: ${reportsData.count}`);
            document.getElementById('total-reports').textContent = reportsData.count;
        }
        
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            console.log(`[Dashboard] Total users: ${usersData.count}`);
            document.getElementById('total-users').textContent = usersData.count;
        }
        
        if (resolvedRes.ok) {
            const resolvedData = await resolvedRes.json();
            console.log(`[Dashboard] Resolved reports: ${resolvedData.count}`);
            document.getElementById('resolved-reports').textContent = resolvedData.count;
        }
    } catch (error) {
        console.error('[Dashboard] Error updating stats:', error);
    }
}

// ======================
// UTILITY FUNCTIONS
// ======================

// In getAuthToken() function
const API_BASE_URL = 'http://localhost:3000';

// function getAuthToken() {
//     const token = sessionStorage.getItem('adminAuth');
//     if (!token) {
//         console.error("[Auth] No token found");
//         window.location.href = 'login.html';
//         return null;
//     }
//     return token;
// }
// Update getAuthToken to handle expiration
async function getAuthToken() {
    let token = sessionStorage.getItem('adminAuth');
    if (!token) {
        console.error("[Auth] No token found");
        window.location.href = 'login.html';
        return null;
    }

    // Check token expiration
    const decoded = jwt_decode(token);
    if (decoded && decoded.exp * 1000 < Date.now()) {
        console.log("[Auth] Token expired, attempting refresh");
        const refreshed = await handleTokenRefresh();
        if (!refreshed) {
            window.location.href = 'login.html';
            return null;
        }
        token = sessionStorage.getItem('adminAuth');
    }
    
    return token;
}


function showLoading(selector) {
    console.log(`[UI] Showing loading spinner in ${selector}`);
    const element = document.querySelector(selector);
    element.innerHTML = `
        <tr class="loading-row">
            <td colspan="${element.querySelector('tr') ? element.querySelector('tr').cells.length : 10}">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> Loading...
                </div>
            </td>
        </tr>
    `;
}

function showError(selector, message) {
    console.error(`[UI] Showing error in ${selector}: ${message}`);
    const element = document.querySelector(selector);
    element.innerHTML = `
        <tr class="error-row">
            <td colspan="${element.querySelector('tr') ? element.querySelector('tr').cells.length : 10}">
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i> ${message}
                </div>
            </td>
        </tr>
    `;
}

function editReport(reportId) {
    console.log(`[Reports] Edit requested for report ${reportId}`);
    Swal.fire('Info', 'Edit functionality will be implemented in the next version', 'info');
}


let isRefreshing = false;

async function handleTokenRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    
    try {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });
        
        
        if (response.ok) {
            const data = await response.json();
            sessionStorage.setItem('adminAuth', data.token);
            return true;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        sessionStorage.clear();
        window.location.href = 'login.html';
    } finally {
        isRefreshing = false;
    }
    return false;
}





// ======================
// REPORT FUNCTIONS (FIXED)
// ======================

// Load reports with filters
async function loadReports() {
    const statusFilter = document.getElementById('report-status-filter').value;
    const typeFilter = document.getElementById('report-type-filter').value;
    const dateFilter = document.getElementById('report-date-filter').value;
    const searchTerm = document.getElementById('global-search').value;
    
    try {
        showLoading('#reports-table tbody');
        
        // Build query parameters
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (typeFilter !== 'all') params.append('crime_type', typeFilter);
        if (dateFilter) params.append('date', new Date(dateFilter).toISOString().split('T')[0]);
        if (searchTerm) params.append('search', searchTerm);
        
        const url = `${API_BASE_URL}/api/reports/all?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load reports');
        }
        
        const data = await response.json();
        populateReportsTable(data.reports || []);
    } catch (error) {
        console.error('[Reports] Error loading reports:', error);
        showError('#reports-table tbody', error.message);
    }
}



// Delete report function
async function deleteReport(reportId) {
    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        });
        
        if (result.isConfirmed) {
            const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete report');
            }
            
            Swal.fire('Deleted!', 'Report has been deleted.', 'success');
            loadReports();
        }
    } catch (error) {
        console.error('[Reports] Error deleting report:', error);
        Swal.fire('Error', error.message, 'error');
        
        // If token is invalid, redirect to login
        if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
            sessionStorage.removeItem('adminAuth');
            window.location.href = 'login.html';
        }
    }
}

// View report details
async function viewReportDetails(reportId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch report details');
        }
        
        const data = await response.json();
        showReportModal(data.report);
    } catch (error) {
        console.error('[Reports] Error viewing report:', error);
        Swal.fire('Error', error.message, 'error');
    }
}


// Setup modal action buttons
function setupReportModalActions() {
    const modal = document.getElementById('report-detail-modal');
    
    // Resolve button
    modal.querySelector('.btn-resolve').addEventListener('click', async () => {
        const reportId = modal.querySelector('.report-detail').dataset.id;
        await updateReportStatus(reportId, 'resolved');
    });
    
    // Reject button
    modal.querySelector('.btn-reject').addEventListener('click', async () => {
        const reportId = modal.querySelector('.report-detail').dataset.id;
        await updateReportStatus(reportId, 'rejected');
    });
    
    // Close button
    modal.querySelector('.btn-close').addEventListener('click', () => {
        modal.style.display = 'none';
    });
}



// Show report modal with details
function showReportModal(report) {
    const modal = document.getElementById('report-detail-modal');
    const content = document.getElementById('report-detail-content');
    
    // Format date for display
    const formattedDate = new Date(report.date_time).toLocaleString();
    
    content.innerHTML = `
        <div class="report-detail" data-id="${report.id}">
            <h3>${report.incident_title}</h3>
            <div class="detail-grid">
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="status-badge ${report.status || 'pending'}">${report.status || 'pending'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date & Time:</span>
                    <span>${formattedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span>${report.latitude}, ${report.longitude}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Crime Type:</span>
                    <span>${report.crime_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Severity:</span>
                    <span>${report.severity}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">People Involved:</span>
                    <span>${report.people_involved}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Injured:</span>
                    <span>${report.injured === 'yes' ? 'Yes' : 'No'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Reported to Authorities:</span>
                    <span>${report.reported === 'yes' ? 'Yes' : 'No'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Anonymous Report:</span>
                    <span>${report.anonymous === 'yes' ? 'Yes' : 'No'}</span>
                </div>
                <div class="detail-row full-width">
                    <span class="detail-label">Description:</span>
                    <p>${report.description || 'No description provided'}</p>
                </div>
                ${report.media_path ? `
                <div class="detail-row">
                    <span class="detail-label">Media:</span>
                    <img src="${API_BASE_URL}/${report.media_path}" alt="Report media" class="report-media">
                </div>` : ''}
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Update report status
async function updateReportStatus(reportId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update report status');
        }
        
        Swal.fire('Success!', `Report has been marked as ${status}.`, 'success');
        document.getElementById('report-detail-modal').style.display = 'none';
        loadReports();
    } catch (error) {
        console.error('[Reports] Error updating status:', error);
        Swal.fire('Error', error.message, 'error');
    }
}



// Export reports to CSV
async function exportReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/reports/export`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export reports');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reports_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        Swal.fire('Success!', 'Reports exported successfully.', 'success');
    } catch (error) {
        console.error('[Reports] Error exporting reports:', error);
        Swal.fire('Error', error.message, 'error');
    }
}

// Initialize all report-related functionality
function initializeReportFunctions() {
    // Setup event listeners for filters
    document.getElementById('report-status-filter').addEventListener('change', loadReports);
    document.getElementById('report-type-filter').addEventListener('change', loadReports);
    document.getElementById('report-date-filter').addEventListener('change', loadReports);
    document.getElementById('global-search').addEventListener('input', debounce(loadReports, 300));
    
    // Setup export button
    document.getElementById('export-data').addEventListener('click', exportReports);
    
    // Setup modal actions
    setupReportModalActions();
    
    // Initial load
    loadReports();
}

// Debounce function for search input
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// Call this in your DOMContentLoaded event
initializeReportFunctions();




// Populate reports table with data
function populateReportsTable(reports) {
    const tbody = document.querySelector('#reports-table tbody');
    tbody.innerHTML = '';
    
    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">No reports found</td>
            </tr>
        `;
        return;
    }
    
    reports.forEach(report => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" data-id="${report.id}"></td>
            <td>${report.id}</td>
            <td>${report.incident_title}</td>
            <td>${report.latitude}, ${report.longitude}</td>
            <td>${report.crime_type}</td>
            <td>${report.severity}</td>

            <td>${new Date(report.date_time).toLocaleString()}</td>
            <td>${report.anonymous === 'yes' ? 'Yes' : 'No'}</td>
            <td class="actions-cell">
                <div class="action-buttons">
                    <button class="btn btn-view" data-id="${report.id}" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                   
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Add event delegation for action buttons
    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view, .btn-delete');
        if (!btn) return;
        
        const reportId = btn.getAttribute('data-id');
        
        if (btn.classList.contains('btn-view')) {
            viewReportDetails(reportId);
        } else if (btn.classList.contains('btn-delete')) {
            deleteReport(reportId);
        }
    });
}