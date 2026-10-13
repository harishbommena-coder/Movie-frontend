// Review Management Module

class ReviewManager {
    static currentMovieId = null;
    static userExistingReviewId = null;

    static init() {
        this.bindEvents();
    }

    static async loadReviewsForMovie(movieId) {
        this.currentMovieId = movieId;
        this.userExistingReviewId = null;

        const reviewsContainer = document.getElementById('movieReviewsList');
        const reviewFormSection = document.getElementById('reviewFormSection');
        const loginToReviewPrompt = document.getElementById('loginToReviewPrompt');

        // Authentication state handling
        if (AuthManager.isLoggedIn()) {
            if (reviewFormSection) reviewFormSection.classList.remove('d-none');
            if (loginToReviewPrompt) loginToReviewPrompt.classList.add('d-none');
        } else {
            if (reviewFormSection) reviewFormSection.classList.add('d-none');
            if (loginToReviewPrompt) loginToReviewPrompt.classList.remove('d-none');
        }

        reviewsContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Loading reviews...</div>';

        try {
            // Check if user has an existing review
            if (AuthManager.isLoggedIn()) {
                const myReview = await ApiService.getMyReviewForMovie(movieId);
                if (myReview) {
                    this.userExistingReviewId = myReview.id;
                    this.populateReviewForm(myReview);
                } else {
                    this.resetReviewForm();
                }
            } else {
                this.resetReviewForm();
            }

            // Fetch public approved reviews
            const reviews = await ApiService.getReviewsForMovie(movieId);
            this.renderReviewsList(reviews, reviewsContainer);
        } catch (err) {
            console.error('Error fetching reviews:', err);
            reviewsContainer.innerHTML = '<p class="text-danger small">Failed to load reviews.</p>';
        }
    }

