// Admin Dashboard & Moderation Management Module

class AdminManager {
    static editingMovieId = null;

    static init() {
        this.bindEvents();
    }

    static async openDashboard() {
        if (!AuthManager.isAdmin()) {
            showToast('Access denied: Administrator privileges required', 'danger');
            return;
        }

        const modalEl = document.getElementById('adminDashboardModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        await this.loadStats();
        await this.loadMoviesTable();
        await this.loadReviewsTable();
        await this.loadUsersTable();
    }

    static async loadStats() {
        try {
            const stats = await ApiService.getAdminStats();
            document.getElementById('statTotalMovies').textContent = stats.totalMovies || 0;
            document.getElementById('statTotalReviews').textContent = stats.totalReviews || 0;
            document.getElementById('statTotalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('statPendingReviews').textContent = stats.pendingReviews || 0;
            document.getElementById('statAvgRating').textContent = stats.platformAverageRating > 0 ? stats.platformAverageRating.toFixed(1) : 'N/A';
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    }

    // --- Movie Management ---
    static async loadMoviesTable() {
        const tbody = document.getElementById('adminMoviesTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';

        try {
            const movies = await ApiService.getMovies();
            if (!movies || movies.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">No movies found.</td></tr>';
                return;
            }

            tbody.innerHTML = movies.map(m => `
                <tr>
                    <td><strong>#${m.id}</strong></td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <img src="${m.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=80&q=80'}" style="width: 32px; height: 45px; object-fit: cover; border-radius: 4px;">
                            <span>${m.title}</span>
                        </div>
                    </td>
                    <td><span class="badge bg-secondary">${m.genre}</span></td>
                    <td>${m.releaseYear}</td>
                    <td><span class="text-warning">★ ${m.averageRating > 0 ? m.averageRating.toFixed(1) : '0.0'}</span> <small class="text-muted">(${m.totalReviews})</small></td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-info" onclick="AdminManager.openEditMovieModal(${m.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="AdminManager.deleteMovie(${m.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-danger">Failed to load movies.</td></tr>';
        }
    }

    static openAddMovieModal() {
        this.editingMovieId = null;
        const form = document.getElementById('adminMovieForm');
        form.reset();
        document.getElementById('adminMovieModalTitle').textContent = 'Add New Movie';
        new bootstrap.Modal(document.getElementById('adminMovieModal')).show();
    }

    static async openEditMovieModal(id) {
        try {
            const m = await ApiService.getMovieById(id);
            this.editingMovieId = id;

            document.getElementById('adminMovieModalTitle').textContent = `Edit Movie: ${m.title}`;
            document.getElementById('mTitle').value = m.title;
            document.getElementById('mGenre').value = m.genre;
            document.getElementById('mYear').value = m.releaseYear;
            document.getElementById('mDirector').value = m.director || '';
            document.getElementById('mCast').value = m.cast || '';
            document.getElementById('mDuration').value = m.durationMinutes || '';
            document.getElementById('mPosterUrl').value = m.posterUrl || '';
            document.getElementById('mTrailerUrl').value = m.trailerUrl || '';
            document.getElementById('mSynopsis').value = m.synopsis || '';

            new bootstrap.Modal(document.getElementById('adminMovieModal')).show();
        } catch (err) {
            showToast(err.message || 'Failed to load movie details', 'danger');
        }
    }

    static async deleteMovie(id) {
        if (!confirm('Are you sure you want to delete this movie? This will also remove all its reviews.')) return;
        try {
            await ApiService.deleteMovie(id);
            showToast('Movie deleted successfully', 'success');
            await this.loadMoviesTable();
            await this.loadStats();
            if (window.MovieApp) window.MovieApp.loadMovies();
        } catch (err) {
            showToast(err.message || 'Failed to delete movie', 'danger');
        }
    }

    // --- Review Moderation ---
    static async loadReviewsTable() {
        const tbody = document.getElementById('adminReviewsTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';

        try {
            const reviews = await ApiService.getAllReviewsAdmin();
            if (!reviews || reviews.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-muted">No reviews recorded.</td></tr>';
                return;
            }

            tbody.innerHTML = reviews.map(r => {
                let badgeClass = 'bg-success';
                if (r.status === 'PENDING') badgeClass = 'bg-warning text-dark';
                else if (r.status === 'REJECTED') badgeClass = 'bg-danger';

                return `
                    <tr>
                        <td><strong>#${r.id}</strong></td>
                        <td>${r.movieTitle || 'Movie #' + r.movieId}</td>
                        <td><strong>${r.username}</strong></td>
                        <td><span class="text-warning">★ ${r.rating}</span></td>
                        <td class="small text-truncate" style="max-width: 200px;" title="${r.comment || ''}">${r.comment || ''}</td>
                        <td><span class="badge ${badgeClass}">${r.status}</span></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                ${r.status !== 'APPROVED' ? `
                                    <button class="btn btn-outline-success" title="Approve Review" onclick="AdminManager.approveReview(${r.id})">
                                        <i class="bi bi-check-lg"></i>
                                    </button>
                                ` : ''}
                                ${r.status !== 'REJECTED' ? `
                                    <button class="btn btn-outline-warning" title="Reject Review" onclick="AdminManager.rejectReview(${r.id})">
                                        <i class="bi bi-x-lg"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-danger" title="Delete Review" onclick="AdminManager.deleteReview(${r.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-3 text-danger">Failed to load reviews.</td></tr>';
        }
    }

    static async approveReview(id) {
        try {
            await ApiService.approveReview(id);
            showToast('Review approved and included in rating', 'success');
            await this.loadReviewsTable();
            await this.loadStats();
            if (window.MovieApp) window.MovieApp.loadMovies();
        } catch (err) {
            showToast(err.message || 'Failed to approve review', 'danger');
        }
    }

    static async rejectReview(id) {
        try {
            await ApiService.rejectReview(id);
            showToast('Review flagged as rejected', 'info');
            await this.loadReviewsTable();
            await this.loadStats();
            if (window.MovieApp) window.MovieApp.loadMovies();
        } catch (err) {
            showToast(err.message || 'Failed to reject review', 'danger');
        }
    }

    static async deleteReview(id) {
        if (!confirm('Are you sure you want to permanently delete this review?')) return;
        try {
            await ApiService.deleteReview(id);
            showToast('Review deleted', 'success');
            await this.loadReviewsTable();
            await this.loadStats();
            if (window.MovieApp) window.MovieApp.loadMovies();
        } catch (err) {
            showToast(err.message || 'Failed to delete review', 'danger');
        }
    }

    // --- User Management ---
    static async loadUsersTable() {
        const tbody = document.getElementById('adminUsersTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';

        try {
            const users = await ApiService.getAllUsersAdmin();
            if (!users || users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">No users found.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => `
                <tr>
                    <td><strong>#${u.id}</strong></td>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.role === 'ROLE_ADMIN' ? 'bg-danger' : 'bg-primary'}">${u.role}</span></td>
                    <td>
                        <span class="badge ${u.enabled ? 'bg-success' : 'bg-secondary'}">
                            ${u.enabled ? 'Active' : 'Disabled'}
                        </span>
                    </td>
                    <td>
                        ${u.role !== 'ROLE_ADMIN' ? `
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-${u.enabled ? 'warning' : 'success'}" onclick="AdminManager.toggleUserStatus(${u.id})">
                                    <i class="bi bi-${u.enabled ? 'slash-circle' : 'check-circle'}"></i> ${u.enabled ? 'Deactivate' : 'Activate'}
                                </button>
                                <button class="btn btn-outline-danger" onclick="AdminManager.deleteUser(${u.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        ` : '<span class="text-muted small">Protected Admin</span>'}
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-danger">Failed to load users.</td></tr>';
        }
    }

    static async toggleUserStatus(id) {
        try {
            const updated = await ApiService.toggleUserStatus(id);
            showToast(`User status updated to ${updated.enabled ? 'Active' : 'Disabled'}`, 'info');
            await this.loadUsersTable();
        } catch (err) {
            showToast(err.message || 'Failed to update user', 'danger');
        }
    }

    static async deleteUser(id) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await ApiService.deleteUser(id);
            showToast('User deleted', 'success');
            await this.loadUsersTable();
            await this.loadStats();
        } catch (err) {
            showToast(err.message || 'Failed to delete user', 'danger');
        }
    }

    static bindEvents() {
        const form = document.getElementById('adminMovieForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const movieData = {
                    title: document.getElementById('mTitle').value.trim(),
                    genre: document.getElementById('mGenre').value.trim(),
                    releaseYear: parseInt(document.getElementById('mYear').value, 10),
                    director: document.getElementById('mDirector').value.trim(),
                    cast: document.getElementById('mCast').value.trim(),
                    durationMinutes: parseInt(document.getElementById('mDuration').value, 10) || null,
                    posterUrl: document.getElementById('mPosterUrl').value.trim(),
                    trailerUrl: document.getElementById('mTrailerUrl').value.trim(),
                    synopsis: document.getElementById('mSynopsis').value.trim()
                };

                try {
                    if (AdminManager.editingMovieId) {
                        await ApiService.updateMovie(AdminManager.editingMovieId, movieData);
                        showToast('Movie updated successfully!', 'success');
                    } else {
                        await ApiService.createMovie(movieData);
                        showToast('New movie added successfully!', 'success');
                    }

                    bootstrap.Modal.getInstance(document.getElementById('adminMovieModal'))?.hide();
                    await AdminManager.loadMoviesTable();
                    await AdminManager.loadStats();
                    if (window.MovieApp) {
                        window.MovieApp.loadMovies();
                        window.MovieApp.loadGenres();
                    }
                } catch (err) {
                    showToast(err.message || 'Failed to save movie', 'danger');
                }
            });
        }
    }
}
