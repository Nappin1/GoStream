/**
 * GoStream — Cinematic UI/UX Enhancements
 * Handles: navbar glass effect, dynamic bg color extraction, staggered
 * card entrance, modal animations, watchlist micro-interaction,
 * play-button idle pulse, and instant search overlay.
 */

/* ============================================================
   1. NAVBAR — Scroll-aware glass effect
   ============================================================ */
(function initNavbarScroll() {
    const nav = document.getElementById('top-navbar');
    if (!nav) return;

    const onScroll = () => {
        if (window.scrollY > 40) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
})();


/* ============================================================
   2. DYNAMIC BACKGROUND COLOR EXTRACTION (Color Thief)
   ============================================================ */
let _colorThief = null;
let _dynamicBgDebounce = null;

function getDynamicBgOverlay() {
    return document.getElementById('dynamic-bg-overlay');
}

/**
 * Call this whenever the active banner/hero poster changes.
 * Pass an <img> element or a URL string.
 */
window.updateDynamicBgColor = function (imgSrcOrEl) {
    clearTimeout(_dynamicBgDebounce);
    _dynamicBgDebounce = setTimeout(() => {
        try {
            if (typeof ColorThief === 'undefined') return;
            if (!_colorThief) _colorThief = new ColorThief();

            const overlay = getDynamicBgOverlay();
            if (!overlay) return;

            const doExtract = (imgEl) => {
                if (!imgEl.complete || imgEl.naturalWidth === 0) {
                    imgEl.addEventListener('load', () => doExtract(imgEl), { once: true });
                    return;
                }
                try {
                    const [r, g, b] = _colorThief.getColor(imgEl);
                    // Darken the extracted color significantly so it doesn't overpower dark UI
                    const darkenFactor = 0.18;
                    const dr = Math.round(r * darkenFactor);
                    const dg = Math.round(g * darkenFactor);
                    const db = Math.round(b * darkenFactor);
                    overlay.style.background = `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(${dr},${dg},${db},0.55) 0%, transparent 70%)`;
                    overlay.classList.add('active');
                } catch (e) {
                    // Cross-origin or other error — silently ignore
                }
            };

            if (typeof imgSrcOrEl === 'string') {
                // Create a proxy image to avoid CORS issues
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = imgSrcOrEl;
                doExtract(img);
            } else if (imgSrcOrEl instanceof HTMLImageElement) {
                doExtract(imgSrcOrEl);
            }
        } catch (e) { /* silent */ }
    }, 200);
};


/* ============================================================
   3. STAGGERED CAROUSEL ROW ENTRANCE (Intersection Observer)
   ============================================================ */
let _rowObserver = null;

function initRowObserver() {
    if (_rowObserver) return;

    _rowObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const row = entry.target;
            if (row.dataset.animated) return;
            row.dataset.animated = '1';

            // Get all movie cards within this row
            const cards = row.querySelectorAll('.movie-card');
            cards.forEach((card, i) => {
                card.style.animationDelay = `${i * 55}ms`;
            });
            row.classList.add('row-visible');

            _rowObserver.unobserve(row);
        });
    }, {
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.05
    });
}

/**
 * Call after any carousel row is rendered to register it with the observer.
 * @param {string|Element} containerOrId  - The discovery-row wrapper element or its id
 */
window.observeCarouselRow = function (containerOrId) {
    initRowObserver();
    const el = typeof containerOrId === 'string'
        ? document.getElementById(containerOrId)
        : containerOrId;
    if (el && !el.dataset.animated) {
        _rowObserver.observe(el);
    }
};

// Auto-observe all existing rows on page load
document.addEventListener('DOMContentLoaded', () => {
    initRowObserver();
    document.querySelectorAll('.discovery-row').forEach(row => {
        _rowObserver.observe(row);
    });
});

// Also re-observe rows after partial renders (polls for new rows)
let _rowScanTimer = null;
function schedulRowScan() {
    clearTimeout(_rowScanTimer);
    _rowScanTimer = setTimeout(() => {
        document.querySelectorAll('.discovery-row:not([data-observed])').forEach(row => {
            row.dataset.observed = '1';
            _rowObserver && _rowObserver.observe(row);
        });
    }, 300);
}

// Observe DOM for new rows being added
const _rowMutationObserver = new MutationObserver(schedulRowScan);
_rowMutationObserver.observe(document.body, { childList: true, subtree: true });


/* ============================================================
   4. MODAL EXPAND ANIMATION — already handled via CSS
      (.modal-overlay > div starts scaled down, .open scales to 1)
      Nothing extra needed here. Details modal inner div gets
      transition via the CSS rule already.
   ============================================================ */


