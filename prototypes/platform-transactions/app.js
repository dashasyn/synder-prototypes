// === Mutable data stores ===
let activeTxns = [...TRANSACTIONS];
let archivedTxns = [...ARCHIVED_TRANSACTIONS];

// === Position fixed dropdowns to avoid clipping ===
function positionDropdown(trigger, dropdown) {
  const rect = trigger.getBoundingClientRect();
  const dropW = dropdown.offsetWidth || 200;
  let left = rect.right - dropW;
  if (left < 0) left = rect.left;
  dropdown.style.top = (rect.bottom + 4) + 'px';
  dropdown.style.left = left + 'px';
}

// === Current view state ===
function isArchivedView() {
  return document.getElementById('toggleArchived').checked;
}

function getCurrentData() {
  return isArchivedView() ? archivedTxns : activeTxns;
}

function getTotalCount() {
  return activeTxns.length + archivedTxns.length;
}

// === Archive / Unarchive actions ===
function archiveTransaction(txId) {
  const idx = activeTxns.findIndex(tx => tx.id === txId);
  if (idx === -1) return;
  const [tx] = activeTxns.splice(idx, 1);
  archivedTxns.unshift(tx); // add to top of archived
  showToast(`Transaction archived`);
  refreshView();
}

function unarchiveTransaction(txId) {
  const idx = archivedTxns.findIndex(tx => tx.id === txId);
  if (idx === -1) return;
  const [tx] = archivedTxns.splice(idx, 1);
  activeTxns.unshift(tx); // add to top of active
  showToast(`Transaction unarchived`);
  refreshView();
}

function bulkArchive() {
  const checked = document.querySelectorAll('.row-cb:checked');
  const ids = Array.from(checked).map(cb => cb.closest('tr').dataset.id);
  ids.forEach(id => {
    const idx = activeTxns.findIndex(tx => tx.id === id);
    if (idx !== -1) {
      const [tx] = activeTxns.splice(idx, 1);
      archivedTxns.unshift(tx);
    }
  });
  if (ids.length) {
    showToast(`${ids.length} transaction${ids.length > 1 ? 's' : ''} archived`);
    refreshView();
  }
}

function bulkUnarchive() {
  const checked = document.querySelectorAll('.row-cb:checked');
  const ids = Array.from(checked).map(cb => cb.closest('tr').dataset.id);
  ids.forEach(id => {
    const idx = archivedTxns.findIndex(tx => tx.id === id);
    if (idx !== -1) {
      const [tx] = archivedTxns.splice(idx, 1);
      activeTxns.unshift(tx);
    }
  });
  if (ids.length) {
    showToast(`${ids.length} transaction${ids.length > 1 ? 's' : ''} unarchived`);
    refreshView();
  }
}

// === Toast notification ===
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:6px;font-size:13px;z-index:9999;opacity:0;transition:opacity 0.3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// === Refresh current view ===
function refreshView() {
  if (isArchivedView()) {
    applyViewFilters();
  } else {
    applyFilters();
  }
}