    static renderReviewsList(reviews, container) {
        if (!reviews || reviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-chat-square-text fs-2 d-block mb-2"></i>
                    No reviews yet. Be the first to share your thoughts!
                </div>
            `;
            return;
        }

        const currentUser = AuthManager.getCurrentUser();
        const isAdmin = AuthManager.isAdmin();

        container.innerHTML = reviews.map(rev => {
            const isOwner = currentUser && (currentUser.id === rev.userId || currentUser.username === rev.username);
            const canManage = isOwner || isAdmin;
            const starsHtml = Array.from({ length: 5 }, (_, i) =>
                `<i class="bi ${i < rev.rating ? 'bi-star-fill text-warning' : 'bi-star text-muted'} small"></i>`
            ).join('');

            const dateStr = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : '';

            return `
                <div class="review-item" id="review-card-${rev.id}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="d-flex align-items-center gap-2">
                            <div class="review-author-avatar">
                                ${(rev.username || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <strong class="d-block text-light small">${rev.username}</strong>
                                <span class="text-secondary" style="font-size: 0.75rem;">${dateStr}</span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <div class="text-warning">${starsHtml}</div>
                            ${canManage ? `
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-link text-secondary p-0" type="button" data-bs-toggle="dropdown">
                                        <i class="bi bi-three-dots-vertical"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                                        <li>
                                            <a class="dropdown-item" href="javascript:void(0)" onclick="ReviewManager.startEditReview(${rev.id}, ${rev.rating}, \`${escapeQuotes(rev.comment)}\`)">
                                                <i class="bi bi-pencil me-1"></i> Edit
                                            </a>
                                        </li>
                                        <li>
                                            <a class="dropdown-item text-danger" href="javascript:void(0)" onclick="ReviewManager.deleteReview(${rev.id})">
                                                <i class="bi bi-trash me-1"></i> Delete
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <p class="text-light small mb-0" style="white-space: pre-line;">${rev.comment || ''}</p>
                </div>
            `;
        }).join('');
    }

    static populateReviewForm(review) {
        const starRadio = document.querySelector(`input[name="rating"][value="${review.rating}"]`);
        if (starRadio) starRadio.checked = true;

        const commentInput = document.getElementById('reviewCommentInput');
        if (commentInput) commentInput.value = review.comment;

        const submitBtn = document.getElementById('submitReviewBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Update Review';
            submitBtn.classList.replace('btn-primary', 'btn-success');
        }

        const cancelBtn = document.getElementById('cancelEditReviewBtn');
        if (cancelBtn) cancelBtn.classList.remove('d-none');
    }

    static resetReviewForm() {
        this.userExistingReviewId = null;
        const radios = document.querySelectorAll('input[name="rating"]');
        radios.forEach(r => r.checked = false);

        const commentInput = document.getElementById('reviewCommentInput');
        if (commentInput) commentInput.value = '';

        const submitBtn = document.getElementById('submitReviewBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Submit Review';
            submitBtn.classList.replace('btn-success', 'btn-primary');
        }

        const cancelBtn = document.getElementById('cancelEditReviewBtn');
        if (cancelBtn) cancelBtn.classList.add('d-none');
    }

    static startEditReview(reviewId, rating, comment) {
        this.userExistingReviewId = reviewId;
        this.populateReviewForm({ rating, comment });
        document.getElementById('reviewCommentInput')?.scrollIntoView({ behavior: 'smooth' });
    }

    static async deleteReview(reviewId) {
        if (!confirm('Are you sure you want to delete this review?')) return;

        try {
            await ApiService.deleteReview(reviewId);
            showToast('Review deleted successfully', 'success');

            // Refresh reviews & movie card
            if (this.currentMovieId) {
                await this.loadReviewsForMovie(this.currentMovieId);
                const updatedMovie = await ApiService.getMovieById(this.currentMovieId);
                document.getElementById('modalMovieAvgRating').textContent = updatedMovie.averageRating > 0 ? updatedMovie.averageRating.toFixed(1) : 'No ratings yet';
                document.getElementById('modalMovieTotalReviews').textContent = `Based on ${updatedMovie.totalReviews || 0} reviews`;
            }
            if (window.MovieApp) window.MovieApp.loadMovies();
        } catch (err) {
            showToast(err.message || 'Failed to delete review', 'danger');
        }
    }

    static async openMyReviewsModal() {
        const modalEl = document.getElementById('myReviewsModal');
        const container = document.getElementById('myReviewsListContainer');
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        try {
            const reviews = await ApiService.getUserReviews();
            if (!reviews || reviews.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-chat-square-quote fs-1 d-block mb-2"></i>
                        You haven't written any reviews yet.
                    </div>
                `;
                return;
            }

            container.innerHTML = reviews.map(rev => `
                <div class="review-item mb-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="text-primary mb-1">${rev.movieTitle || 'Movie #' + rev.movieId}</h6>
                            <div class="text-warning small mb-2">
                                ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
                                <span class="badge ${rev.status === 'APPROVED' ? 'bg-success' : (rev.status === 'PENDING' ? 'bg-warning text-dark' : 'bg-danger')} ms-2" style="font-size: 0.7rem;">
                                    ${rev.status}
                                </span>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="ReviewManager.deleteMyReview(${rev.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                    <p class="text-light small mb-0">${rev.comment}</p>
                </div>
            `).join('');
        } catch (err) {
            container.innerHTML = '<p class="text-danger small">Failed to load your reviews.</p>';
        }
    }

    static async deleteMyReview(id) {
        if (!confirm('Delete this review?')) return;
        try {
            await ApiService.deleteReview(id);
            showToast('Review deleted', 'success');
            this.openMyReviewsModal();
            if (window.MovieApp) window.MovieApp.loadMovies();
        } catch (err) {
            showToast(err.message || 'Failed to delete review', 'danger');
        }
    }

    static bindEvents() {
        const form = document.getElementById('reviewSubmitForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (!AuthManager.isLoggedIn()) {
                    showToast('Please login to write a review', 'warning');
                    return;
                }

                const ratingRadio = document.querySelector('input[name="rating"]:checked');
                if (!ratingRadio) {
                    showToast('Please select a rating between 1 and 5 stars', 'warning');
                    return;
                }

                const rating = parseInt(ratingRadio.value, 10);
                const comment = document.getElementById('reviewCommentInput').value.trim();

                if (!comment) {
                    showToast('Please write a review comment', 'warning');
                    return;
                }

                try {
                    if (ReviewManager.userExistingReviewId) {
                        await ApiService.updateReview(ReviewManager.userExistingReviewId, { rating, comment });
                        showToast('Your review has been updated!', 'success');
                    } else {
                        await ApiService.submitReview(ReviewManager.currentMovieId, { rating, comment });
                        showToast('Review submitted successfully!', 'success');
                    }

                    // Reload reviews and update movie stats
                    await ReviewManager.loadReviewsForMovie(ReviewManager.currentMovieId);
                    const updatedMovie = await ApiService.getMovieById(ReviewManager.currentMovieId);
                    document.getElementById('modalMovieAvgRating').textContent = updatedMovie.averageRating > 0 ? updatedMovie.averageRating.toFixed(1) : 'No ratings yet';
                    document.getElementById('modalMovieTotalReviews').textContent = `Based on ${updatedMovie.totalReviews || 0} reviews`;

                    if (window.MovieApp) window.MovieApp.loadMovies();
                } catch (err) {
                    showToast(err.message || 'Failed to submit review', 'danger');
                }
            });
        }

        const cancelBtn = document.getElementById('cancelEditReviewBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                ReviewManager.resetReviewForm();
            });
        }
    }
}

function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, "\\'").replace(/\n/g, ' ');
}
