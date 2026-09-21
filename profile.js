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

function login() {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!identifier || !password) {
        loginMessage.innerText = 'Заполните все поля';
        loginMessage.style.color = '#ffaa99';
        return;
    }

    const users = JSON.parse(localStorage.getItem('spirin_users')) || [];
    const user = users.find(u => 
        (u.login === identifier || u.email === identifier) && u.password === password
    );

    if (user) {
        localStorage.setItem('spirin_current_user', JSON.stringify({ login: user.login, email: user.email }));
        loginMessage.innerText = 'Успешный вход! Перенаправление...';
        loginMessage.style.color = '#a0ffa0';
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } else {
        loginMessage.innerText = 'Неверный логин/email или пароль';
        loginMessage.style.color = '#ffaa99';
    }
}

function register() {
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

    const users = JSON.parse(localStorage.getItem('spirin_users')) || [];
    if (users.find(u => u.login === login)) {
        registerMessage.innerText = 'Логин уже занят';
        registerMessage.style.color = '#ffaa99';
        return;
    }
    if (users.find(u => u.email === email)) {
        registerMessage.innerText = 'Email уже зарегистрирован';
        registerMessage.style.color = '#ffaa99';
        return;
    }

    users.push({ login, email, password });
    localStorage.setItem('spirin_users', JSON.stringify(users));
    localStorage.setItem('spirin_current_user', JSON.stringify({ login, email }));

    registerMessage.innerText = 'Регистрация успешна! Перенаправление...';
    registerMessage.style.color = '#a0ffa0';
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
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

const submitBtn = document.getElementById('submitBtn');
if (submitBtn) {
    submitBtn.classList.add('submit-btn-pulse');
}