// === Render transactions table ===
function renderTable(data, archived) {
  const tbody = document.getElementById('txBody');
  tbody.innerHTML = '';

  data.forEach(tx => {
    const tr = document.createElement('tr');
    tr.dataset.id = tx.id;

    const statusMap = {
      synced: { label: 'Synced', cls: 'status-synced' },
      ready: { label: 'Ready to Sync', cls: 'status-ready' },
      pending: { label: 'Pending', cls: 'status-pending' },
      cancelled: { label: 'Cancelled', cls: 'status-cancelled' },
      failed: { label: 'Failed', cls: 'status-failed' },
    };
    const st = statusMap[tx.status] || statusMap.pending;

    const customerHtml = tx.customer
      ? `<span class="tx-customer">${tx.customer}</span>`
      : '';

    const explainHtml = tx.status === 'synced'
      ? `<a href="#" class="explain-link">Explain</a>`
      : '';

    // Per-row action menu items depend on status
    let rowMenuItems = '';
    if (tx.status === 'synced') {
      rowMenuItems = `
        <a href="#" class="dropdown-item"><span class="menu-icon">↻</span> Sync</a>
        <a href="#" class="dropdown-item"><span class="menu-icon">ℹ</span> Show sync info</a>
        <a href="#" class="dropdown-item"><span class="menu-icon">↺</span> Rollback</a>
        <a href="#" class="dropdown-item row-archive-btn" data-tx-id="${tx.id}"><span class="menu-icon">📦</span> Archive</a>
      `;
    } else if (tx.status === 'ready') {
      rowMenuItems = `
        <a href="#" class="dropdown-item"><span class="menu-icon">↻</span> Sync</a>
        <a href="#" class="dropdown-item disabled"><span class="menu-icon">ℹ</span> Show sync info</a>
        <a href="#" class="dropdown-item disabled"><span class="menu-icon">↺</span> Rollback</a>
        <a href="#" class="dropdown-item row-archive-btn" data-tx-id="${tx.id}"><span class="menu-icon">📦</span> Archive</a>
      `;
    } else {
      rowMenuItems = `
        <a href="#" class="dropdown-item"><span class="menu-icon">↻</span> Sync</a>
        <a href="#" class="dropdown-item disabled"><span class="menu-icon">ℹ</span> Show sync info</a>
        <a href="#" class="dropdown-item disabled"><span class="menu-icon">↺</span> Rollback</a>
        <a href="#" class="dropdown-item row-archive-btn" data-tx-id="${tx.id}"><span class="menu-icon">📦</span> Archive</a>
      `;
    }

    tr.innerHTML = `
      <td class="col-checkbox"><input type="checkbox" class="checkbox row-cb"></td>
      <td class="col-info">
        ${customerHtml}
        <a href="#" class="tx-id">${tx.id}</a>
      </td>
      <td class="col-type"><span class="tx-type">${tx.type}</span></td>
      <td class="col-amount"><span class="tx-amount">${tx.amount} ${tx.currency}</span></td>
      <td class="col-date"><span class="tx-date">${tx.date}</span></td>
      <td class="col-status">
        <span class="status-badge ${st.cls}">${st.label}</span>
        ${explainHtml}
      </td>
      <td class="col-action">
        ${archived ? `
          <button class="unarchive-btn" title="Unarchive" data-tx-id="${tx.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><rect x="2" y="3" width="20" height="4" rx="1"/><path d="M4 7v13a2 2 0 002 2h12a2 2 0 002-2V7"/><path d="M10 12h4"/></svg>
          </button>
        ` : `
          <div class="btn-group row-menu">
            <button class="dots-btn row-dots-btn">⋯</button>
            <div class="dropdown-menu row-dropdown">
              ${rowMenuItems}
            </div>
          </div>
        `}
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateSelectionState();
}

// === Checkbox logic ===
document.getElementById('selectAll').addEventListener('change', function () {
  const cbs = document.querySelectorAll('.row-cb');
  cbs.forEach(cb => {
    cb.checked = this.checked;
    cb.closest('tr').classList.toggle('selected', this.checked);
  });
  updateSelectionState();
});

document.getElementById('txBody').addEventListener('change', function (e) {
  if (e.target.classList.contains('row-cb')) {
    e.target.closest('tr').classList.toggle('selected', e.target.checked);
    const allCbs = document.querySelectorAll('.row-cb');
    const allChecked = Array.from(allCbs).every(cb => cb.checked);
    document.getElementById('selectAll').checked = allChecked;
    document.getElementById('selectAll').indeterminate = !allChecked && Array.from(allCbs).some(cb => cb.checked);
    updateSelectionState();
  }
});

// "Select all transactions" button
document.getElementById('selectAllBtn').addEventListener('click', function () {
  const cbs = document.querySelectorAll('.row-cb');
  const allChecked = Array.from(cbs).every(cb => cb.checked);
  cbs.forEach(cb => {
    cb.checked = !allChecked;
    cb.closest('tr').classList.toggle('selected', !allChecked);
  });
  document.getElementById('selectAll').checked = !allChecked;
  document.getElementById('selectAll').indeterminate = false;
  updateSelectionState();
});

function updateSelectionState() {
  const checked = document.querySelectorAll('.row-cb:checked').length;
  const actionsBtn = document.getElementById('actionsBtn');
  const selCount = document.getElementById('selectionCount');
  
  actionsBtn.innerHTML = 'Actions <svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="#fff" stroke-width="1.5" fill="none"/></svg>';
  
  if (checked > 0) {
    selCount.textContent = `Txns selected: ${checked}`;
    selCount.style.display = 'inline';
  } else {
    selCount.style.display = 'none';
  }

  // Update bulk action enabled/disabled states based on current view
  updateBulkActionStates();
}

function updateBulkActionStates() {
  const archived = isArchivedView();
  const syncBtn = document.getElementById('bulkSyncBtn');
  const rollbackBtn = document.getElementById('bulkRollbackBtn');
  const cancelBtn = document.getElementById('bulkCancelBtn');
  const archiveBtn = document.getElementById('bulkArchiveBtn');
  const unarchiveBtn = document.getElementById('bulkUnarchiveBtn');

  if (archived) {
    // In archived view: only Unarchive + exports enabled
    syncBtn.classList.add('disabled');
    rollbackBtn.classList.add('disabled');
    cancelBtn.classList.add('disabled');
    archiveBtn.classList.add('disabled');
    unarchiveBtn.classList.remove('disabled');
  } else {
    // In normal view: Archive enabled, Unarchive disabled
    syncBtn.classList.remove('disabled');
    rollbackBtn.classList.remove('disabled');
    cancelBtn.classList.remove('disabled');
    archiveBtn.classList.remove('disabled');
    unarchiveBtn.classList.add('disabled');
  }
}

// === Dropdown menus + action handlers ===
document.addEventListener('click', function (e) {
  const clickedGroup = e.target.closest('.btn-group');

  // Close all dropdowns that aren't the one being clicked
  document.querySelectorAll('.btn-group.open').forEach(g => {
    if (g !== clickedGroup) g.classList.remove('open');
  });

  // --- Archive button in per-row menu ---
  if (e.target.closest('.row-archive-btn')) {
    e.preventDefault();
    const txId = e.target.closest('.row-archive-btn').dataset.txId;
    document.querySelectorAll('.btn-group.open').forEach(g => g.classList.remove('open'));
    archiveTransaction(txId);
    return;
  }

  // --- Unarchive button ---
  if (e.target.closest('.unarchive-btn')) {
    e.preventDefault();
    const txId = e.target.closest('.unarchive-btn').dataset.txId;
    unarchiveTransaction(txId);
    return;
  }

  // --- Bulk Archive/Unarchive from Actions dropdown ---
  if (e.target.closest('#bulkArchiveBtn')) {
    e.preventDefault();
    document.querySelectorAll('.btn-group.open').forEach(g => g.classList.remove('open'));
    bulkArchive();
    return;
  }
  if (e.target.closest('#bulkUnarchiveBtn')) {
    e.preventDefault();
    document.querySelectorAll('.btn-group.open').forEach(g => g.classList.remove('open'));
    bulkUnarchive();
    return;
  }

  // Toggle Actions dropdown
  if (e.target.closest('#actionsBtn')) {
    e.stopPropagation();
    updateBulkActionStates();
    clickedGroup.classList.toggle('open');
    return;
  }

  // Toggle per-row dropdown
  if (e.target.closest('.row-dots-btn')) {
    e.stopPropagation();
    const isOpen = clickedGroup.classList.toggle('open');
    if (isOpen) positionDropdown(e.target.closest('.row-dots-btn'), clickedGroup.querySelector('.row-dropdown'));
    return;
  }

  // Toggle header column dots menu
  if (e.target.closest('.header-dots')) {
    e.stopPropagation();
    const isOpen = clickedGroup.classList.toggle('open');
    if (isOpen) positionDropdown(e.target.closest('.header-dots'), clickedGroup.querySelector('.header-dropdown'));
    return;
  }

  // Handle header menu actions
  if (e.target.closest('[data-col-action]')) {
    e.preventDefault();
    const item = e.target.closest('[data-col-action]');
    const action = item.dataset.colAction;

    if (action === 'toggle-archived') {
      const cb = document.getElementById('toggleArchived');
      cb.checked = !cb.checked;
      applyViewFilters();
    } else if (action === 'toggle-subscription') {
      const cb = document.getElementById('toggleSubscription');
      cb.checked = !cb.checked;
      applyViewFilters();
    } else {
      document.querySelectorAll('.btn-group.open').forEach(g => g.classList.remove('open'));
    }
    return;
  }
});

// === Filters ===
document.getElementById('filterType').addEventListener('change', applyFilters);
document.getElementById('filterStatus').addEventListener('change', applyFilters);

function applyFilters() {
  if (isArchivedView()) { applyViewFilters(); return; }

  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;

  let filtered = activeTxns;

  if (typeFilter !== 'All types') {
    filtered = filtered.filter(tx => tx.type === typeFilter);
  }

  const statusMap = {
    'Synced': 'synced',
    'Ready to Sync': 'ready',
    'Pending': 'pending',
    'Cancelled': 'cancelled',
    'Failed': 'failed',
  };
  if (statusFilter !== 'All statuses' && statusMap[statusFilter]) {
    filtered = filtered.filter(tx => tx.status === statusMap[statusFilter]);
  }

  renderTable(filtered);
  updatePagination(filtered.length);
}

// Reset filters button
document.getElementById('resetFiltersBtn').addEventListener('click', function () {
  document.getElementById('filterType').value = 'All types';
  document.getElementById('filterStatus').value = 'All statuses';
  document.getElementById('searchInput').value = '';
  refreshView();
});

function updatePagination(total, filteredFrom) {
  const info = filteredFrom
    ? `Showing <strong>1 to ${Math.min(25, total)}</strong> of <strong>${total}</strong> transactions (filtered from ${filteredFrom} total transactions)`
    : `Showing <strong>1-${Math.min(25, total)}</strong> of <strong>${total}</strong> transactions`;
  document.getElementById('paginationInfo').innerHTML = info;

  const pages = Math.max(1, Math.ceil(total / 25));
  const controls = document.querySelector('.pagination-controls');
  let html = `<button class="btn btn-sm btn-outline" disabled>&laquo; Prev</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="btn btn-sm btn-page ${i === 1 ? 'active' : ''}">${i}</button>`;
  }
  html += `<button class="btn btn-sm btn-outline" ${pages <= 1 ? 'disabled' : ''}>Next &raquo;</button>`;
  controls.innerHTML = html;
}

// === Search ===
document.getElementById('searchInput').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  if (!q) { refreshView(); return; }
  const source = getCurrentData();
  let filtered = source.filter(tx =>
    (tx.customer && tx.customer.toLowerCase().includes(q)) ||
    tx.id.toLowerCase().includes(q) ||
    tx.type.toLowerCase().includes(q) ||
    tx.amount.includes(q)
  );
  renderTable(filtered, isArchivedView());
  updatePagination(filtered.length);
});

// === View filters (Archived / Subscription toggles) ===
function applyViewFilters() {
  const archivedOn = document.getElementById('toggleArchived').checked;
  const subdesc = document.getElementById('pageSubdesc');
  const desc = document.getElementById('pageDesc');

  if (archivedOn) {
    subdesc.innerHTML = '▶ Archived transactions';
    subdesc.style.display = 'block';
    desc.style.display = 'block';
    renderTable(archivedTxns, true);
    updatePagination(archivedTxns.length, getTotalCount());
  } else {
    subdesc.style.display = 'none';
    desc.style.display = 'block';
    renderTable(activeTxns);
    updatePagination(activeTxns.length);
  }
}

// === Init ===
renderTable(activeTxns);
