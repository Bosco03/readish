class BookFinder {
    constructor() {
        this.books = [];
        this.currentPage = 1;
        this.booksPerPage = 6;

        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.results = document.getElementById('results');
        this.resultsTitle = document.getElementById('resultsTitle');
        this.booksGrid = document.getElementById('booksGrid');
        this.pagination = document.getElementById('pagination');
        
        // Modal elements
        this.modal = document.getElementById('bookModal');
        this.closeBtn = document.querySelector('.close');
        
        this.bindEvents();
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchBooks());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchBooks();
            }
        });

        // Modal events
        this.closeBtn.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
    }

    async searchBooks() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('Please enter a search term');
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch books');
            }

            const data = await response.json();
            this.displayResults(data.items || [], query);
        } catch (error) {
            this.showError('Failed to search books. Please try again.');
            console.error('Search error:', error);
        } finally {
            this.hideLoading();
        }
    }

    displayResults(books, query) {
        this.books = books;
        this.currentPage = 1;
        this.resultsTitle.textContent = `Search Results for "${query}" (${books.length} books found)`;
        this.renderPage();
        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
    }

    renderPage() {
        this.booksGrid.innerHTML = '';
        const start = (this.currentPage - 1) * this.booksPerPage;
        const end = start + this.booksPerPage;
        const pageBooks = this.books.slice(start, end);

        if (pageBooks.length === 0 && this.books.length === 0) {
            this.booksGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: white;">
                    <h3>No books found</h3>
                    <p>Try searching with different keywords</p>
                </div>
            `;
        } else {
            pageBooks.forEach(book => {
                const bookCard = this.createBookCard(book);
                this.booksGrid.appendChild(bookCard);
            });
        }

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.books.length / this.booksPerPage);
        
        if (totalPages <= 1) {
            this.pagination.innerHTML = '';
            return;
        }

        this.pagination.innerHTML = `
            <button id="prevPage" ${this.currentPage === 1 ? 'disabled' : ''}>← Previous</button>
            <span>Page ${this.currentPage} of ${totalPages}</span>
            <button id="nextPage" ${this.currentPage >= totalPages ? 'disabled' : ''}>Next →</button>
        `;

        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderPage();
                this.results.scrollIntoView({ behavior: 'smooth' });
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderPage();
                this.results.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    createBookCard(book) {
        const volumeInfo = book.volumeInfo || {};
        const title = volumeInfo.title || 'Unknown Title';
        const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author';
        const description = volumeInfo.description || 'No description available';
        const thumbnail = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '';
        const rating = volumeInfo.averageRating || 0;
        const ratingCount = volumeInfo.ratingsCount || 0;

        const card = document.createElement('div');
        card.className = 'book-card';
        
        card.innerHTML = `
            ${thumbnail ? 
                `<img src="${thumbnail.replace('http:', 'https:')}" alt="${title}" class="book-cover">` : 
                '<div class="book-cover">📚</div>'
            }
            <div class="book-info">
                <div class="book-title">${this.escapeHtml(title)}</div>
                <div class="book-author">${this.escapeHtml(authors)}</div>
                <div class="book-description">${this.escapeHtml(this.stripHtml(description))}</div>
                ${rating > 0 ? `
                    <div class="book-rating">
                        <span class="stars">${this.generateStars(rating)}</span>
                        <span>${rating.toFixed(1)} (${ratingCount} reviews)</span>
                    </div>
                ` : ''}
            </div>
        `;

        card.addEventListener('click', () => this.openModal(book));
        return card;
    }

    openModal(book) {
        const volumeInfo = book.volumeInfo || {};
        
        // Populate modal content
        document.getElementById('modalTitle').textContent = volumeInfo.title || 'Book Details';
        document.getElementById('modalBookTitle').textContent = volumeInfo.title || 'Unknown Title';
        document.getElementById('modalAuthor').textContent = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author';
        
        // ISBN
        const isbn = volumeInfo.industryIdentifiers ? 
            volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')?.identifier || 'Not Available' : 
            'Not Available';
        document.getElementById('modalISBN').textContent = isbn;
        
        document.getElementById('modalPublished').textContent = volumeInfo.publishedDate || 'Unknown';
        document.getElementById('modalGenre').textContent = volumeInfo.categories ? volumeInfo.categories.join(', ') : 'Not Specified';
        
        // Rating
        const rating = volumeInfo.averageRating || 0;
        const ratingCount = volumeInfo.ratingsCount || 0;
        const ratingText = rating > 0 ? 
            `${this.generateStars(rating)} ${rating.toFixed(1)} (${ratingCount} reviews)` : 
            'No ratings available';
        document.getElementById('modalRating').innerHTML = ratingText;
        
        document.getElementById('modalPublisher').textContent = volumeInfo.publisher || 'Unknown';
        document.getElementById('modalPages').textContent = volumeInfo.pageCount || 'Unknown';
        document.getElementById('modalDescription').textContent = this.stripHtml(volumeInfo.description || 'No description available');
        
        // Cover image
        const coverImg = document.getElementById('modalCover');
        const thumbnail = volumeInfo.imageLinks?.large || volumeInfo.imageLinks?.medium || volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;
        if (thumbnail) {
            coverImg.src = thumbnail.replace('http:', 'https:');
            coverImg.style.display = 'block';
        } else {
            coverImg.style.display = 'none';
        }
        
        this.modal.style.display = 'block';
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '★';
        }

        if (hasHalfStar) {
            stars += '☆';
        }

        while (stars.length < 5) {
            stars += '☆';
        }

        return stars;
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.results.style.display = 'none';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError(message) {
        this.error.textContent = message;
        this.error.style.display = 'block';
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        this.error.style.display = 'none';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BookFinder();
});