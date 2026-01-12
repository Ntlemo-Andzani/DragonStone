// Modal + navbar wiring for Supabase auth
// This file connects the navbar buttons and forms
// to the registerUser/loginUser/logoutUser functions from auth/auth.js

document.addEventListener('DOMContentLoaded', () => {
  // Navbar buttons (must match IDs in index.html)
  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');

  // Modals
  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');

  // Forms
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');

  // Links inside modals
  const inlineShowRegisterLink = document.getElementById('show-register-link');
  const inlineShowLoginLink = document.getElementById('show-login-link');

  // Cancel buttons inside modals
  const loginCancelBtn = document.getElementById('login-cancel');
  const registerCancelBtn = document.getElementById('register-cancel');

  // -------- NAVBAR BUTTONS -> OPEN MODALS --------
  if (loginLink && loginModal) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginModal.style.display = 'flex';
      if (registerModal) registerModal.style.display = 'none';
    });
  }

  if (registerLink && registerModal) {
    registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      registerModal.style.display = 'flex';
      if (loginModal) loginModal.style.display = 'none';
    });
  }

  // "Don't have an account? Register" inside login modal
  if (inlineShowRegisterLink && loginModal && registerModal) {
    inlineShowRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginModal.style.display = 'none';
      registerModal.style.display = 'flex';
    });
  }

  // "Already have an account? Login" inside register modal
  if (inlineShowLoginLink && loginModal && registerModal) {
    inlineShowLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      registerModal.style.display = 'none';
      loginModal.style.display = 'flex';
    });
  }

  // -------- CANCEL BUTTONS -> RETURN TO INDEX --------
  if (loginCancelBtn) {
    loginCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'index.html';
    });
  }

  if (registerCancelBtn) {
    registerCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'index.html';
    });
  }

  // -------- REGISTER FORM SUBMIT --------
  if (registerForm && typeof registerUser === 'function') {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // stop page reload

      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;

      console.log('Register submitted:', name, email);
      await registerUser(name, email, password);
    });
  }

  // -------- LOGIN FORM SUBMIT --------
  if (loginForm && typeof loginUser === 'function') {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Support either ids: login-email/login-password or email/password
      const emailInput =
        document.getElementById('login-email') ||
        document.getElementById('email');
      const passwordInput =
        document.getElementById('login-password') ||
        document.getElementById('password');

      const email = (emailInput || {}).value || '';
      const password = (passwordInput || {}).value || '';

      loginUser(email, password);
    });
  }
});
