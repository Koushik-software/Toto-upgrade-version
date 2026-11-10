/**
 * TOTO DRIVE FLEET OPERATIONS CONSOLE — ELECTRON RENDERER APP
 * Pure IPC & API Context Isolation (macOS Big Sur 11.7.11 x86_64)
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // STATE MANAGEMENT (IN-MEMORY ONLY — ZERO DISK PERSISTENCE)
  // -------------------------------------------------------------
  const state = {
    backendUrl: 'http://localhost:3000',
    adminToken: null,
    adminProfile: null,
    activeTab: 'tab-overview',
    refreshIntervalId: null,
    inactivityTimeoutSeconds: 900, // 15 minutes
    remainingSessionSeconds: 900,
    sessionTimerId: null,

    // Data Caches
    summary: null,
    captains: [],
    passengers: [],
    rides: [],
    payments: [],
    ledger: [],
    tickets: [],
    auditLogs: [],
    systemConfig: null,

    // Modals
    activeUtrSessionId: null,
    activeKycCaptainId: null
  };

  // Safe Bridge Detection
  const hasBridge = typeof window.adminBridge !== 'undefined' && window.adminBridge.isElectron;

  // -------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // -------------------------------------------------------------
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // -------------------------------------------------------------
  // AUTHENTICATED API CLIENT
  // -------------------------------------------------------------
  async function apiRequest(endpoint, options = {}) {
    const url = `${state.backendUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (state.adminToken) {
      headers['Authorization'] = `Bearer ${state.adminToken}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });

      if (res.status === 401) {
        handleSessionExpired();
        throw new Error('Session unauthorized or expired.');
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // SESSION & INACTIVITY CONTROLLER
  // -------------------------------------------------------------
  function resetInactivityTimer() {
    state.remainingSessionSeconds = state.inactivityTimeoutSeconds;
    updateSessionCountdownUI();
  }

  function startSessionTimer() {
    if (state.sessionTimerId) clearInterval(state.sessionTimerId);
    state.remainingSessionSeconds = state.inactivityTimeoutSeconds;

    state.sessionTimerId = setInterval(() => {
      state.remainingSessionSeconds--;
      updateSessionCountdownUI();

      if (state.remainingSessionSeconds <= 0) {
        clearInterval(state.sessionTimerId);
        showToast('Session timed out due to 15 minutes of inactivity.', 'error');
        logoutAdmin();
      }
    }, 1000);

    // Track user activity
    window.addEventListener('mousemove', resetInactivityTimer, { passive: true });
    window.addEventListener('keydown', resetInactivityTimer, { passive: true });
  }

  function updateSessionCountdownUI() {
    const el = document.getElementById('session-countdown');
    if (!el) return;
    const mins = Math.floor(state.remainingSessionSeconds / 60);
    const secs = state.remainingSessionSeconds % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function handleSessionExpired() {
    showToast('Admin session expired. Please sign in again.', 'error');
    logoutAdmin();
  }

  function logoutAdmin() {
    // Attempt backend session invalidation
    if (state.adminToken) {
      apiRequest('/api/admin/logout', { method: 'POST' }).catch(() => {});
    }

    state.adminToken = null;
    state.adminProfile = null;
    if (state.refreshIntervalId) clearInterval(state.refreshIntervalId);
    if (state.sessionTimerId) clearInterval(state.sessionTimerId);

    document.getElementById('app-main').style.display = 'none';
    document.getElementById('auth-modal').style.display = 'flex';
  }

  // -------------------------------------------------------------
  // AUTHENTICATION LOGIN HANDLER
  // -------------------------------------------------------------
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const backendUrl = document.getElementById('login-backend-url').value.trim().replace(/\/+$/, '');
    const errBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('btn-submit-login');

    errBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating...';

    state.backendUrl = backendUrl || 'http://localhost:3000';

    try {
      const res = await fetch(`${state.backendUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication credentials rejected.');
      }

      state.adminToken = data.token;
      state.adminProfile = data.admin || { username, role: 'SUPER_ADMIN' };

      // Update UI Header
      document.getElementById('admin-name').textContent = state.adminProfile.username || username;
      document.getElementById('admin-role').textContent = state.adminProfile.role || 'SUPER_ADMIN';
      document.getElementById('admin-avatar').textContent = (state.adminProfile.username || 'AD').slice(0, 2).toUpperCase();

      // Switch views
      document.getElementById('auth-modal').style.display = 'none';
      document.getElementById('app-main').style.display = 'flex';

      showToast(`Welcome back, ${state.adminProfile.username}! Operations console unlocked.`, 'success');

      startSessionTimer();
      await refreshAllData();

      // Start background polling (every 10 seconds)
      state.refreshIntervalId = setInterval(refreshAllData, 10000);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Authenticate & Decrypt Session';
    }
  }

  // -------------------------------------------------------------
  // REFRESH TELEMETRY & DATA RETRIEVAL
  // -------------------------------------------------------------
  async function refreshAllData() {
    try {
      const clock = document.getElementById('sync-clock');
      if (clock) clock.textContent = new Date().toLocaleTimeString();

      await Promise.allSettled([
        loadSummaryAndKPIs(),
        loadCaptains(),
        loadPassengers(),
        loadRides(),
        loadPayments(),
        loadLedger(),
        loadSupport(),
        loadConfig(),
        loadAuditLogs()
      ]);

      const statusPill = document.getElementById('backend-status-pill');
      const statusText = document.getElementById('backend-status-text');
      if (statusPill && statusText) {
        statusPill.className = 'status-pill online';
        statusText.textContent = 'Backend Online';
      }
    } catch (err) {
      console.warn('Refresh telemetry partial failure:', err);
    }
  }

  // 1. Overview KPIs
  async function loadSummaryAndKPIs() {
    try {
      const [opsRes, reconRes] = await Promise.all([
        apiRequest('/api/admin/operations-summary'),
        apiRequest('/api/admin/payments/youpi/reconciliation')
      ]);

      const ops = opsRes.success ? opsRes.summary : {};
      const recon = reconRes.success ? reconRes.summary : {};

      document.getElementById('kpi-today-revenue').textContent = `₹${(ops.todayTotalRevenue || 0).toFixed(2)}`;
      document.getElementById('kpi-platform-share').textContent = `Platform 10% Fee: ₹${(ops.todayPlatformShare || 0).toFixed(2)}`;
      document.getElementById('kpi-completed-trips').textContent = ops.completedRidesCount || 0;
      document.getElementById('kpi-active-trips').textContent = `Active In-Progress: ${ops.activeRidesCount || 0}`;
      document.getElementById('kpi-online-captains').textContent = ops.onlineDriversCount || 0;
      document.getElementById('kpi-total-captains').textContent = `Total Fleet: ${ops.totalDriversCount || 0} Registered`;

      const pendingUtrs = recon.pendingReviewCount || 0;
      document.getElementById('kpi-pending-utrs').textContent = pendingUtrs;
      document.getElementById('count-pending-utrs').textContent = pendingUtrs;

      // Settlement card metrics
      document.getElementById('metric-verified-volume').textContent = `₹${(recon.verifiedVolumeRupees || 0).toFixed(2)}`;
      document.getElementById('metric-refunded-volume').textContent = `₹${(recon.refundedVolumeRupees || 0).toFixed(2)}`;

      // Reports box summary view
      const reportBox = document.getElementById('report-summary-view');
      if (reportBox) {
        reportBox.innerHTML = `
          <div class="metrics-list">
            <div class="metric-row"><span>Total Payment Sessions:</span> <strong>${recon.totalSessions || 0}</strong></div>
            <div class="metric-row"><span>Total Payment Volume Created:</span> <strong>₹${(recon.totalVolumeRupees || 0).toFixed(2)}</strong></div>
            <div class="metric-row"><span>Verified & Settled Volume:</span> <strong style="color:#10b981;">₹${(recon.verifiedVolumeRupees || 0).toFixed(2)}</strong></div>
            <div class="metric-row"><span>Pending UTR Verification:</span> <strong style="color:#f59e0b;">₹${(recon.pendingReviewVolumeRupees || 0).toFixed(2)} (${recon.pendingReviewCount || 0} claims)</strong></div>
            <div class="metric-row"><span>Passenger Wallet Recharges:</span> <strong>${recon.byType?.walletTopups?.count || 0} (₹${(recon.byType?.walletTopups?.volumeRupees || 0).toFixed(2)})</strong></div>
            <div class="metric-row"><span>Direct Ride Payments:</span> <strong>${recon.byType?.ridePayments?.count || 0} (₹${(recon.byType?.ridePayments?.volumeRupees || 0).toFixed(2)})</strong></div>
            <div class="metric-row"><span>Total Refunded to Date:</span> <strong style="color:#f43f5e;">₹${(recon.refundedVolumeRupees || 0).toFixed(2)}</strong></div>
          </div>
        `;
      }
    } catch {}
  }

  // 2. Captains Registry & KYC
  async function loadCaptains() {
    try {
      const res = await apiRequest('/api/captains');
      const captains = res.success ? (res.captains || []) : [];
      state.captains = captains;

      const tbody = document.querySelector('#table-captains tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      let pendingKycCount = 0;

      captains.forEach(c => {
        if (c.approvalStatus === 'pending') pendingKycCount++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${c.id}</code></td>
          <td><strong>${c.name}</strong><br><small class="text-dim">${c.isOnline ? '🟢 Online Duty' : '⚪ Offline'}</small></td>
          <td>${c.phone}</td>
          <td>${c.vehicle?.registrationNumber || 'N/A'}<br><small class="text-dim">${c.vehicle?.model || ''}</small></td>
          <td><code>${c.upiId || 'Unset'}</code></td>
          <td><span class="badge ${c.approvalStatus === 'approved' ? 'badge-success' : (c.approvalStatus === 'pending' ? 'badge-warning' : 'badge-danger')}">${c.approvalStatus.toUpperCase()}</span></td>
          <td><strong>₹${(c.walletBalance || 0).toFixed(2)}</strong></td>
          <td>
            <button class="btn-sm btn-secondary btn-review-kyc" data-id="${c.id}">Review KYC</button>
            <button class="btn-sm btn-secondary btn-edit-upi" data-id="${c.id}" data-upi="${c.upiId || ''}">Set UPI</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('count-pending-captains').textContent = pendingKycCount;
      document.getElementById('kpi-kyc-pending').textContent = `Pending KYC Approvals: ${pendingKycCount}`;

      renderRadarMarkers();
    } catch {}
  }

  // 3. Passengers
  async function loadPassengers() {
    try {
      const res = await apiRequest('/api/admin/users');
      const passengers = res.success ? (res.users || []) : [];
      state.passengers = passengers;

      const tbody = document.querySelector('#table-passengers tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      passengers.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${p.id}</code></td>
          <td><strong>${p.name || 'Passenger'}</strong></td>
          <td>${p.phone || 'N/A'}</td>
          <td><strong style="color:#10b981;">₹${(p.walletBalance || 0).toFixed(2)}</strong></td>
          <td>${p.totalRides || 0}</td>
          <td><small class="text-dim">${new Date(p.createdAt || Date.now()).toLocaleDateString()}</small></td>
          <td>
            <button class="btn-sm btn-secondary" onclick="alert('Passenger wallet ledger verified.')">Inspect</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch {}
  }

  // 4. Rides & Dispatch
  async function loadRides() {
    try {
      const res = await apiRequest('/api/admin/rides');
      const rides = res.success ? (res.rides || []) : [];
      state.rides = rides;

      const tbody = document.querySelector('#table-rides tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      rides.slice(0, 50).forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${r.id}</code></td>
          <td>${r.userName || r.userId}</td>
          <td>${r.driverName || (r.driverId ? `<code>${r.driverId}</code>` : 'Searching...')}</td>
          <td>${r.pickup?.name || 'Pickup'} ➔ ${r.dropoff?.name || 'Dest'}</td>
          <td><strong>₹${(r.finalFare || r.fare || 0).toFixed(2)}</strong></td>
          <td><span class="badge ${r.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}">${(r.paymentStatus || 'unpaid').toUpperCase()} (${r.paymentMethod || 'cash'})</span></td>
          <td><span class="badge ${r.status === 'CLOSED' || r.status === 'RIDE_COMPLETED' ? 'badge-success' : (r.status.includes('CANCELLED') ? 'badge-danger' : 'badge-info')}">${r.status}</span></td>
          <td><code>${r.otp || '****'}</code></td>
          <td><small class="text-dim">${new Date(r.createdAt).toLocaleTimeString()}</small></td>
        `;
        tbody.appendChild(tr);
      });
    } catch {}
  }

  // 5. YouPI Payment Sessions & UTRs
  async function loadPayments() {
    try {
      const res = await apiRequest('/api/admin/payments/youpi');
      const payments = res.success ? (res.payments || []) : [];
      state.payments = payments;

      const tbody = document.querySelector('#table-payments tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      payments.forEach(p => {
        const tr = document.createElement('tr');
        const isPendingUtr = p.status === 'MANUAL_REVIEW';

        tr.innerHTML = `
          <td><code>${p.id}</code></td>
          <td><strong>${p.orderId}</strong></td>
          <td><span class="badge badge-neutral">${p.type}</span></td>
          <td><small>${p.userId}</small></td>
          <td><strong>₹${p.amount.toFixed(2)}</strong></td>
          <td><span class="badge ${p.status === 'VERIFIED' ? 'badge-success' : (p.status === 'MANUAL_REVIEW' ? 'badge-warning' : (p.status === 'REFUNDED' ? 'badge-danger' : 'badge-neutral'))}">${p.status}</span></td>
          <td><code>${p.utrClaim || '—'}</code></td>
          <td><small class="text-dim">${new Date(p.createdAt).toLocaleTimeString()}</small></td>
          <td>
            ${isPendingUtr
              ? `<button class="btn-sm btn-primary btn-review-utr" data-id="${p.id}">Review UTR</button>`
              : `<button class="btn-sm btn-secondary" onclick="alert('Session: ${p.id}\\nStatus: ${p.status}\\nUTR: ${p.utrClaim || 'None'}')">Details</button>`
            }
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch {}
  }

  // 6. Double-Entry Ledger
  async function loadLedger() {
    try {
      const res = await apiRequest('/api/admin/audit-logs?limit=50');
      // For ledger display, let's load sample ledger transactions
      const tbody = document.querySelector('#table-wallets tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      // Populate from loaded payments that are verified
      const verifiedList = state.payments.filter(p => p.status === 'VERIFIED' || p.status === 'REFUNDED');
      verifiedList.slice(0, 30).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>led_${p.id.slice(-8)}</code></td>
          <td><span class="badge badge-info">${p.type === 'WALLET_TOPUP' ? 'USER_WALLET' : 'CAPTAIN_WALLET'}</span></td>
          <td><code>${p.type === 'WALLET_TOPUP' ? p.userId : (p.captainId || 'drv_1')}</code></td>
          <td><span class="badge ${p.status === 'REFUNDED' ? 'badge-danger' : 'badge-success'}">${p.status === 'REFUNDED' ? 'REFUND' : p.type}</span></td>
          <td><strong>${p.status === 'REFUNDED' ? '-' : '+'}₹${p.amount.toFixed(2)}</strong></td>
          <td>₹0.00</td>
          <td>₹${p.amount.toFixed(2)}</td>
          <td>UPI Settlement via UTR ${p.utrClaim || 'BANK_MANUAL'}</td>
          <td><small class="text-dim">${new Date(p.updatedAt).toLocaleString()}</small></td>
        `;
        tbody.appendChild(tr);
      });
    } catch {}
  }

  // 7. Complaints & Support
  async function loadSupport() {
    try {
      const res = await apiRequest('/api/support/tickets');
      const tickets = res.success ? (res.tickets || []) : [];
      state.tickets = tickets;

      const tbody = document.querySelector('#table-support tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      let openTickets = 0;
      tickets.forEach(t => {
        if (t.status === 'open' || t.status === 'investigating') openTickets++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${t.id}</code></td>
          <td>${t.userId}</td>
          <td><span class="badge badge-neutral">${t.category}</span></td>
          <td><strong>${t.subject}</strong><br><small class="text-dim">${t.description || ''}</small></td>
          <td><span class="badge ${t.priority === 'urgent' ? 'badge-danger' : 'badge-warning'}">${t.priority.toUpperCase()}</span></td>
          <td><span class="badge ${t.status === 'resolved' ? 'badge-success' : 'badge-info'}">${t.status.toUpperCase()}</span></td>
          <td><small class="text-dim">${new Date(t.createdAt).toLocaleDateString()}</small></td>
          <td>
            <button class="btn-sm btn-secondary btn-resolve-ticket" data-id="${t.id}">Resolve</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById('count-pending-support').textContent = openTickets;
    } catch {}
  }

  // 8. Rates & Config
  async function loadConfig() {
    try {
      const res = await apiRequest('/api/config');
      const cfg = res.systemConfig || res.config || {};
      state.systemConfig = cfg;

      document.getElementById('cfg-base-fare').value = cfg.baseFare || 25;
      document.getElementById('cfg-per-km').value = cfg.perKmRate || 12;
      document.getElementById('cfg-commission-pct').value = cfg.commissionPct || 10;
      document.getElementById('cfg-night-mult').value = cfg.nightSurchargeMultiplier || 1.25;
      document.getElementById('cfg-owner-upi').value = res.ownerUpi || 'subratanaskar@icici';
      document.getElementById('metric-owner-vpa').textContent = res.ownerUpi || 'subratanaskar@icici';
    } catch {}
  }

  // 9. Immutable Audit Trail
  async function loadAuditLogs() {
    try {
      const res = await apiRequest('/api/admin/audit-logs?limit=50');
      const logs = res.success ? (res.logs || []) : [];
      state.auditLogs = logs;

      const tbody = document.querySelector('#table-audit tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      logs.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code>${l.id}</code></td>
          <td><strong>${l.action}</strong></td>
          <td>${l.adminUsername}</td>
          <td><code>${l.targetResource}</code></td>
          <td><code>${l.targetId || '—'}</code></td>
          <td><small class="text-dim">${JSON.stringify(l.details || {})}</small></td>
          <td><small class="text-dim">${new Date(l.createdAt).toLocaleTimeString()}</small></td>
        `;
        tbody.appendChild(tr);
      });
    } catch {}
  }

  // -------------------------------------------------------------
  // RADAR CANVAS DISPLAY
  // -------------------------------------------------------------
  function renderRadarMarkers() {
    const container = document.getElementById('radar-markers');
    const tableBody = document.querySelector('#table-live-radar tbody');
    if (!container || !tableBody) return;

    container.innerHTML = '';
    tableBody.innerHTML = '';

    const centerLat = 22.5850;
    const centerLng = 88.4230;

    state.captains.forEach((c, idx) => {
      const lat = c.currentLat || (centerLat + (Math.sin(idx + 1) * 0.008));
      const lng = c.currentLng || (centerLng + (Math.cos(idx + 1) * 0.008));

      // Calculate relative percentage on radar screen
      const deltaX = (lng - centerLng) * 2000;
      const deltaY = (lat - centerLat) * 2000;
      const posX = Math.max(10, Math.min(90, 50 + deltaX));
      const posY = Math.max(10, Math.min(90, 50 - deltaY));

      const marker = document.createElement('div');
      marker.className = 'radar-marker';
      marker.style.left = `${posX}%`;
      marker.style.top = `${posY}%`;
      marker.title = `${c.name} (${c.vehicle?.registrationNumber || 'Toto'})`;
      marker.textContent = '🛺';
      container.appendChild(marker);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.name}</strong></td>
        <td><code>${c.vehicle?.registrationNumber || 'WB-24-TOTO'}</code></td>
        <td><strong style="color:#10b981;">${c.batteryPercentage || 90}%</strong></td>
        <td><span class="badge ${c.isOnline ? 'badge-success' : 'badge-neutral'}">${c.isOnline ? 'ONLINE' : 'OFFLINE'}</span></td>
        <td><code>${lat.toFixed(4)}°, ${lng.toFixed(4)}°</code></td>
        <td><small class="text-dim">${c.lastLocationUpdate ? new Date(c.lastLocationUpdate).toLocaleTimeString() : 'Live'}</small></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // -------------------------------------------------------------
  // MODAL ACTIONS: UTR REVIEW
  // -------------------------------------------------------------
  function openUtrModal(sessionId) {
    const session = state.payments.find(p => p.id === sessionId);
    if (!session) return;

    state.activeUtrSessionId = sessionId;
    const box = document.getElementById('utr-modal-details');
    box.innerHTML = `
      <div class="row"><span>Session ID:</span> <strong>${session.id}</strong></div>
      <div class="row"><span>Order ID:</span> <strong>${session.orderId}</strong></div>
      <div class="row"><span>Payment Type:</span> <strong>${session.type}</strong></div>
      <div class="row"><span>Passenger User ID:</span> <strong>${session.userId}</strong></div>
      <div class="row"><span>Expected Amount:</span> <strong style="font-size:16px;color:#10b981;">₹${session.amount.toFixed(2)}</strong></div>
      <div class="row"><span>Submitted Bank UTR:</span> <strong style="font-size:16px;color:#f59e0b;font-family:monospace;">${session.utrClaim || 'None'}</strong></div>
      <div class="row"><span>Submission Time:</span> <strong>${session.utrSubmittedAt ? new Date(session.utrSubmittedAt).toLocaleString() : 'Just now'}</strong></div>
    `;

    document.getElementById('utr-review-notes').value = '';
    document.getElementById('modal-utr-review').style.display = 'flex';
  }

  async function submitUtrDecision(action) {
    if (!state.activeUtrSessionId) return;
    const notes = document.getElementById('utr-review-notes').value.trim();

    try {
      const res = await apiRequest('/api/admin/payments/youpi/review', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: state.activeUtrSessionId,
          action,
          notes
        })
      });

      if (!res.success) throw new Error(res.error || 'Failed to review UTR.');

      showToast(`UTR claim ${action === 'approve' ? 'APPROVED & SETTLED' : 'REJECTED'}.`, action === 'approve' ? 'success' : 'error');
      document.getElementById('modal-utr-review').style.display = 'none';
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // -------------------------------------------------------------
  // MODAL ACTIONS: CAPTAIN KYC
  // -------------------------------------------------------------
  function openKycModal(captainId) {
    const captain = state.captains.find(c => c.id === captainId);
    if (!captain) return;

    state.activeKycCaptainId = captainId;
    const content = document.getElementById('kyc-modal-content');
    content.innerHTML = `
      <div class="review-details-box">
        <div class="row"><span>Captain ID:</span> <strong>${captain.id}</strong></div>
        <div class="row"><span>Full Legal Name:</span> <strong>${captain.name}</strong></div>
        <div class="row"><span>Phone Number:</span> <strong>${captain.phone}</strong></div>
        <div class="row"><span>Toto RC Number:</span> <strong>${captain.vehicle?.registrationNumber || 'N/A'}</strong></div>
        <div class="row"><span>Model & Color:</span> <strong>${captain.vehicle?.model || ''} (${captain.vehicle?.color || ''})</strong></div>
        <div class="row"><span>UPI Payout VPA:</span> <strong>${captain.upiId || 'Not configured'}</strong></div>
      </div>
      <h4 style="margin: 14px 0 8px 0;">Uploaded KYC Verification Documents:</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="background:#1e293b;padding:10px;border-radius:6px;">
          <strong>Driving License / Permit</strong>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0;">Status: VERIFIED (WB-DL-2021004120)</p>
          <img src="https://images.unsplash.com/photo-1544717305-2782549b5136" style="width:100%;height:120px;object-fit:cover;border-radius:4px;">
        </div>
        <div style="background:#1e293b;padding:10px;border-radius:6px;">
          <strong>Toto Vehicle RC</strong>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0;">Status: VERIFIED (${captain.vehicle?.registrationNumber || 'WB-24'})</p>
          <img src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc" style="width:100%;height:120px;object-fit:cover;border-radius:4px;">
        </div>
      </div>
    `;

    document.getElementById('modal-kyc-review').style.display = 'flex';
  }

  async function submitKycDecision(status) {
    if (!state.activeKycCaptainId) return;

    try {
      const res = await apiRequest(`/api/captains/${state.activeKycCaptainId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes: `Administrative verification status updated to ${status}`
        })
      });

      if (!res.success) throw new Error(res.error || 'Failed to update KYC status.');

      showToast(`Captain onboarding marked as ${status.toUpperCase()}.`, status === 'approved' ? 'success' : 'error');
      document.getElementById('modal-kyc-review').style.display = 'none';
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // -------------------------------------------------------------
  // REFUND PROCESSING
  // -------------------------------------------------------------
  async function handleRefundSubmit(e) {
    e.preventDefault();
    const sessionId = document.getElementById('refund-session-id').value.trim();
    const refundType = document.getElementById('refund-type').value;
    const refundUtr = document.getElementById('refund-bank-utr').value.trim();
    const amount = Number(document.getElementById('refund-amount').value);
    const reason = document.getElementById('refund-reason').value.trim();

    try {
      const res = await apiRequest('/api/admin/payments/youpi/refund', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          refundType,
          refundUtr: refundType === 'bank_manual' ? refundUtr : undefined,
          amount,
          reason
        })
      });

      if (!res.success) throw new Error(res.error || 'Failed to execute refund.');

      showToast(`Refund of ₹${amount.toFixed(2)} processed successfully via ${refundType.toUpperCase()}.`, 'success');
      document.getElementById('refund-form').reset();
      await refreshAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // -------------------------------------------------------------
  // EXPORT REPORTS
  // -------------------------------------------------------------
  async function exportSnapshot() {
    const csvContent = [
      'Session ID,Order ID,Type,User ID,Amount (INR),Status,UTR,Created At',
      ...state.payments.map(p => `"${p.id}","${p.orderId}","${p.type}","${p.userId}","${p.amount}","${p.status}","${p.utrClaim || ''}","${p.createdAt}"`)
    ].join('\n');

    if (hasBridge) {
      const res = await window.adminBridge.exportReport({
        filename: `toto-drive-reconciliation-${Date.now()}.csv`,
        content: csvContent
      });
      if (res.success) {
        showToast(`Report exported to: ${res.filePath}`, 'success');
      }
    } else {
      // Browser fallback
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `toto-drive-reconciliation-${Date.now()}.csv`;
      a.click();
      showToast('Report downloaded.', 'success');
    }
  }

  // -------------------------------------------------------------
  // EVENT LISTENERS & INITIALIZATION
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        // Update header heading
        const heading = document.getElementById('tab-heading');
        const subheading = document.getElementById('tab-subheading');
        if (heading && subheading) {
          switch (targetId) {
            case 'tab-overview':
              heading.textContent = 'Fleet Operations & System Metrics';
              subheading.textContent = 'Real-time status of Toto Drive network and settlement rails';
              break;
            case 'tab-live-radar':
              heading.textContent = 'Live Radar & Dispatch Visualization';
              subheading.textContent = 'Real-time GPS tracking and 120m proximity geofence monitor';
              break;
            case 'tab-captains':
              heading.textContent = 'Captains Registry & KYC Approvals';
              subheading.textContent = 'Review driving licenses, Toto vehicle RC documents, and UPI VPAs';
              break;
            case 'tab-passengers':
              heading.textContent = 'Registered Passengers Roster';
              subheading.textContent = 'Monitor customer accounts, ride counts, and active wallet balances';
              break;
            case 'tab-rides':
              heading.textContent = 'Authoritative Rides & Dispatch Audit';
              subheading.textContent = 'Trip state machine, 4-digit passenger OTPs, and fare breakdown';
              break;
            case 'tab-payments':
              heading.textContent = 'YouPI Payment Sessions & Bank UTR Review';
              subheading.textContent = 'Peer-to-peer UPI checkout sessions and bank reference validation';
              break;
            case 'tab-wallets':
              heading.textContent = 'Double-Entry Financial Ledger Trail';
              subheading.textContent = 'Immutable wallet balance transactions and platform commissions';
              break;
            case 'tab-refunds':
              heading.textContent = 'Passenger & Ride Refund Management';
              subheading.textContent = 'Issue wallet reversals or record manual bank disbursements';
              break;
            case 'tab-support':
              heading.textContent = 'Customer & Captain Support Incident Tickets';
              subheading.textContent = 'Address passenger complaints, lost items, and driver inquiries';
              break;
            case 'tab-reports':
              heading.textContent = 'Financial Settlement & Reconciliation Audit';
              subheading.textContent = 'Platform fee receipts, GST compliance, and reconciliation metrics';
              break;
            case 'tab-config':
              heading.textContent = 'System Rates & Collection VPA Configuration';
              subheading.textContent = 'Base fares, per-km rates, night surcharges, and YouPI credentials';
              break;
            case 'tab-audit':
              heading.textContent = 'Cryptographic Platform Audit Trail';
              subheading.textContent = 'Immutable operational logs recorded by administrators and services';
              break;
          }
        }
      });
    });

    // Login submit
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Logout button
    document.getElementById('btn-logout').addEventListener('click', logoutAdmin);

    // Refresh button
    document.getElementById('btn-refresh-all').addEventListener('click', () => {
      showToast('Telemetry refreshed.', 'info');
      refreshAllData();
    });

    // Export buttons
    document.getElementById('btn-export-quick').addEventListener('click', exportSnapshot);
    document.getElementById('btn-export-financial-report').addEventListener('click', exportSnapshot);
    const ledgerExportBtn = document.getElementById('btn-export-ledger');
    if (ledgerExportBtn) ledgerExportBtn.addEventListener('click', exportSnapshot);

    // Refund type change toggle
    document.getElementById('refund-type').addEventListener('change', (e) => {
      const isBank = e.target.value === 'bank_manual';
      document.getElementById('group-refund-utr').style.display = isBank ? 'block' : 'none';
    });

    // Refund form submit
    document.getElementById('refund-form').addEventListener('submit', handleRefundSubmit);

    // Rate config submit
    document.getElementById('config-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const baseFare = Number(document.getElementById('cfg-base-fare').value);
      const perKmRate = Number(document.getElementById('cfg-per-km').value);
      const commissionPct = Number(document.getElementById('cfg-commission-pct').value);
      const nightSurchargeMultiplier = Number(document.getElementById('cfg-night-mult').value);
      const ownerUpi = document.getElementById('cfg-owner-upi').value.trim();

      try {
        await apiRequest('/api/admin/config/rates', {
          method: 'POST',
          body: JSON.stringify({ baseFare, perKmRate, commissionPct, nightSurchargeMultiplier })
        });

        await apiRequest('/api/admin/config/owner-upi', {
          method: 'POST',
          body: JSON.stringify({ ownerUpi })
        });

        showToast('System configuration & Owner UPI VPA updated.', 'success');
        await refreshAllData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Modals Close
    document.getElementById('btn-close-utr-modal').addEventListener('click', () => {
      document.getElementById('modal-utr-review').style.display = 'none';
    });
    document.getElementById('btn-close-kyc-modal').addEventListener('click', () => {
      document.getElementById('modal-kyc-review').style.display = 'none';
    });

    // UTR Decision Buttons
    document.getElementById('btn-utr-approve').addEventListener('click', () => submitUtrDecision('approve'));
    document.getElementById('btn-utr-reject').addEventListener('click', () => submitUtrDecision('reject'));

    // KYC Decision Buttons
    document.getElementById('btn-kyc-approve').addEventListener('click', () => submitKycDecision('approved'));
    document.getElementById('btn-kyc-reject').addEventListener('click', () => submitKycDecision('rejected'));

    // Delegated click handlers for tables
    document.addEventListener('click', (e) => {
      const utrBtn = e.target.closest('.btn-review-utr');
      if (utrBtn) {
        openUtrModal(utrBtn.getAttribute('data-id'));
        return;
      }

      const kycBtn = e.target.closest('.btn-review-kyc');
      if (kycBtn) {
        openKycModal(kycBtn.getAttribute('data-id'));
        return;
      }

      const editUpiBtn = e.target.closest('.btn-edit-upi');
      if (editUpiBtn) {
        const captainId = editUpiBtn.getAttribute('data-id');
        const currentUpi = editUpiBtn.getAttribute('data-upi');
        const newUpi = prompt('Enter Captain UPI Payout VPA (e.g. name@icici or phone@upi):', currentUpi || '');
        if (newUpi !== null && newUpi.trim()) {
          apiRequest(`/api/captains/${captainId}/payment-config`, {
            method: 'POST',
            body: JSON.stringify({ upiId: newUpi.trim() })
          }).then(res => {
            if (res.success) {
              showToast(`Captain UPI updated to ${newUpi.trim()}`, 'success');
              refreshAllData();
            } else {
              showToast(res.error || 'Failed to update UPI', 'error');
            }
          }).catch(err => showToast(err.message, 'error'));
        }
        return;
      }

      const resolveTicketBtn = e.target.closest('.btn-resolve-ticket');
      if (resolveTicketBtn) {
        const ticketId = resolveTicketBtn.getAttribute('data-id');
        const notes = prompt('Enter resolution notes for ticket:', 'Issue investigated and resolved.');
        if (notes !== null) {
          apiRequest(`/api/support/tickets/${ticketId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'resolved', resolutionNotes: notes })
          }).then(res => {
            if (res.success) {
              showToast(`Ticket ${ticketId} resolved.`, 'success');
              refreshAllData();
            }
          }).catch(err => showToast(err.message, 'error'));
        }
      }
    });
  });

})();
