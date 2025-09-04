
        
        // Constants
        const API_KEY = "32e5e53999e380a0291d66fb304153fe";
        const BASE_URL = "https://api.themoviedb.org/3";
        const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

        // Global variables
        let currentMediaData = null;
        let isLoading = false;
        let searchMode = 'id'; // 'id' or 'name'

        // DOM Elements
        const elements = {
            contentType: document.getElementById('contentType'),
            imageType: document.getElementById('imageType'),
            mediaId: document.getElementById('mediaId'),
            searchBtn: document.getElementById('searchBtn'),
            searchText: document.getElementById('searchText'),
            loadingIcon: document.getElementById('loadingIcon'),
            progressContainer: document.getElementById('progressContainer'),
            progressText: document.getElementById('progressText'),
            progressBar: document.getElementById('progressBar'),
            errorContainer: document.getElementById('errorContainer'),
            errorText: document.getElementById('errorText'),
            resultsContainer: document.getElementById('resultsContainer'),
            mediaTitle: document.getElementById('mediaTitle'),
            mediaBadges: document.getElementById('mediaBadges'),
            mediaOverview: document.getElementById('mediaOverview'),
            copyMessage: document.getElementById('copyMessage'),
            contentContainer: document.getElementById('contentContainer'),
            copyAllBtn: document.getElementById('copyAllBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            imageModal: document.getElementById('imageModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalImage: document.getElementById('modalImage'),
            modalUrl: document.getElementById('modalUrl'),
            modalCopyBtn: document.getElementById('modalCopyBtn'),
            modalOpenBtn: document.getElementById('modalOpenBtn'),
            closeModal: document.getElementById('closeModal'),
            searchByIdBtn: document.getElementById('searchByIdBtn'),
            searchByNameBtn: document.getElementById('searchByNameBtn'),
            searchTypeDescription: document.getElementById('searchTypeDescription'),
            searchResultsContainer: document.getElementById('searchResultsContainer'),
            searchResults: document.getElementById('searchResults')
        };

        // Event Listeners
        elements.contentType.addEventListener('change', handleContentTypeChange);
        elements.searchBtn.addEventListener('click', handleSearch);
        elements.mediaId.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
        elements.searchByIdBtn.addEventListener('click', () => setSearchMode('id'));
        elements.searchByNameBtn.addEventListener('click', () => setSearchMode('name'));
        elements.mediaId.addEventListener('input', handleSearchInput);
        elements.copyAllBtn.addEventListener('click', copyAllImageUrls);
        elements.downloadBtn.addEventListener('click', downloadJSON);
        elements.imageModal.addEventListener('click', closeImagePreview);
        elements.closeModal.addEventListener('click', closeImagePreview);
        elements.modalCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(elements.modalUrl.textContent);
            showCopyMessage('URL copiada');
        });
        elements.modalOpenBtn.addEventListener('click', () => {
            window.open(elements.modalUrl.textContent, '_blank');
        });

        // Functions
        function setSearchMode(mode) {
            searchMode = mode;
            
            // Update button styles
            if (mode === 'id') {
                elements.searchByIdBtn.className = 'btn-primary text-sm px-4 py-2';
                elements.searchByNameBtn.className = 'btn-outline text-sm px-4 py-2';
                elements.searchTypeDescription.innerHTML = `
                    <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                        🔍 Buscar por ID
                    </h3>
                    <p class="text-gray-600">Ingresa el ID, selecciona el tipo de contenido y los proveedores para extraer enlaces específicos</p>
                `;
                elements.mediaId.placeholder = elements.contentType.value === 'tv' 
                    ? 'Ej: 1399 (Game of Thrones)' 
                    : 'Ej: 550 (Fight Club)';
                elements.searchText.textContent = '🔍 Extraer';
            } else {
                elements.searchByIdBtn.className = 'btn-outline text-sm px-4 py-2';
                elements.searchByNameBtn.className = 'btn-primary text-sm px-4 py-2';
                elements.searchTypeDescription.innerHTML = `
                    <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                        🔍 Buscar por Nombre
                    </h3>
                    <p class="text-gray-600">Escribe el nombre de la serie o película para buscarla y seleccionarla</p>
                `;
                elements.mediaId.placeholder = elements.contentType.value === 'tv' 
                    ? 'Ej: Game of Thrones, Breaking Bad...' 
                    : 'Ej: Fight Club, The Matrix...';
                elements.searchText.textContent = '🔍 Buscar';
            }
            
            // Clear results
            clearResults();
            elements.searchResultsContainer.classList.add('hidden');
        }

        function handleSearchInput() {
            if (searchMode === 'name') {
                const query = elements.mediaId.value.trim();
                if (query.length >= 3) {
                    debounceSearch(query);
                } else {
                    elements.searchResultsContainer.classList.add('hidden');
                }
            }
        }

        let searchTimeout;
        function debounceSearch(query) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchByName(query);
            }, 500);
        }

        async function searchByName(query) {
            const contentType = elements.contentType.value;
            
            try {
                const response = await fetch(
                    `${BASE_URL}/search/${contentType}?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}`
                );
                
                if (!response.ok) throw new Error('Error en la búsqueda');
                
                const data = await response.json();
                displaySearchResults(data.results.slice(0, 10)); // Mostrar solo los primeros 10 resultados
                
            } catch (error) {
                console.error('Error searching:', error);
                elements.searchResultsContainer.classList.add('hidden');
            }
        }

        function displaySearchResults(results) {
            if (!results || results.length === 0) {
                elements.searchResultsContainer.classList.add('hidden');
                return;
            }

            const contentType = elements.contentType.value;
            let resultsHTML = '';

            results.forEach(item => {
                const title = item.name || item.title;
                const year = item.first_air_date || item.release_date;
                const yearText = year ? ` (${year.split('-')[0]})` : '';
                const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : '';
                
                resultsHTML += `
                    <div class="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 cursor-pointer transition-colors"
                         onclick="selectSearchResult(${item.id}, '${title.replace(/'/g, "\\'")}')">
                        <div class="flex-shrink-0">
                            ${posterPath ? 
                                `<img src="${posterPath}" alt="${title}" class="w-12 h-16 object-cover rounded">` :
                                `<div class="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                </div>`
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-semibold text-gray-800 truncate">${title}${yearText}</p>
                            <p class="text-sm text-gray-500">ID: ${item.id}</p>
                            ${item.overview ? `<p class="text-xs text-gray-400 truncate mt-1">${item.overview}</p>` : ''}
                        </div>
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                        </div>
                    </div>
                `;
            });

            elements.searchResults.innerHTML = resultsHTML;
            elements.searchResultsContainer.classList.remove('hidden');
        }

        function selectSearchResult(id, title) {
            elements.mediaId.value = id;
            elements.searchResultsContainer.classList.add('hidden');
            
            // Cambiar automáticamente a modo ID y proceder con la extracción
            setSearchMode('id');
            fetchMediaData();
        }

        function handleSearch() {
            if (searchMode === 'id') {
                fetchMediaData();
            } else {
                const query = elements.mediaId.value.trim();
                if (query.length >= 3) {
                    searchByName(query);
                } else {
                    showError('Por favor ingresa al menos 3 caracteres para buscar');
                }
            }
        }

        function handleContentTypeChange() {
            const contentType = elements.contentType.value;
            const imageType = elements.imageType.value;
            
            // Update placeholder based on search mode
            if (searchMode === 'id') {
                elements.mediaId.placeholder = contentType === 'tv' 
                    ? 'Ej: 1399 (Game of Thrones)' 
                    : 'Ej: 550 (Fight Club)';
            } else {
                elements.mediaId.placeholder = contentType === 'tv' 
                    ? 'Ej: Game of Thrones, Breaking Bad...' 
                    : 'Ej: Fight Club, The Matrix...';
            }
            
            // Update image type options
            updateImageTypeOptions(contentType);
            
            // Auto-change image type if episodes is selected for movies
            if (contentType === 'movie' && imageType === 'episodes') {
                elements.imageType.value = 'backdrops';
            }
            
            // Clear previous results
            clearResults();
            elements.searchResultsContainer.classList.add('hidden');
        }

        function updateImageTypeOptions(contentType) {
            const imageTypeSelect = elements.imageType;
            imageTypeSelect.innerHTML = '';
            
            if (contentType === 'tv') {
                imageTypeSelect.innerHTML += '<option value="episodes">📷 Imágenes de Episodios</option>';
            }
            imageTypeSelect.innerHTML += '<option value="backdrops">🖼️ Fondos (Backdrops)</option>';
            imageTypeSelect.innerHTML += '<option value="posters">🎭 Pósters</option>';
        }

        function clearResults() {
            currentMediaData = null;
            elements.resultsContainer.classList.add('hidden');
            elements.errorContainer.classList.add('hidden');
        }

        function showError(message) {
            elements.errorText.textContent = message;
            elements.errorContainer.classList.remove('hidden');
        }

        function hideError() {
            elements.errorContainer.classList.add('hidden');
        }

        function setLoading(loading) {
            isLoading = loading;
            elements.searchBtn.disabled = loading;
            elements.mediaId.disabled = loading;
            
            if (loading) {
                elements.searchText.textContent = '⏳ Procesando...';
                elements.loadingIcon.classList.remove('hidden');
            } else {
                elements.searchText.textContent = '🔍 Extraer';
                elements.loadingIcon.classList.add('hidden');
                elements.progressContainer.classList.add('hidden');
            }
        }

        function updateProgress(current, total) {
            if (total > 0) {
                elements.progressContainer.classList.remove('hidden');
                elements.progressText.textContent = `${current}/${total}`;
                const percentage = (current / total) * 100;
                elements.progressBar.style.width = `${percentage}%`;
            }
        }

        function showCopyMessage(message) {
            elements.copyMessage.querySelector('p').textContent = message;
            elements.copyMessage.classList.remove('hidden');
            setTimeout(() => {
                elements.copyMessage.classList.add('hidden');
            }, 3000);
        }


        async function fetchMediaData() {
            const mediaId = elements.mediaId.value.trim();
            const contentType = elements.contentType.value;
            const imageType = elements.imageType.value;

            if (!mediaId) {
                showError('Por favor ingresa un ID válido');
                return;
            }

            setLoading(true);
            hideError();
            clearResults();

            try {
                const mediaResponse = await fetch(`${BASE_URL}/${contentType}/${mediaId}?api_key=${API_KEY}&language=es-ES`);

                if (!mediaResponse.ok) {
                    throw new Error(`${contentType === 'tv' ? 'Serie' : 'Película'} no encontrada. Verifica el ID.`);
                }

                const media = await mediaResponse.json();

                if (contentType === 'movie') {
                    const imagesResponse = await fetch(`${BASE_URL}/movie/${mediaId}/images?api_key=${API_KEY}`);
                    const images = imagesResponse.ok ? await imagesResponse.json() : { backdrops: [], posters: [] };

                    currentMediaData = {
                        id: media.id,
                        name: media.title,
                        title: media.title,
                        overview: media.overview,
                        poster_path: media.poster_path,
                        backdrop_path: media.backdrop_path,
                        images,
                        type: 'movie'
                    };
                } else {
                    if (imageType === 'episodes') {
                        const seasons = [];
                        let totalEpisodes = 0;
                        let episodesWithImages = 0;

                        const validSeasons = media.seasons.filter(s => s.season_number > 0);
                        
                        for (let i = 0; i < validSeasons.length; i++) {
                            const season = validSeasons[i];
                            updateProgress(i + 1, validSeasons.length);

                            const seasonResponse = await fetch(
                                `${BASE_URL}/tv/${mediaId}/season/${season.season_number}?api_key=${API_KEY}&language=es-ES`
                            );

                            if (seasonResponse.ok) {
                                const seasonData = await seasonResponse.json();

                                seasons.push({
                                    season_number: season.season_number,
                                    name: seasonData.name,
                                    episodes: seasonData.episodes,
                                });

                                totalEpisodes += seasonData.episodes.length;
                                episodesWithImages += seasonData.episodes.filter(ep => ep.still_path).length;
                            }

                            await new Promise(resolve => setTimeout(resolve, 100));
                        }

                        currentMediaData = {
                            id: media.id,
                            name: media.name,
                            overview: media.overview,
                            poster_path: media.poster_path,
                            backdrop_path: media.backdrop_path,
                            seasons,
                            totalEpisodes,
                            episodesWithImages,
                            type: 'tv'
                        };
                    } else {
                        const imagesResponse = await fetch(`${BASE_URL}/tv/${mediaId}/images?api_key=${API_KEY}`);
                        const images = imagesResponse.ok ? await imagesResponse.json() : { backdrops: [], posters: [] };

                        currentMediaData = {
                            id: media.id,
                            name: media.name,
                            overview: media.overview,
                            poster_path: media.poster_path,
                            backdrop_path: media.backdrop_path,
                            images,
                            type: 'tv'
                        };
                    }
                }

                displayResults();
            } catch (err) {
                showError(err.message || 'Error al obtener los datos');
            } finally {
                setLoading(false);
            }
        }

        function displayResults() {
            if (!currentMediaData) return;

            const contentType = elements.contentType.value;
            const imageType = elements.imageType.value;

            // Update media info
            elements.mediaTitle.textContent = currentMediaData.name || currentMediaData.title;
            elements.mediaOverview.textContent = currentMediaData.overview || '';

            // Update badges
            let badgesHTML = `<span class="badge">${contentType === 'tv' ? 'Serie' : 'Película'}</span>`;
            
            if (imageType === 'episodes' && currentMediaData.totalEpisodes) {
                badgesHTML += `<span class="badge">${currentMediaData.totalEpisodes} episodios</span>`;
                badgesHTML += `<span class="badge">${currentMediaData.episodesWithImages} con imágenes</span>`;
                const coverage = Math.round(((currentMediaData.episodesWithImages || 0) / currentMediaData.totalEpisodes) * 100);
                badgesHTML += `<span class="badge-outline">${coverage}% cobertura</span>`;
            } else if (imageType === 'backdrops') {
                badgesHTML += `<span class="badge">${currentMediaData.images?.backdrops.length || 0} fondos</span>`;
            } else if (imageType === 'posters') {
                badgesHTML += `<span class="badge">${currentMediaData.images?.posters.length || 0} pósters</span>`;
            }

            elements.mediaBadges.innerHTML = badgesHTML;

            // Display content based on type
            if (imageType === 'episodes' && currentMediaData.seasons) {
                displayEpisodes();
            } else if (imageType === 'backdrops' || imageType === 'posters') {
                displayImages();
            }

            elements.resultsContainer.classList.remove('hidden');
        }

        function displayEpisodes() {
            let contentHTML = '';

            currentMediaData.seasons.forEach(season => {
                contentHTML += `
                    <div class="glass-card rounded-2xl shadow-xl">
                        <div class="p-6">
                            <div class="mb-6">
                                <h3 class="text-xl font-bold text-gray-800">${season.name}</h3>
                                <p class="text-gray-600">
                                    ${season.episodes.length} episodios • ${season.episodes.filter(ep => ep.still_path).length} con imágenes
                                </p>
                            </div>
                            <div class="grid gap-4">
                `;

                season.episodes.forEach(episode => {
                    const hasImage = episode.still_path;
                    const imageUrl = hasImage ? `${IMAGE_BASE_URL}${episode.still_path}` : '';
                    
                    contentHTML += `
                        <div class="image-card p-4">
                            <div class="flex items-center gap-4">
                                <div class="flex-shrink-0">
                    `;
                    
                    if (hasImage) {
                        contentHTML += `
                            <img 
                                src="https://image.tmdb.org/t/p/w185${episode.still_path}" 
                                alt="${episode.name}"
                                class="w-20 h-11 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onclick="openImagePreview('${episode.still_path}', '${episode.episode_number}. ${episode.name.replace(/'/g, "\\'")}')">
                        `;
                    } else {
                        contentHTML += `
                            <div class="w-20 h-11 bg-gray-200 rounded-lg flex items-center justify-center">
                                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                        `;
                    }
                    
                    contentHTML += `
                                </div>
                                <div class="flex-1 min-w-0 space-y-2">
                                    <p class="font-semibold text-gray-800">${episode.episode_number}. ${episode.name}</p>
                                    <p class="text-sm text-gray-500">${episode.air_date || 'Sin fecha'}</p>
                    `;
                    
                    if (hasImage) {
                        contentHTML += `
                                    <div class="space-y-2">
                                        <p class="text-sm text-green-600 font-medium">✅ Imagen disponible</p>
                                        <div class="flex items-center gap-2">
                                            <code class="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">${imageUrl}</code>
                                            <button onclick="copyImageUrl('${episode.still_path}')" class="btn-outline text-xs px-2 py-1">
                                                📋
                                            </button>
                                            <button onclick="window.open('${imageUrl}', '_blank')" class="btn-outline text-xs px-2 py-1">
                                                🔗
                                            </button>
                                        </div>
                                    </div>
                        `;
                    }
                    
                    contentHTML += `
                                </div>
                            </div>
                        </div>
                    `;
                });

                contentHTML += `
                            </div>
                        </div>
                    </div>
                `;
            });

            elements.contentContainer.innerHTML = contentHTML;
        }

        function displayImages() {
            const imageType = elements.imageType.value;
            const images = imageType === 'backdrops' ? currentMediaData.images?.backdrops : currentMediaData.images?.posters;
            
            if (!images || images.length === 0) {
                elements.contentContainer.innerHTML = `
                    <div class="glass-card rounded-2xl shadow-xl">
                        <div class="p-6 text-center">
                            <p class="text-gray-600">No se encontraron ${imageType === 'backdrops' ? 'fondos' : 'pósters'}</p>
                        </div>
                    </div>
                `;
                return;
            }

            let contentHTML = `
                <div class="glass-card rounded-2xl shadow-xl">
                    <div class="p-6">
                        <div class="mb-6">
                            <h3 class="text-xl font-bold text-gray-800">${imageType === 'backdrops' ? 'Fondos (Backdrops)' : 'Pósters'}</h3>
                            <p class="text-gray-600">
                                ${images.length} ${imageType === 'backdrops' ? 'imágenes de fondo' : 'pósters'} disponibles
                            </p>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            `;

            images.forEach((image, index) => {
                const imageUrl = `${IMAGE_BASE_URL}${image.file_path}`;
                const aspectClass = imageType === 'posters' ? 'aspect-[9/16]' : 'aspect-video';
                
                contentHTML += `
                    <div class="image-card">
                        <div class="bg-gray-100 ${aspectClass}">
                            <img 
                                src="https://image.tmdb.org/t/p/w500${image.file_path}"
                                alt="${imageType} ${index + 1}"
                                class="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onclick="openImagePreview('${image.file_path}', '${imageType === 'backdrops' ? 'Fondo' : 'Póster'} ${index + 1}')">
                        </div>
                        <div class="p-4 space-y-2">
                            <div class="flex items-center gap-2">
                                <code class="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">${imageUrl}</code>
                                <button onclick="copyImageUrl('${image.file_path}')" class="btn-outline text-xs px-2 py-1">
                                    📋
                                </button>
                                <button onclick="window.open('${imageUrl}', '_blank')" class="btn-outline text-xs px-2 py-1">
                                    🔗
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            contentHTML += `
                        </div>
                    </div>
                </div>
            `;

            elements.contentContainer.innerHTML = contentHTML;
        }

        function copyImageUrl(imagePath) {
            const fullUrl = `${IMAGE_BASE_URL}${imagePath}`;
            navigator.clipboard.writeText(fullUrl).then(() => {
                showCopyMessage('URL copiada');
            });
        }

        function copyAllImageUrls() {
            if (!currentMediaData) return;

            const imageType = elements.imageType.value;
            const imageUrls = [];

            if (imageType === 'episodes' && currentMediaData.seasons) {
                currentMediaData.seasons.forEach(season => {
                    season.episodes.forEach(episode => {
                        if (episode.still_path) {
                            imageUrls.push(`${IMAGE_BASE_URL}${episode.still_path}`);
                        }
                    });
                });
            } else if (currentMediaData.images) {
                const images = imageType === 'backdrops' ? currentMediaData.images.backdrops : currentMediaData.images.posters;
                images.forEach(image => {
                    imageUrls.push(`${IMAGE_BASE_URL}${image.file_path}`);
                });
            }

            if (imageUrls.length === 0) {
                showCopyMessage('No hay imágenes para copiar');
                return;
            }

            const urlsText = imageUrls.join('\n');
            navigator.clipboard.writeText(urlsText).then(() => {
                showCopyMessage(`${imageUrls.length} URLs copiadas al portapapeles`);
            }).catch(() => {
                showCopyMessage('Error al copiar URLs');
            });
        }

        function downloadJSON() {
            if (!currentMediaData) return;

            const contentType = elements.contentType.value;
            const imageType = elements.imageType.value;

            const jsonData = {
                media: {
                    id: currentMediaData.id,
                    name: currentMediaData.name || currentMediaData.title,
                    type: contentType,
                    image_type: imageType,
                    overview: currentMediaData.overview,
                },
            };

            if (contentType === 'movie' || imageType !== 'episodes') {
                jsonData.images = {
                    backdrops: currentMediaData.images?.backdrops.map(img => `${IMAGE_BASE_URL}${img.file_path}`) || [],
                    posters: currentMediaData.images?.posters.map(img => `${IMAGE_BASE_URL}${img.file_path}`) || [],
                };
                jsonData.statistics = {
                    total_backdrops: currentMediaData.images?.backdrops.length || 0,
                    total_posters: currentMediaData.images?.posters.length || 0,
                };
            } else {
                jsonData.seasons = currentMediaData.seasons?.map(season => ({
                    season_number: season.season_number,
                    name: season.name,
                    episodes: season.episodes.map(episode => ({
                        id: episode.id,
                        name: episode.name,
                        episode_number: episode.episode_number,
                        air_date: episode.air_date,
                        overview: episode.overview,
                        image_url: episode.still_path ? `${IMAGE_BASE_URL}${episode.still_path}` : null,
                    })),
                }));
                jsonData.statistics = {
                    total_episodes: currentMediaData.totalEpisodes,
                    episodes_with_images: currentMediaData.episodesWithImages,
                    coverage_percentage: Math.round(((currentMediaData.episodesWithImages || 0) / (currentMediaData.totalEpisodes || 1)) * 100),
                };
            }

            const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(currentMediaData.name || currentMediaData.title || 'media').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${imageType}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function openImagePreview(imagePath, title) {
            const fullUrl = `${IMAGE_BASE_URL}${imagePath}`;
            elements.modalTitle.textContent = title;
            elements.modalImage.src = fullUrl;
            elements.modalUrl.textContent = fullUrl;
            elements.imageModal.classList.remove('hidden');
        }

        function closeImagePreview() {
            elements.imageModal.classList.add('hidden');
        }

        // Initialize
        updateImageTypeOptions('tv');
        setSearchMode('id');
    
