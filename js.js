let materials = JSON.parse(localStorage.getItem('workshop_materials')) || [];
let acts = JSON.parse(localStorage.getItem('workshop_acts')) || [];

let editingId = null;
let deletingId = null;

function saveAll() {
    localStorage.setItem('workshop_materials', JSON.stringify(materials));
    localStorage.setItem('workshop_acts', JSON.stringify(acts));
}

function addMaterial() {
    const name = document.getElementById('matName').value.trim();
    const unit = document.getElementById('matUnit').value.trim();
    const norm = parseFloat(document.getElementById('matNorm').value);

    if (!name || !unit || isNaN(norm) || norm < 0) {
        alert('Заполните все поля корректно (норма >= 0)');
        return;
    }

    if (materials.find(m => m.name.toLowerCase() === name.toLowerCase())) {
        alert('Такой материал уже есть');
        return;
    }

    materials.push({
        id: Date.now(),
        name,
        unit,
        norm,
        balance: 0
    });

    document.getElementById('matName').value = '';
    document.getElementById('matUnit').value = '';
    document.getElementById('matNorm').value = '';

    saveAll();
    renderAll();
}

function startStock(id) {
    editingId = id;
    deletingId = null;
    renderAll();
    const input = document.getElementById('stockInput_' + id);
    if (input) input.focus();
}

function cancelStock() {
    editingId = null;
    renderAll();
}

function confirmStock(id) {
    const input = document.getElementById('stockInput_' + id);
    if (!input) return;
    const num = parseFloat(input.value);
    if (isNaN(num) || num <= 0) {
        alert('Введите положительное число');
        return;
    }
    const mat = materials.find(m => m.id === id);
    if (!mat) {
        alert('Материал не найден');
        return;
    }
    mat.balance += num;
    editingId = null;
    saveAll();
    renderAll();
}

function startDelete(id) {
    deletingId = id;
    editingId = null;
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
    materials = materials.filter(m => m.id !== id);
    acts = acts.filter(a => a.materialName !== mat.name);
    deletingId = null;
    saveAll();
    renderAll();
}

function editMaterial(id) {
    const mat = materials.find(m => m.id === id);
    if (!mat) return;

    const newName = prompt('Название материала:', mat.name);
    if (newName === null) return;
    const newUnit = prompt('Единица измерения:', mat.unit);
    if (newUnit === null) return;
    const newNorm = prompt('Норма расхода:', mat.norm);
    if (newNorm === null) return;

    if (!newName.trim() || !newUnit.trim() || isNaN(parseFloat(newNorm)) || parseFloat(newNorm) < 0) {
        alert('Некорректные данные');
        return;
    }

    mat.name = newName.trim();
    mat.unit = newUnit.trim();
    mat.norm = parseFloat(newNorm);

    saveAll();
    renderAll();
}

function spisat() {
    const select = document.getElementById('spisMatSelect');
    const id = parseInt(select.value);
    const qty = parseFloat(document.getElementById('spisQty').value);
    const reason = document.getElementById('spisReason').value.trim() || 'Без причины';

    if (!id || isNaN(qty) || qty <= 0) {
        alert('Выберите материал и укажите количество > 0');
        return;
    }

    const mat = materials.find(m => m.id === id);
    if (!mat) {
        alert('Материал не найден');
        return;
    }

    if (mat.balance < qty) {
        alert(`Недостаточно остатка (доступно: ${mat.balance} ${mat.unit})`);
        return;
    }

    mat.balance -= qty;

    acts.push({
        id: Date.now(),
        date: new Date().toLocaleString(),
        materialName: mat.name,
        qty: qty,
        unit: mat.unit,
        reason: reason
    });

    document.getElementById('spisQty').value = '';
    document.getElementById('spisReason').value = '';

    saveAll();
    renderAll();
}

function undoLastAct() {
    if (acts.length === 0) {
        alert('Нет актов для отмены');
        return;
    }
    const last = acts[acts.length - 1];
    if (!confirm(`Отменить списание: ${last.materialName} — ${last.qty} ${last.unit}?`)) return;

    const mat = materials.find(m => m.name === last.materialName);
    if (mat) {
        mat.balance += last.qty;
    }
    acts.pop();
    saveAll();
    renderAll();
}

function exportActsCSV() {
    if (acts.length === 0) {
        alert('Нет актов для экспорта');
        return;
    }
    let csv = 'Дата;Материал;Количество;Ед.;Причина\n';
    acts.forEach(a => {
        csv += `"${a.date}";"${a.materialName}";${a.qty};"${a.unit || ''}";"${a.reason}"\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acts_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function renderAll() {
    const body = document.getElementById('materialsBody');
    body.innerHTML = '';
    materials.forEach(m => {
        const tr = document.createElement('tr');

        let actionsHtml = '';

        if (editingId === m.id) {
            actionsHtml = `
                <td>
                    <button onclick="confirmStock(${m.id})" style="background:#2a6b4f;">✔ ОК</button>
                    <button onclick="cancelStock()" style="background:#a94442;">✖ Отмена</button>
                </td>
            `;
        } else if (deletingId === m.id) {
            actionsHtml = `
                <td>
                    <button onclick="confirmDelete(${m.id})" style="background:#a94442;">✔ Удалить</button>
                    <button onclick="cancelDelete()">✖ Отмена</button>
                </td>
            `;
        } else {
            actionsHtml = `
                <td>
                    <button onclick="startStock(${m.id})">➕</button>
                    <button onclick="editMaterial(${m.id})" style="background:#3a7f3a;">✎</button>
                    <button onclick="startDelete(${m.id})" style="background:#a94442;">✖</button>
                </td>
            `;
        }

        const balanceCell = editingId === m.id
            ? `<td><input type="number" id="stockInput_${m.id}" placeholder="Кол-во" step="0.01"
                          style="width:80px;" onkeydown="if(event.key==='Enter')confirmStock(${m.id})" /></td>`
            : `<td class="${m.balance < 0 ? 'danger' : ''}">${m.balance} ${m.unit}</td>`;

        tr.innerHTML = `
            <td><strong>${m.name}</strong></td>
            <td>${m.unit}</td>
            <td>${m.norm}</td>
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
        opt.textContent = `${m.name} (остаток: ${m.balance} ${m.unit})`;
        select.appendChild(opt);
    });

    const actsBody = document.getElementById('actsBody');
    actsBody.innerHTML = '';
    acts.slice().reverse().forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${a.date}</td>
            <td>${a.materialName}</td>
            <td>${a.qty} ${a.unit || ''}</td>
            <td>${a.reason}</td>
        `;
        actsBody.appendChild(tr);
    });
}

function resetAll() {
    if (!confirm('Удалить ВСЕ данные?')) return;
    materials = [];
    acts = [];
    saveAll();
    renderAll();
}

renderAll();