// API Client Service for CineVerse Movie Review System

const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '8080'))
    ? 'http://localhost:8080/api'
    : '/api';

class ApiService {
    static getToken() {
        return localStorage.getItem('token');
    }

    static setToken(token) {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    static getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static setUser(user) {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }

    static clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            if (response.status === 204) {
                return null;
            }

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const errorMessage = (data && data.message) ? data.message : `Request failed with status ${response.status}`;
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Auth
    static login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    static register(data) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static getMe() {
        return this.request('/auth/me');
    }

    // Movies
    static getMovies(search = '', genre = '') {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (genre && genre !== 'All') params.append('genre', genre);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/movies${query}`);
    }

    static getMovieById(id) {
        return this.request(`/movies/${id}`);
    }

    static getGenres() {
        return this.request('/movies/genres');
    }

    static createMovie(movieData) {
        return this.request('/movies', {
            method: 'POST',
            body: JSON.stringify(movieData)
        });
    }

    static updateMovie(id, movieData) {
        return this.request(`/movies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(movieData)
        });
    }

    static deleteMovie(id) {
        return this.request(`/movies/${id}`, {
            method: 'DELETE'
        });
    }

    // Reviews
    static getReviewsForMovie(movieId) {
        return this.request(`/movies/${movieId}/reviews`);
    }

    static getMyReviewForMovie(movieId) {
        return this.request(`/movies/${movieId}/my-review`);
    }

    static submitReview(movieId, reviewData) {
        return this.request(`/movies/${movieId}/reviews`, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    }

    static updateReview(id, reviewData) {
        return this.request(`/reviews/${id}`, {
            method: 'PUT',
            body: JSON.stringify(reviewData)
        });
    }

    static deleteReview(id) {
        return this.request(`/reviews/${id}`, {
            method: 'DELETE'
        });
    }

    // User Profile
    static getUserProfile() {
        return this.request('/users/profile');
    }

    static getUserReviews() {
        return this.request('/users/profile/reviews');
    }

    // Admin
    static getAdminStats() {
        return this.request('/admin/stats');
    }

    static getAllReviewsAdmin() {
        return this.request('/admin/reviews');
    }

    static getPendingReviewsAdmin() {
        return this.request('/admin/reviews/pending');
    }

    static approveReview(id) {
        return this.request(`/admin/reviews/${id}/approve`, {
            method: 'POST'
        });
    }

    static rejectReview(id) {
        return this.request(`/admin/reviews/${id}/reject`, {
            method: 'POST'
        });
    }

    static getAllUsersAdmin() {
        return this.request('/admin/users');
    }

    static toggleUserStatus(id) {
        return this.request(`/admin/users/${id}/toggle-status`, {
            method: 'PATCH'
        });
    }

    static deleteUser(id) {
        return this.request(`/admin/users/${id}`, {
            method: 'DELETE'
        });
    }
}