/* ============================================================
   5. WATCHLIST MICRO-INTERACTION
      Wrap calls around the existing addToWatchlist / removeFromWatchlist
      to trigger the icon morph animation.
   ============================================================ */

/**
 * Trigger the watchlist button animation.
 * @param {Element} btnEl  - The button that was clicked
 * @param {boolean} added  - true = item was added (show checkmark), false = removed
 */
window.animateWatchlistBtn = function (btnEl, added) {
    if (!btnEl) return;
    const iconEl = btnEl.querySelector('i, .ph, [class*="ph-"]') || btnEl.querySelector('.watchlist-btn-icon');
    if (!iconEl) return;

    btnEl.classList.add('watchlist-btn');

    if (added) {
        iconEl.classList.add('watchlist-check-pop');
        btnEl.classList.add('in-list');
        setTimeout(() => iconEl.classList.remove('watchlist-check-pop'), 500);
    } else {
        btnEl.classList.remove('in-list');
    }
};


/* ============================================================
   6. PLAY BUTTON IDLE PULSE
      After 5 seconds of no mouse movement on the details modal,
      add the pulse animation to the primary play button.
   ============================================================ */
let _idlePulseTimer = null;

window.startIdlePlayPulse = function () { return () => {}; };

window.stopIdlePlayPulse = function () {};


/* ============================================================
   7. INSTANT SEARCH OVERLAY (Desktop Navbar)
   ============================================================ */
let _instantSearchDebounce = null;
let _lastInstantQuery = '';

window.handleNavSearch = function (query) {
    query = (query || '').trim();
    const overlay = document.getElementById('search-instant-overlay');
    if (!overlay) return;

    if (!query || query.length < 2) {
        closeInstantSearch();
        return;
    }

    if (query === _lastInstantQuery) return;
    _lastInstantQuery = query;

    // Show loading state immediately
    overlay.innerHTML = `<div class="search-instant-section-label" style="padding:16px;color:#94a3b8;font-size:0.8rem;">Searching…</div>`;
    overlay.classList.add('open');

    clearTimeout(_instantSearchDebounce);
    _instantSearchDebounce = setTimeout(() => {
        fetchInstantResults(query).then(({ tmdb, anilist }) => {
            renderInstantResults(query, tmdb, anilist, overlay);
        });
    }, 280);
};

window.closeInstantSearch = function () {
    const overlay = document.getElementById('search-instant-overlay');
    if (overlay) overlay.classList.remove('open');
    _lastInstantQuery = '';
};

async function fetchInstantResults(query) {
    const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c';
    const TMDB_BASE = 'https://api.themoviedb.org/3';
    const ANILIST_URL = 'https://graphql.anilist.co';

    const anilistGql = `query ($search: String) {
        Page(page: 1, perPage: 8) {
            media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
                id
                title { romaji english }
                coverImage { medium }
                format
                averageScore
                status
                seasonYear
                startDate { year }
            }
        }
    }`;

    const [tmdbRes, anilistRes] = await Promise.all([
        fetch(`${TMDB_BASE}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1&include_adult=false`)
            .then(r => r.json()).catch(() => ({ results: [] })),
        fetch(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: anilistGql, variables: { search: query } })
        }).then(r => r.json()).catch(() => null)
    ]);

    // Filter TMDB: exclude Japanese animation (likely duplicates of AniList results)
    const tmdbFiltered = (tmdbRes.results || []).filter(i => {
        if (i.media_type === 'person') return true;
        const isAnime = i.genre_ids && i.genre_ids.includes(16)
            && i.origin_country && i.origin_country.includes('JP');
        return !isAnime;
    }).slice(0, 8);

    const anilistItems = (anilistRes?.data?.Page?.media) || [];

    return { tmdb: tmdbFiltered, anilist: anilistItems };
}

