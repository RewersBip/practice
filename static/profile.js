const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const submitLogin = document.getElementById('submitLogin');
const submitRegister = document.getElementById('submitRegister');
const loginMessage = document.getElementById('loginMessage');
const registerMessage = document.getElementById('registerMessage');
const tabsContainer = document.querySelector('.tabs');

function showLoginForm() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    if (tabsContainer) tabsContainer.setAttribute('data-active', 'login');
    loginMessage.innerText = '';
    registerMessage.innerText = '';
}

function showRegisterForm() {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    if (tabsContainer) tabsContainer.setAttribute('data-active', 'register');
    loginMessage.innerText = '';
    registerMessage.innerText = '';
}

async function login() {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!identifier || !password) {
        loginMessage.innerText = 'Заполните все поля';
        loginMessage.style.color = '#ffaa99';
        return;
    }

    try {
        const r = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: identifier, password: password })
        });

        if (!r.ok) {
            loginMessage.innerText = 'Неверный логин/email или пароль';
            loginMessage.style.color = '#ffaa99';
            return;
        }

        const user = await r.json();
        localStorage.setItem('workshoptrack_current_user', JSON.stringify({
            id: user.id,
            login: user.username,
            email: user.email
        }));

        loginMessage.innerText = 'Успешный вход! Перенаправление...';
        loginMessage.style.color = '#a0ffa0';
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    } catch (e) {
        loginMessage.innerText = 'Ошибка сервера: ' + e.message;
        loginMessage.style.color = '#ffaa99';
    }
}

async function register() {
    const login = document.getElementById('regLogin').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordRepeat = document.getElementById('regPasswordRepeat').value;

    if (!login || !email || !password || !passwordRepeat) {
        registerMessage.innerText = 'Заполните все поля';
        registerMessage.style.color = '#ffaa99';
        return;
    }

    if (password !== passwordRepeat) {
        registerMessage.innerText = 'Пароли не совпадают';
        registerMessage.style.color = '#ffaa99';
        return;
    }

    if (password.length < 4) {
        registerMessage.innerText = 'Пароль должен быть не менее 4 символов';
        registerMessage.style.color = '#ffaa99';
        return;
    }

    try {
        const r = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: login, email: email, password: password })
        });

        if (!r.ok) {
            registerMessage.innerText = await r.text();
            registerMessage.style.color = '#ffaa99';
            return;
        }

        const user = await r.json();
        localStorage.setItem('workshoptrack_current_user', JSON.stringify({
            id: user.id,
            login: user.username,
            email: user.email
        }));

        registerMessage.innerText = 'Регистрация успешна! Перенаправление...';
        registerMessage.style.color = '#a0ffa0';
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);
    } catch (e) {
        registerMessage.innerText = 'Ошибка сервера: ' + e.message;
        registerMessage.style.color = '#ffaa99';
    }
}

loginTab.addEventListener('click', showLoginForm);
registerTab.addEventListener('click', showRegisterForm);
submitLogin.addEventListener('click', login);
submitRegister.addEventListener('click', register);

document.getElementById('loginIdentifier').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});
document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});
document.getElementById('regLogin').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') register();
});
document.getElementById('regEmail').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') register();
});
document.getElementById('regPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') register();
});
document.getElementById('regPasswordRepeat').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') register();
});

showLoginForm();