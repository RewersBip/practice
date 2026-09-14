let materials = JSON.parse(localStorage.getItem('workshop_materials')) || [];
let acts = JSON.parse(localStorage.getItem('workshop_acts')) || [];

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

    function addStock(id) {
        const qty = prompt('Введите количество для прихода:');
        if (qty === null) return;
        const num = parseFloat(qty);
        if (isNaN(num) || num <= 0) {
            alert('Введите положительное число');
            return;
        }
        const mat = materials.find(m => m.id === id);
        if (mat) {
            mat.balance += num;
            saveAll();
            renderAll();
        }
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

    function deleteMaterial(id) {
        if (!confirm('Удалить материал и все связанные акты?')) return;
        const mat = materials.find(m => m.id === id);
        materials = materials.filter(m => m.id !== id);
        if (mat) {
            acts = acts.filter(a => a.materialName !== mat.name);
        }
        saveAll();
        renderAll();
    }

    function renderAll() {
        const body = document.getElementById('materialsBody');
        body.innerHTML = '';
        materials.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td>${m.unit}</td>
                <td>${m.norm}</td>
                <td class="${m.balance < 0 ? 'danger' : ''}">${m.balance} ${m.unit}</td>
                <td>
                    <button onclick="addStock(${m.id})"> Приход</button>
                    <button onclick="deleteMaterial(${m.id})" style="background:#a94442;">✖</button>
                </td>
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