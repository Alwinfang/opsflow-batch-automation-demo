const products = [
  { id: 'AP-202', name: 'Asia Flex 10 GB', region: 'Asia', scope: 'multi', sku: 4, status: 'active', updated: '今天 09:42' },
  { id: 'SG-050', name: 'Singapore 5 GB', region: 'Asia', scope: 'single', sku: 2, status: 'active', updated: '今天 08:15' },
  { id: 'JP-150', name: 'Japan Standard 15 GB', region: 'Asia', scope: 'single', sku: 3, status: 'active', updated: '昨天 17:36' },
  { id: 'EU-120', name: 'Europe Connect 12 GB', region: 'Europe', scope: 'multi', sku: 5, status: 'paused', updated: '昨天 15:20' },
  { id: 'US-100', name: 'US Travel 10 GB', region: 'Americas', scope: 'single', sku: 3, status: 'active', updated: '09-12 11:05' },
  { id: 'VN-080', name: 'Vietnam Plus 8 GB', region: 'Asia', scope: 'single', sku: 2, status: 'active', updated: '09-11 16:48' },
];

const state = {
  filteredProducts: [...products],
  selectedIds: new Set(),
  step: 1,
  taskMode: 'config',
  phrase: '',
  activity: [
    { name: '价格策略校验', meta: '4 个商品 · 已完成', time: '09:18', status: 'done' },
    { name: '合作伙伴授权检查', meta: '2 个商品 · 等待确认', time: '昨天', status: 'pending' },
  ],
};

const byId = (id) => document.getElementById(id);
const productRows = byId('product-rows');
const batchDialog = byId('batch-dialog');
const panels = [...document.querySelectorAll('[data-panel]')];
const steps = [...document.querySelectorAll('.step')];

function updateDemoStatus(title, detail) {
  byId('demo-status').textContent = title;
  byId('demo-status-detail').textContent = detail;
}

function selectedProducts() {
  return products.filter((product) => state.selectedIds.has(product.id));
}

function statusTag(status) {
  return status === 'active'
    ? '<span class="tag active">已启用</span>'
    : '<span class="tag paused">已暂停</span>';
}

function renderProducts() {
  productRows.innerHTML = state.filteredProducts.map((product) => `
    <tr>
      <td class="check-cell">
        <input class="row-check" type="checkbox" aria-label="选择 ${product.name}" data-id="${product.id}" ${state.selectedIds.has(product.id) ? 'checked' : ''} />
      </td>
      <td>
        <span class="product-name">${product.name}</span>
        <span class="product-sku">${product.id}</span>
      </td>
      <td>${product.region}</td>
      <td>${product.scope === 'single' ? '单国家' : '多国家'}</td>
      <td>${product.sku}</td>
      <td>${statusTag(product.status)}</td>
      <td>${product.updated}</td>
    </tr>
  `).join('');

  const visibleIds = state.filteredProducts.map((product) => product.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => state.selectedIds.has(id));
  byId('select-all').checked = allVisibleSelected;
  byId('select-all').indeterminate = !allVisibleSelected && visibleIds.some((id) => state.selectedIds.has(id));
  byId('result-count').textContent = `显示 ${state.filteredProducts.length} 个模拟商品`;
  renderSelection();
}

function renderSelection() {
  const count = state.selectedIds.size;
  byId('selection-bar').hidden = count === 0;
  byId('selection-summary').textContent = `已选择 ${count} 个商品`;
  byId('open-batch').disabled = count === 0;
}

function renderActivity() {
  byId('activity-list').innerHTML = state.activity.map((item) => `
    <li class="activity-item ${item.status}">
      <span class="activity-bullet"></span>
      <div>
        <div class="activity-name">${item.name}</div>
        <div class="activity-meta">${item.meta}</div>
      </div>
      <time class="activity-time">${item.time}</time>
    </li>
  `).join('');
  byId('metric-tasks').textContent = String(state.activity.filter((item) => item.status === 'pending').length);
}

function applyFilters(event) {
  event?.preventDefault();
  const keyword = byId('keyword').value.trim().toLowerCase();
  const region = byId('region').value;
  const status = byId('status').value;
  const scope = byId('scope').value;

  state.filteredProducts = products.filter((product) => {
    const matchesKeyword = !keyword
      || product.name.toLowerCase().includes(keyword)
      || product.id.toLowerCase().includes(keyword);
    return matchesKeyword
      && (region === 'all' || product.region === region)
      && (status === 'all' || product.status === status)
      && (scope === 'all' || product.scope === scope);
  });
  state.selectedIds.clear();
  renderProducts();
  showToast('筛选已更新', `当前命中 ${state.filteredProducts.length} 个模拟商品`);
}

