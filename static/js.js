let materials = [];
let acts = [];
let editingId = null;
let deletingId = null;
let editingMaterialId = null;

const API = '';

async function apiGet(path) {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

async function apiSend(path, method, body) {
    const r = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

function showConfirm(title, text, onConfirm, okText = 'Да, удалить') {
    const modal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmText = document.getElementById('confirmText');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    confirmTitle.textContent = title;
    confirmText.textContent = text;
    modal.classList.remove('hidden');

    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    newOkBtn.textContent = okText;

    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

function showNotice(title, text, type = 'error') {
    const modal = document.getElementById('noticeModal');
    const noticeTitle = document.getElementById('noticeTitle');
    const noticeText = document.getElementById('noticeText');
    const okBtn = document.getElementById('noticeOkBtn');
    const box = modal.querySelector('.modal-box');

    noticeTitle.textContent = title;
    noticeText.textContent = text;

    box.classList.remove('error', 'warn', 'ok');
    box.classList.add(type);

    modal.classList.remove('hidden');

    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    newOkBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

async function loadData() {
    try {
        materials = await apiGet('/api/materials');
        acts = await apiGet('/api/acts');
        renderAll();
    } catch (e) {
        showNotice('Ошибка', 'Не удалось загрузить данные: ' + e.message, 'error');
    }
}

async function addMaterial() {
    const name = document.getElementById('matName').value.trim();
    const unit = document.getElementById('matUnit').value.trim();
    const norm = parseFloat(document.getElementById('matNorm').value);

    if (!name || !unit || isNaN(norm) || norm < 0) {
        showNotice('Ошибка', 'Заполните все поля корректно (норма ≥ 0).', 'error');
        return;
    }

    try {
        await apiSend('/api/materials', 'POST', { name, unit, norm });
        document.getElementById('matName').value = '';
        document.getElementById('matUnit').value = '';
        document.getElementById('matNorm').value = '';
        await loadData();
    } catch (e) {
        showNotice('Ошибка', e.message, 'error');
    }
}

function startStock(id) {
    editingId = id;
    deletingId = null;
    editingMaterialId = null;
    renderAll();
    const input = document.getElementById('stockInput_' + id);
    if (input) input.focus();
}

function cancelStock() {
    editingId = null;
    renderAll();
}

async function confirmStock(id) {
    const input = document.getElementById('stockInput_' + id);
    if (!input) return;
    const num = parseFloat(input.value);
    if (isNaN(num) || num <= 0) {
        showNotice('Ошибка', 'Введите положительное число.', 'error');
        return;
    }

    try {
        await apiSend('/api/materials/' + id + '/stock', 'POST', { qty: num });
        editingId = null;
        await loadData();
    } catch (e) {
        showNotice('Ошибка', e.message, 'error');
    }
}

function startDelete(id) {
    deletingId = id;
    editingId = null;
    editingMaterialId = null;
    renderAll();
}

function cancelDelete() {
    deletingId = null;
    renderAll();
}

function confirmDelete(id) {
    const mat = materials.find(m => m.id === id);
    if (!mat) {
        deletingId = null;
        renderAll();
        return;
    }
    showConfirm(
        'Удалить материал?',
        '«' + mat.name + '» и все связанные акты будут удалены.',
        async () => {
            try {
                await apiSend('/api/materials/' + id, 'DELETE');
                deletingId = null;
                await loadData();
            } catch (e) {
                showNotice('Ошибка', e.message, 'error');
            }
        }
    );
}

function startEditMaterial(id) {
    editingMaterialId = id;
    editingId = null;
    deletingId = null;
    renderAll();
}

function cancelEditMaterial() {
    editingMaterialId = null;
    renderAll();
}

async function confirmEditMaterial(id) {
    const nameInput = document.getElementById('editName_' + id);
    const unitInput = document.getElementById('editUnit_' + id);
    const normInput = document.getElementById('editNorm_' + id);

    if (!nameInput || !unitInput || !normInput) return;

    const newName = nameInput.value.trim();
    const newUnit = unitInput.value.trim();
    const newNorm = parseFloat(normInput.value);

    if (!newName || !newUnit || isNaN(newNorm) || newNorm < 0) {
        showNotice('Ошибка', 'Некорректные данные.', 'error');
        return;
    }

    try {
        await apiSend('/api/materials/' + id, 'PUT', { name: newName, unit: newUnit, norm: newNorm });
        editingMaterialId = null;
        await loadData();
    } catch (e) {
        showNotice('Ошибка', e.message, 'error');
    }
}

async function spisat() {
    const select = document.getElementById('spisMatSelect');
    const id = parseInt(select.value);
    const qty = parseFloat(document.getElementById('spisQty').value);
    const reason = document.getElementById('spisReason').value.trim() || 'Без причины';

    if (!id || isNaN(qty) || qty <= 0) {
        showNotice('Ошибка', 'Выберите материал и укажите количество больше нуля.', 'error');
        return;
    }

    try {
        await apiSend('/api/acts', 'POST', { material_id: id, qty: qty, reason: reason });
        document.getElementById('spisQty').value = '';
        document.getElementById('spisReason').value = '';
        await loadData();
    } catch (e) {
        showNotice('Ошибка', e.message, 'error');
    }
}

function undoLastAct() {
    if (acts.length === 0) {
        showNotice('Нечего отменять', 'Список актов пуст.', 'warn');
        return;
    }

    const last = acts[0];

    showConfirm(
        'Отменить списание?',
        last.material_name + ' — ' + last.qty + ' ' + last.unit + '. Остаток вернётся на склад.',
        async () => {
            try {
                await apiSend('/api/acts/last', 'DELETE');
                await loadData();
            } catch (e) {
                showNotice('Ошибка', e.message, 'error');
            }
        },
        'Да, отменить'
    );
}

function exportActsCSV() {
    if (acts.length === 0) {
        showNotice('Нечего экспортировать', 'Нет актов для экспорта.', 'warn');
        return;
    }
    let csv = 'Дата;Материал;Количество;Ед.;Причина\n';
    acts.forEach(a => {
        csv += '"' + a.created_at + '";"' + a.material_name + '";' + a.qty + ';"' + (a.unit || '') + '";"' + a.reason + '"\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'acts_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
}

function renderStats() {
    const total = materials.length;
    const low = materials.filter(m => m.norm > 0 && m.balance < m.norm).length;
    const actsCount = acts.length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statLow').textContent = low;
    document.getElementById('statActs').textContent = actsCount;
}

function renderAll() {
    const body = document.getElementById('materialsBody');
    body.innerHTML = '';

    const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const filtered = materials.filter(m => m.name.toLowerCase().includes(search));

    filtered.forEach(m => {
        const tr = document.createElement('tr');
        const isEditing = editingMaterialId === m.id;
        const isLow = m.norm > 0 && m.balance < m.norm;

        let actionsHtml = '';

        if (isEditing) {
            actionsHtml = `
                <td>
                    <button onclick="confirmEditMaterial(${m.id})" style="background:#2a6b4f;">✔ ОК</button>
                    <button onclick="cancelEditMaterial()" style="background:#a94442;">✖</button>
                </td>`;
        } else if (editingId === m.id) {
            actionsHtml = `
                <td>
                    <button onclick="confirmStock(${m.id})" style="background:#2a6b4f;">✔ ОК</button>
                    <button onclick="cancelStock()" style="background:#a94442;">✖</button>
                </td>`;
        } else if (deletingId === m.id) {
            actionsHtml = `
                <td>
                    <button onclick="confirmDelete(${m.id})" style="background:#a94442;">✔ Удалить</button>
                    <button onclick="cancelDelete()">✖</button>
                </td>`;
        } else {
            actionsHtml = `
                <td>
                    <button onclick="startStock(${m.id})">➕</button>
                    <button onclick="startEditMaterial(${m.id})" style="background:#3a7f3a;">✎</button>
                    <button onclick="startDelete(${m.id})" style="background:#a94442;">✖</button>
                </td>`;
        }

        const nameCell = isEditing
            ? `<td><input type="text" id="editName_${m.id}" value="${m.name}" style="width:100%;" /></td>`
            : `<td><strong>${m.name}</strong></td>`;

        const unitCell = isEditing
            ? `<td><input type="text" id="editUnit_${m.id}" value="${m.unit}" style="width:60px;" /></td>`
            : `<td>${m.unit}</td>`;

        const normCell = isEditing
            ? `<td><input type="number" id="editNorm_${m.id}" value="${m.norm}" step="0.01" style="width:70px;" /></td>`
            : `<td>${m.norm}</td>`;

        const balanceCell = editingId === m.id
            ? `<td><input type="number" id="stockInput_${m.id}" placeholder="Кол-во" step="0.01"
                          style="width:80px;" onkeydown="if(event.key==='Enter')confirmStock(${m.id})" /></td>`
            : `<td class="${isLow ? 'low' : ''}">${m.balance} ${m.unit}</td>`;

        tr.innerHTML = `
            ${nameCell}
            ${unitCell}
            ${normCell}
            ${balanceCell}
            ${actionsHtml}
        `;
        body.appendChild(tr);
    });

    const select = document.getElementById('spisMatSelect');
    select.innerHTML = '';
    materials.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name + ' (остаток: ' + m.balance + ' ' + m.unit + ')';
        select.appendChild(opt);
    });

    const actsBody = document.getElementById('actsBody');
    actsBody.innerHTML = '';
    acts.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.created_at}</td>
            <td>${a.material_name}</td>
            <td>${a.qty} ${a.unit || ''}</td>
            <td>${a.reason}</td>
        `;
        actsBody.appendChild(tr);
    });

    renderStats();
}

async function resetAll() {
    showConfirm(
        'Сбросить все данные?',
        'Все материалы и акты списания будут удалены без возможности восстановления.',
        async () => {
            for (const m of materials.slice()) {
                try {
                    await apiSend('/api/materials/' + m.id, 'DELETE');
                } catch (e) {}
            }
            await loadData();
        },
        'Да, удалить'
    );
}

loadData();