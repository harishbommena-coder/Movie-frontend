// Authentication Management for CineVerse Movie Review System

class AuthManager {
    static init() {
        this.updateNavUi();
        this.bindEvents();
    }

    static isLoggedIn() {
        return !!ApiService.getToken() && !!ApiService.getUser();
    }

    static isAdmin() {
        const user = ApiService.getUser();
        return user && user.role === 'ROLE_ADMIN';
    }

    static getCurrentUser() {
        return ApiService.getUser();
    }

    static updateNavUi() {
        const authGuestNav = document.getElementById('authGuestNav');
        const authUserNav = document.getElementById('authUserNav');
        const navUsername = document.getElementById('navUsername');
        const adminDashboardNavBtn = document.getElementById('adminDashboardNavBtn');

        if (this.isLoggedIn()) {
            const user = this.getCurrentUser();
            if (authGuestNav) authGuestNav.classList.add('d-none');
            if (authUserNav) authUserNav.classList.remove('d-none');
            if (navUsername) navUsername.textContent = user.username;

            if (adminDashboardNavBtn) {
                if (this.isAdmin()) {
                    adminDashboardNavBtn.classList.remove('d-none');
                } else {
                    adminDashboardNavBtn.classList.add('d-none');
                }
            }
        } else {
            if (authGuestNav) authGuestNav.classList.remove('d-none');
            if (authUserNav) authUserNav.classList.add('d-none');
            if (adminDashboardNavBtn) adminDashboardNavBtn.classList.add('d-none');
        }
    }

    static bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const usernameOrEmail = document.getElementById('loginUsername').value.trim();
                const password = document.getElementById('loginPassword').value;

                try {
                    const response = await ApiService.login({ usernameOrEmail, password });
                    ApiService.setToken(response.token);
                    ApiService.setUser({
                        id: response.id,
                        username: response.username,
                        email: response.email,
                        role: response.role
                    });

                    bootstrap.Modal.getInstance(document.getElementById('loginModal'))?.hide();
                    loginForm.reset();
                    this.updateNavUi();
                    showToast('Welcome back, ' + response.username + '!', 'success');

                    // Refresh details or movie grid if needed
                    if (window.MovieApp) {
                        window.MovieApp.loadMovies();
                        if (window.MovieApp.currentMovieId) {
                            window.MovieApp.loadMovieDetails(window.MovieApp.currentMovieId);
                        }
                    }
                } catch (err) {
                    showToast(err.message || 'Login failed', 'danger');
                }
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('regUsername').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const password = document.getElementById('regPassword').value;

                try {
                    const response = await ApiService.register({ username, email, password });
                    ApiService.setToken(response.token);
                    ApiService.setUser({
                        id: response.id,
                        username: response.username,
                        email: response.email,
                        role: response.role
                    });

                    bootstrap.Modal.getInstance(document.getElementById('registerModal'))?.hide();
                    registerForm.reset();
                    this.updateNavUi();
                    showToast('Account created successfully! Welcome, ' + response.username, 'success');

                    if (window.MovieApp) {
                        window.MovieApp.loadMovies();
                    }
                } catch (err) {
                    showToast(err.message || 'Registration failed', 'danger');
                }
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                ApiService.clearAuth();
                this.updateNavUi();
                showToast('You have been logged out.', 'info');
                if (window.MovieApp) {
                    window.MovieApp.loadMovies();
                    if (window.MovieApp.currentMovieId) {
                        window.MovieApp.loadMovieDetails(window.MovieApp.currentMovieId);
                    }
                }
            });
        }
    }
}
