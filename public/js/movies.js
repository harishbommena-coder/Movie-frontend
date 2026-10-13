// Movie Browsing & Details Module

class MovieManager {
    static activeGenre = 'All';
    static currentSearch = '';
    static allMovies = [];

    static async init() {
        await this.loadGenres();
        await this.loadMovies();
        this.bindEvents();
    }

    static async loadGenres() {
        try {
            const genres = await ApiService.getGenres();
            const genreContainer = document.getElementById('genreFilterContainer');
            if (!genreContainer) return;

            genreContainer.innerHTML = '';
            
            // "All" badge
            const allBadge = document.createElement('span');
            allBadge.className = `genre-badge ${this.activeGenre === 'All' ? 'active' : ''}`;
            allBadge.textContent = 'All Genres';
            allBadge.onclick = () => this.filterByGenre('All');
            genreContainer.appendChild(allBadge);

            genres.forEach(g => {
                const badge = document.createElement('span');
                badge.className = `genre-badge ${this.activeGenre === g ? 'active' : ''}`;
                badge.textContent = g;
                badge.onclick = () => this.filterByGenre(g);
                genreContainer.appendChild(badge);
            });
        } catch (err) {
            console.error('Failed to load genres:', err);
        }
    }

    static async loadMovies() {
        const grid = document.getElementById('movieGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="text-secondary mt-2">Loading movies...</p>
            </div>
        `;

        try {
            const movies = await ApiService.getMovies(this.currentSearch, this.activeGenre);
            this.allMovies = movies;
            this.renderMovieGrid(movies);
        } catch (err) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <p class="text-danger">Failed to load movies. Please check your connection.</p>
                </div>
            `;
        }
    }

    static renderMovieGrid(movies) {
        const grid = document.getElementById('movieGrid');
        const countSpan = document.getElementById('movieCountBadge');
        if (countSpan) countSpan.textContent = `${movies.length} movies`;

        if (!movies || movies.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-film text-secondary fs-1 mb-3 d-block"></i>
                    <h5 class="text-secondary">No movies found</h5>
                    <p class="text-muted small">Try searching with another keyword or selecting a different genre.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = movies.map(movie => {
            const poster = movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
            const rating = movie.averageRating > 0 ? movie.averageRating.toFixed(1) : 'New';
            const starClass = movie.averageRating > 0 ? 'bi-star-fill' : 'bi-star';

            return `
                <div class="col-sm-6 col-md-4 col-lg-3 mb-4">
                    <div class="movie-card" onclick="MovieManager.openMovieDetails(${movie.id})">
                        <div class="poster-container">
                            <img src="${poster}" alt="${movie.title}" class="poster-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'">
                            <div class="card-rating-badge">
                                <i class="bi ${starClass}"></i>
                                <span>${rating}</span>
                            </div>
                        </div>
                        <div class="movie-content">
                            <h6 class="movie-title" title="${movie.title}">${movie.title}</h6>
                            <div class="movie-meta">
                                <span>${movie.releaseYear}</span>
                                <span>•</span>
                                <span class="badge bg-secondary text-light">${movie.genre}</span>
                                ${movie.durationMinutes ? `<span>•</span><span>${movie.durationMinutes}m</span>` : ''}
                            </div>
                            <p class="movie-synopsis-snippet">${movie.synopsis || 'No synopsis available.'}</p>
                            <button class="btn btn-sm btn-outline-primary w-100 rounded-pill mt-auto" onclick="event.stopPropagation(); MovieManager.openMovieDetails(${movie.id})">
                                <i class="bi bi-info-circle me-1"></i> View Details & Reviews
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    static filterByGenre(genre) {
        this.activeGenre = genre;
        const badges = document.querySelectorAll('.genre-badge');
        badges.forEach(b => {
            if (b.textContent === genre || (genre === 'All' && b.textContent === 'All Genres')) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        this.loadMovies();
    }

    static async openMovieDetails(id) {
        try {
            const movie = await ApiService.getMovieById(id);
            window.MovieApp.currentMovieId = id;

            // Populate modal
            document.getElementById('modalMovieTitle').textContent = movie.title;
            document.getElementById('modalMoviePoster').src = movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
            document.getElementById('modalMovieGenre').textContent = movie.genre;
            document.getElementById('modalMovieYear').textContent = movie.releaseYear;
            document.getElementById('modalMovieDuration').textContent = movie.durationMinutes ? `${movie.durationMinutes} min` : 'N/A';
            document.getElementById('modalMovieDirector').textContent = movie.director || 'N/A';
            document.getElementById('modalMovieCast').textContent = movie.cast || 'N/A';
            document.getElementById('modalMovieSynopsis').textContent = movie.synopsis || 'No synopsis provided.';

            // Average Rating Display
            const avgRating = movie.averageRating > 0 ? movie.averageRating.toFixed(1) : 'No ratings yet';
            document.getElementById('modalMovieAvgRating').textContent = avgRating;
            document.getElementById('modalMovieTotalReviews').textContent = `Based on ${movie.totalReviews || 0} reviews`;

            // Star visual
            const starsContainer = document.getElementById('modalMovieAvgStars');
            if (starsContainer) {
                const roundedScore = Math.round(movie.averageRating || 0);
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    starsHtml += `<i class="bi ${i <= roundedScore ? 'bi-star-fill text-warning' : 'bi-star text-muted'} me-1"></i>`;
                }
                starsContainer.innerHTML = starsHtml;
            }

            // Trailer button
            const trailerBtn = document.getElementById('modalWatchTrailerBtn');
            if (trailerBtn) {
                if (movie.trailerUrl) {
                    trailerBtn.classList.remove('d-none');
                    trailerBtn.onclick = () => MovieManager.openTrailer(movie.trailerUrl, movie.title);
                } else {
                    trailerBtn.classList.add('d-none');
                }
            }

            // Load reviews for this movie
            await ReviewManager.loadReviewsForMovie(id);

            // Show modal
            const movieModal = new bootstrap.Modal(document.getElementById('movieDetailsModal'));
            movieModal.show();
        } catch (err) {
            showToast(err.message || 'Error loading movie details', 'danger');
        }
    }

    static openTrailer(trailerUrl, movieTitle) {
        const trailerModalEl = document.getElementById('trailerModal');
        const trailerTitle = document.getElementById('trailerModalTitle');
        const iframe = document.getElementById('trailerIframe');

        if (trailerTitle) trailerTitle.textContent = `${movieTitle} - Official Trailer`;

        // Parse YouTube URL if standard watch?v= format
        let embedUrl = trailerUrl;
        if (trailerUrl.includes('watch?v=')) {
            const videoId = trailerUrl.split('watch?v=')[1]?.split('&')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }

        if (iframe) {
            iframe.src = `${embedUrl}?autoplay=1`;
        }

        const trailerModal = new bootstrap.Modal(trailerModalEl);
        trailerModal.show();

        // Stop video when closed
        trailerModalEl.addEventListener('hidden.bs.modal', () => {
            if (iframe) iframe.src = '';
        }, { once: true });
    }

    static bindEvents() {
        const searchInput = document.getElementById('movieSearchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    MovieManager.currentSearch = e.target.value.trim();
                    MovieManager.loadMovies();
                }, 300);
            });
        }
    }
}