function renderInstantResults(query, tmdbResults, anilistResults, overlay) {
    const hasAnime = anilistResults.length > 0;
    const hasTmdb  = tmdbResults.length > 0;

    if (!hasAnime && !hasTmdb) {
        overlay.innerHTML = `<div style="padding:20px 16px;color:#94a3b8;font-size:0.82rem;text-align:center;">No results for "<strong style="color:#fff">${escHtml(query)}</strong>"</div>`;
        return;
    }

    const TMDB_IMG   = 'https://image.tmdb.org/t/p/w92';
    const PLACEHOLDER = 'https://placehold.co/40x56/1e293b/FFF?text=?';

    // Decide order: anime-dominant when AniList top result title matches query
    const queryLower = query.toLowerCase().trim();
    const topAnimeTitle = hasAnime
        ? ((anilistResults[0].title.english || anilistResults[0].title.romaji || '').toLowerCase())
        : '';
    const isAnimeDominant = hasAnime && (
        topAnimeTitle.includes(queryLower) ||
        queryLower.includes(topAnimeTitle.split(' ')[0]) ||
        anilistResults.length >= tmdbResults.length
    );

    let html = '';

    // ---- Helper: build one AniList item row ----
    const buildAnimeRow = (item) => {
        const title  = item.title.english || item.title.romaji || 'Unknown';
        const year   = item.seasonYear || (item.startDate && item.startDate.year) || '';
        const score  = item.averageScore ? `⭐ ${(item.averageScore / 10).toFixed(1)}` : '';
        const poster = item.coverImage?.medium || PLACEHOLDER;
        const fmt    = item.format ? item.format.replace(/_/g, ' ') : 'Anime';
        return `
            <div class="search-instant-item" onclick="openAnilistDetails(${item.id}); closeInstantSearch();" role="button" tabindex="0">
                <img src="${escHtml(poster)}" alt="${escHtml(title)}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
                <div style="flex:1;min-width:0;">
                    <div class="si-title">${escHtml(title)}</div>
                    <div class="si-meta">
                        <span style="color:#f472b6;font-weight:700;font-size:0.68rem;">${escHtml(fmt)}</span>
                        ${year   ? `<span style="margin-left:6px;">${year}</span>`   : ''}
                        ${score  ? `<span style="margin-left:6px;">${score}</span>`  : ''}
                    </div>
                </div>
                <i class="ph ph-arrow-right" style="color:#94a3b8;font-size:0.8rem;flex-shrink:0;"></i>
            </div>`;
    };

    // ---- Helper: build one TMDB item row ----
    const buildTmdbRow = (item) => {
        const title  = item.title || item.name || 'Unknown';
        const type   = item.media_type || 'movie';
        const year   = (item.release_date || item.first_air_date || '').slice(0, 4);
        const score  = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : '';
        const poster = item.poster_path ? TMDB_IMG + item.poster_path : PLACEHOLDER;
        const typeLabel = type === 'movie' ? 'Movie' : type === 'tv' ? 'TV Show' : 'Person';
        const typeColor = type === 'movie' ? '#cae962' : type === 'tv' ? '#60a5fa' : '#f472b6';
        const clickFn   = type === 'person'
            ? `openActorDetails(${item.id}); closeInstantSearch();`
            : `openTMDBDetails(${item.id},'${type}'); closeInstantSearch();`;
        return `
            <div class="search-instant-item" onclick="${clickFn}" role="button" tabindex="0">
                <img src="${escHtml(poster)}" alt="${escHtml(title)}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
                <div style="flex:1;min-width:0;">
                    <div class="si-title">${escHtml(title)}</div>
                    <div class="si-meta">
                        <span style="color:${typeColor};font-weight:700;font-size:0.68rem;">${typeLabel}</span>
                        ${year  ? `<span style="margin-left:6px;">${year}</span>`  : ''}
                        ${score ? `<span style="margin-left:6px;">${score}</span>` : ''}
                    </div>
                </div>
                <i class="ph ph-arrow-right" style="color:#94a3b8;font-size:0.8rem;flex-shrink:0;"></i>
            </div>`;
    };

    // ---- Render in the right order ----
    if (isAnimeDominant) {
        // Anime section first
        if (hasAnime) {
            html += `<div class="search-instant-section-label">Anime <span style="color:#f472b6">· AniList</span></div>`;
            anilistResults.slice(0, 5).forEach(item => { html += buildAnimeRow(item); });
        }
        // Then non-anime TMDB results (capped so overlay stays compact)
        if (hasTmdb) {
            html += `<div class="search-instant-section-label" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">Movies & TV</div>`;
            tmdbResults.slice(0, 3).forEach(item => { html += buildTmdbRow(item); });
        }
    } else {
        // TMDB-first order
        if (hasTmdb) {
            html += `<div class="search-instant-section-label">Movies & TV</div>`;
            tmdbResults.slice(0, 5).forEach(item => { html += buildTmdbRow(item); });
        }
        if (hasAnime) {
            html += `<div class="search-instant-section-label" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">Anime <span style="color:#f472b6">· AniList</span></div>`;
            anilistResults.slice(0, 3).forEach(item => { html += buildAnimeRow(item); });
        }
    }

    // "View all" footer
    const safeQ = escHtml(query);
    html += `<div onclick="performSearch('${safeQ}'); closeInstantSearch();"
                 class="search-instant-item"
                 style="border-top:1px solid rgba(255,255,255,0.08);justify-content:center;color:#cae962;font-weight:700;font-size:0.8rem;"
                 role="button" tabindex="0">
                 <i class="ph ph-magnifying-glass" style="margin-right:6px;"></i>View all results for "${safeQ}"
             </div>`;

    overlay.innerHTML = html;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Close instant search when clicking outside
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('search-instant-overlay');
    const wrap = document.getElementById('nav-search-wrap');
    if (!overlay || !wrap) return;
    if (!overlay.contains(e.target) && !wrap.contains(e.target)) {
        closeInstantSearch();
    }
});