function startDemo(mode) {
  byId('keyword').value = '';
  byId('region').value = 'Asia';
  byId('status').value = 'active';
  byId('scope').value = 'single';
  applyFilters();

  state.filteredProducts.forEach((product) => state.selectedIds.add(product.id));
  renderProducts();

  state.taskMode = mode;
  document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
  updateModeFields();
  updateDemoStatus(
    mode === 'config' ? '经营配置已就绪' : '授权分发已就绪',
    `已筛选并选中 ${state.filteredProducts.length} 个亚洲单国家商品。点击“对已选商品批量操作”继续。`,
  );
  showToast('演示环境已准备', `已选中 ${state.filteredProducts.length} 个商品，可继续执行${mode === 'config' ? '经营配置' : '授权分发'}。`);
  byId('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFilters() {
  byId('filter-form').reset();
  state.filteredProducts = [...products];
  state.selectedIds.clear();
  renderProducts();
}

function updateStep(nextStep) {
  state.step = nextStep;
  panels.forEach((panel) => {
    panel.hidden = Number(panel.dataset.panel) !== state.step;
  });
  steps.forEach((step) => {
    const stepNumber = Number(step.dataset.step);
    step.classList.toggle('active', stepNumber === state.step);
    step.classList.toggle('done', stepNumber < state.step);
  });
  byId('previous-step').hidden = state.step === 1;
  byId('next-step').hidden = state.step === 3;
  byId('submit-task').hidden = state.step !== 3;
}

function modeLabel() {
  return state.taskMode === 'config' ? '批量经营配置' : '批量授权分发';
}

function createPhrase() {
  const letters = state.taskMode === 'config' ? 'CFG' : 'AUTH';
  const count = selectedProducts().length;
  return `${letters}-${String(count).padStart(2, '0')}-${state.taskMode === 'config' ? '5P' : 'OK'}`;
}

function updateModeFields() {
  state.taskMode = document.querySelector('input[name="mode"]:checked').value;
  byId('config-fields').hidden = state.taskMode !== 'config';
  byId('authorization-fields').hidden = state.taskMode !== 'authorize';
}

function renderPreview() {
  state.phrase = createPhrase();
  const selection = selectedProducts();
  const details = state.taskMode === 'config'
    ? [
      ['操作', '经营配置'],
      ['商品数量', `${selection.length} 个`],
      ['配置对象', byId('config-target').selectedOptions[0].textContent],
      ['定价方式', byId('price-mode').selectedOptions[0].textContent],
      ['加价幅度', `${byId('markup').value || '0'}%`],
      ['SKU 状态', byId('sku-status').selectedOptions[0].textContent],
    ]
    : [
      ['操作', '授权分发'],
      ['商品数量', `${selection.length} 个`],
      ['授权范围', byId('authorization-scope').selectedOptions[0].textContent],
      ['合作伙伴', byId('partner').selectedOptions[0].textContent],
      ['预估写入', `${selection.reduce((total, product) => total + product.sku, 0)} 条 SKU`],
      ['风险状态', '可执行'],
    ];
  byId('preview-grid').innerHTML = details.map(([label, value]) => `
    <div><span>${label}</span><strong>${value}</strong></div>
  `).join('');
  byId('confirmation-phrase').textContent = state.phrase;
  byId('confirmation-input').value = '';
  byId('submit-task').disabled = true;
}

function openDialog() {
  const selection = selectedProducts();
  byId('selected-product-count').textContent = String(selection.length);
  byId('selected-sku-count').textContent = String(selection.reduce((total, product) => total + product.sku, 0));
  updateStep(1);
  batchDialog.showModal();
  updateDemoStatus('正在执行批量流程', `已进入${modeLabel()}的第 1 步：确认影响范围。`);
}

function closeDialog() {
  batchDialog.close();
  byId('confirmation-input').value = '';
}

function showToast(title, message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
  byId('toast-region').append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function submitTask() {
  const selected = selectedProducts();
  const label = modeLabel();
  const action = state.taskMode === 'config'
    ? `已创建 ${label}任务，正在处理 ${selected.length} 个商品`
    : `已创建 ${label}任务，正在处理 ${selected.length} 个商品`;

  byId('submit-task').disabled = true;
  byId('submit-task').textContent = '正在创建任务...';

  window.setTimeout(() => {
    const completedMeta = state.taskMode === 'config'
      ? `${selected.length} 个商品 · 加价配置已生效`
      : `${selected.length} 个商品 · 已授权给 ${byId('partner').value}`;
    state.activity.unshift({
      name: label,
      meta: completedMeta,
      time: '刚刚',
      status: 'done',
    });
    state.selectedIds.clear();
    renderActivity();
    renderProducts();
    closeDialog();
    byId('submit-task').textContent = '确认并创建任务';
    updateDemoStatus('演示执行完成', completedMeta);
    showToast('当前批量任务 已完成', completedMeta);
  }, 850);

  showToast('任务已创建', action);
}

byId('filter-form').addEventListener('submit', applyFilters);
byId('reset-filters').addEventListener('click', resetFilters);
byId('start-config-demo').addEventListener('click', () => startDemo('config'));
byId('start-authorize-demo').addEventListener('click', () => startDemo('authorize'));
byId('product-rows').addEventListener('change', (event) => {
  if (!event.target.matches('.row-check')) return;
  const { id } = event.target.dataset;
  event.target.checked ? state.selectedIds.add(id) : state.selectedIds.delete(id);
  renderProducts();
});
byId('select-all').addEventListener('change', (event) => {
  state.filteredProducts.forEach((product) => {
    event.target.checked ? state.selectedIds.add(product.id) : state.selectedIds.delete(product.id);
  });
  renderProducts();
});
byId('clear-selection').addEventListener('click', () => {
  state.selectedIds.clear();
  renderProducts();
});
byId('open-batch').addEventListener('click', openDialog);
byId('close-dialog').addEventListener('click', closeDialog);
byId('previous-step').addEventListener('click', () => updateStep(state.step - 1));
byId('next-step').addEventListener('click', () => {
  if (state.step === 2) renderPreview();
  updateStep(state.step + 1);
});
document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener('change', updateModeFields);
});
byId('confirmation-input').addEventListener('input', (event) => {
  byId('submit-task').disabled = event.target.value.trim() !== state.phrase;
});
byId('submit-task').addEventListener('click', submitTask);

renderProducts();
renderActivity();