/* ============================================================
   8. ENHANCED BANNER CONTENT BUILDER
      Patches the existing banner rendering to use new cinematic
      HTML structure with proper buttons and dynamic bg color.
   ============================================================ */

/**
 * Build the enhanced banner HTML for a TMDB item.
 * This replaces simple text with a full cinematic layout.
 */
window.buildCinematicBannerHtml = function ({ title, overview, rating, year, genres, id, type, posterPath }) {
    const genreTags = (genres || []).slice(0, 3).map(g =>
        `<span class="banner-badge">${escHtml(g)}</span>`
    ).join('');

    const ratingHtml = rating
        ? `<span class="banner-rating-badge"><i class="ph-fill ph-star" style="color:#facc15;font-size:0.7rem;"></i>${parseFloat(rating).toFixed(1)}</span>`
        : '';

    const yearHtml = year ? `<span class="banner-rating-badge">${year}</span>` : '';

    const safeOverview = overview
        ? escHtml(overview.length > 180 ? overview.slice(0, 180) + '…' : overview)
        : '';

    const playAction = type === 'movie'
        ? `openTMDBPlayer(${id}, 'movie')`
        : `openDetailsWrapper(${id}, '${type}')`;

    const infoAction = `openDetailsWrapper(${id}, '${type}')`;

    return `
        <div class="banner-badge mb-3" style="background:rgba(202,233,98,0.1);border-color:rgba(202,233,98,0.3);">
            <i class="ph-fill ph-fire" style="margin-right:4px;"></i>Trending Now
        </div>
        <h2 class="banner-title-logo">${escHtml(title)}</h2>
        <div class="banner-meta-row">
            ${ratingHtml}
            ${yearHtml}
            ${genreTags}
        </div>
        ${safeOverview ? `<p class="banner-synopsis">${safeOverview}</p>` : ''}
        <div class="hero-actions">
            <button class="banner-btn-play" onclick="${playAction}">
                <i class="ph-fill ph-play"></i> Play
            </button>
            <button class="banner-btn-info" onclick="${infoAction}">
                <i class="ph ph-info"></i> More Info
            </button>
        </div>
    `;
};

/**
 * Build the enhanced banner HTML for an Anilist item.
 */
window.buildCinematicAnimeBannerHtml = function ({ title, overview, rating, year, genres, id }) {
    const genreTags = (genres || []).slice(0, 3).map(g =>
        `<span class="banner-badge">${escHtml(g)}</span>`
    ).join('');

    const ratingHtml = rating
        ? `<span class="banner-rating-badge"><i class="ph-fill ph-star" style="color:#facc15;font-size:0.7rem;"></i>${parseFloat(rating).toFixed(1)}</span>`
        : '';

    const yearHtml = year ? `<span class="banner-rating-badge">${year}</span>` : '';

    const safeOverview = overview
        ? escHtml(overview.replace(/<[^>]*>/g, '').slice(0, 180)) + (overview.length > 180 ? '…' : '')
        : '';

    return `
        <div class="banner-badge mb-3" style="background:rgba(202,233,98,0.1);border-color:rgba(202,233,98,0.3);">
            <i class="ph-fill ph-fire" style="margin-right:4px;"></i>Trending Anime
        </div>
        <h2 class="banner-title-logo">${escHtml(title)}</h2>
        <div class="banner-meta-row">
            ${ratingHtml}
            ${yearHtml}
            ${genreTags}
        </div>
        ${safeOverview ? `<p class="banner-synopsis">${safeOverview}</p>` : ''}
        <div class="hero-actions">
            <button class="banner-btn-play" onclick="openAnilistDetails(${id})">
                <i class="ph-fill ph-play"></i> Watch Now
            </button>
            <button class="banner-btn-info" onclick="openAnilistDetails(${id})">
                <i class="ph ph-info"></i> More Info
            </button>
        </div>
    `;
};
