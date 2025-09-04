
        const TMDB_API_KEY = '32e5e53999e380a0291d66fb304153fe';
        const availableProviders = ['vidhide', 'streamwish', 'filemoon', 'voe', 'doodstream', 'streamtape', 'netu', 'download'];
        let selectedProviders = [];

        // Toast notification system
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => toast.classList.add('show'), 100);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }

        // Provider management
        function updateProviderStatus() {
            const status = document.getElementById('providerStatus');
            if (selectedProviders.length === 0) {
                status.textContent = 'Sin filtros - se extraerán enlaces de todos los proveedores';
            } else {
                status.textContent = `Filtrando por: ${selectedProviders.join(', ')}`;
            }
        }

        function selectAllProviders() {
            selectedProviders = [...availableProviders];
            availableProviders.forEach(provider => {
                document.getElementById(provider).checked = true;
            });
            updateProviderStatus();
        }

        function clearAllProviders() {
            selectedProviders = [];
            availableProviders.forEach(provider => {
                document.getElementById(provider).checked = false;
            });
            updateProviderStatus();
        }

        // Provider checkbox event listeners
        availableProviders.forEach(provider => {
            document.getElementById(provider).addEventListener('change', function() {
                if (this.checked) {
                    if (!selectedProviders.includes(provider)) {
                        selectedProviders.push(provider);
                    }
                } else {
                    selectedProviders = selectedProviders.filter(p => p !== provider);
                }
                updateProviderStatus();
            });
        });

        // Enter key support
        document.getElementById('movieId').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleScrape();
            }
        });

        // Main scraping function
        async function handleScrape() {
            const movieId = document.getElementById('movieId').value.trim();
            const contentType = document.getElementById('contentType').value;
            
            if (!movieId) {
                showToast('Por favor ingresa un ID válido', 'error');
                return;
            }

            const extractBtn = document.getElementById('extractBtn');
            const errorAlert = document.getElementById('errorAlert');
            const results = document.getElementById('results');

            // Reset UI
            errorAlert.style.display = 'none';
            results.style.display = 'none';
            
            // Set loading state
            extractBtn.disabled = true;
            extractBtn.innerHTML = '<div class="loading"><div class="spinner"></div>Extrayendo...</div>';

            try {
                console.log(`[v0] Starting scrape for ID: ${movieId}, Type: ${contentType}`);
                
                // Get TMDB data
                const tmdbEndpoint = contentType === 'movie' ? 'movie' : 'tv';
                const tmdbUrl = `https://api.themoviedb.org/3/${tmdbEndpoint}/${movieId}?api_key=${TMDB_API_KEY}&language=es-ES`;
                
                console.log(`[v0] Fetching TMDB data from: ${tmdbUrl}`);
                const tmdbResponse = await fetch(tmdbUrl);
                
                if (!tmdbResponse.ok) {
                    throw new Error(`No se encontró contenido con ID ${movieId} en TMDB`);
                }
                
                const tmdbData = await tmdbResponse.json();
                console.log(`[v0] TMDB data received:`, tmdbData);
                
                // Get IMDB ID
                let imdbId = tmdbData.imdb_id;
                
                if (!imdbId) {
                    console.log(`[v0] No IMDB ID in main data, trying external_ids`);
                    const externalIdsUrl = `https://api.themoviedb.org/3/${tmdbEndpoint}/${movieId}/external_ids?api_key=${TMDB_API_KEY}`;
                    const externalResponse = await fetch(externalIdsUrl);
                    
                    if (externalResponse.ok) {
                        const externalData = await externalResponse.json();
                        imdbId = externalData.imdb_id;
                        console.log(`[v0] External IDs data:`, externalData);
                    }
                }
                
                if (!imdbId) {
                    console.log(`[v0] Using TMDB ID as fallback: ${movieId}`);
                    imdbId = movieId;
                }
                
                console.log(`[v0] Using IMDB ID: ${imdbId}`);
                
                const title = tmdbData.title || tmdbData.name;
                let scrapedData;
                
                if (contentType === 'movie') {
                    scrapedData = await scrapeMovie(imdbId, title);
                } else {
                    scrapedData = await scrapeSeries(imdbId, title, tmdbData.number_of_seasons || 1, movieId);
                }
                
                displayResults(scrapedData);
                
                const linkCount = contentType === 'movie' 
                    ? scrapedData.movieLinks?.length || 0
                    : scrapedData.seasons.reduce((total, season) => 
                        total + season.episodes.reduce((episodeTotal, episode) => 
                            episodeTotal + episode.links.length, 0), 0);
                
                showToast(`¡Éxito! Se encontraron ${linkCount} enlaces para ${title}`);
                
            } catch (error) {
                console.error('[v0] Error:', error);
                showError(error.message);
                showToast('Error al extraer enlaces', 'error');
            } finally {
                // Reset button
                extractBtn.disabled = false;
                extractBtn.innerHTML = '🔍 Extraer';
            }
        }

        async function scrapeMovie(imdbId, title) {
            console.log(`[v0] Scraping movie with IMDB ID: ${imdbId}`);
            const movieUrl = `https://embed69.com/embed69.php?id=${imdbId}`;
            console.log(`[v0] Trying movie URL: ${movieUrl}`);

            try {
                const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(movieUrl)}`);

                if (!response.ok) {
                    throw new Error('No se pudo acceder a embed69.com');
                }

                const textContent = await response.text(); // Obtener el texto de la respuesta

                let links = [];
                let isErrorJson = false;

                try {
                    // Intentar parsear como JSON
                    const jsonContent = JSON.parse(textContent);
                    if (jsonContent && jsonContent.error) {
                        console.log(`[v0] Received error JSON for movie: ${jsonContent.error}`);
                        isErrorJson = true;
                        // Si es un JSON de error, aún así intentar extraer enlaces de él
                        links = extractLinksFromText(textContent); 
                        if (links.length > 0) {
                            console.log(`[v0] Found links within error JSON for movie!`);
                        }
                    }
                } catch (e) {
                    // No es un JSON válido, probablemente HTML. No hacer nada.
                }

                // Si no fue un JSON de error, o si fue un JSON de error pero no se encontraron enlaces en él,
                // entonces procesar como HTML (o texto general)
                // Se elimina la condición textContent.length < 100 para permitir el procesamiento de respuestas cortas
                // Se ajusta la lógica de hasErrorIndicators para que no impida la extracción si hay enlaces
                const hasErrorIndicators = textContent.includes('404') || 
                                           textContent.includes('Not Found') || 
                                           textContent.includes('No video found') ||
                                           textContent.includes('Error') ||
                                           textContent.includes('error') ||
                                           textContent.trim() === '';

                // Siempre intentar extraer enlaces, incluso si hay indicadores de error o la respuesta es corta
                const extractedFromContent = extractLinksFromText(textContent);
                links = [...new Set([...links, ...extractedFromContent])]; // Combinar y eliminar duplicados
                
                if (links.length === 0 && hasErrorIndicators) {
                    console.log(`[v0] No links found and error indicators present. Considering it an error.`);
                    // Si no se encontraron enlaces Y hay indicadores de error, entonces sí es un error.
                    throw new Error(`No se encontraron enlaces para la película con ID ${imdbId}. Posiblemente el contenido no está disponible o hay un error en el servidor.`);
                }

                return {
                    title,
                    type: 'movie',
                    movieLinks: links,
                    seasons: [],
                    debug: {
                        successUrl: movieUrl,
                        totalLinksFound: links.length,
                        uniqueLinksFound: links.length
                    }
                };
            } catch (error) {
                console.error(`[v0] Error scraping movie:`, error);
                throw error;
            }
        }

        async function scrapeSeries(imdbId, title, numberOfSeasons, tmdbId) {
            console.log(`[v0] Scraping series with IMDB ID: ${imdbId}, Seasons: ${numberOfSeasons}`);
            const seasons = [];

            for (let seasonNum = 1; seasonNum <= numberOfSeasons; seasonNum++) {
                console.log(`[v0] Processing season ${seasonNum}`);
                // Get season details from TMDB
                const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=es-ES`;

                try {
                    const seasonResponse = await fetch(seasonUrl);
                    let episodeCount = 25; // Increased default episode count
                    let seasonData = null;

                    if (seasonResponse.ok) {
                        seasonData = await seasonResponse.json();
                        episodeCount = seasonData.episodes ? seasonData.episodes.length : 25;
                        console.log(`[v0] Season ${seasonNum} has ${episodeCount} episodes from TMDB`);
                    } else {
                        console.log(`[v0] Could not get season data from TMDB, using default episode count`);
                    }

                    const episodes = [];

                    // Iterate up to episodeCount + a buffer, or a hard limit (e.g., 30)
                    for (let episodeNum = 1; episodeNum <= Math.max(episodeCount, 30); episodeNum++) {
                        console.log(`[v0] Processing S${seasonNum}E${episodeNum}`);
                        const episodeUrl = `https://embed69.com/embed69.php?id=${imdbId}&season=${seasonNum}&episode=${episodeNum}`;

                        try {
                            const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(episodeUrl)}`);

                            let links = [];
                            let episodeExists = false;
                            let isErrorJson = false;

                            if (response.ok) {
                                const textContent = await response.text();
                                console.log(`[v0] Response length for S${seasonNum}E${episodeNum}: ${textContent.length}`);

                                try {
                                    // Intentar parsear como JSON
                                    const jsonContent = JSON.parse(textContent);
                                    if (jsonContent && jsonContent.error) {
                                        console.log(`[v0] Received error JSON for S${seasonNum}E${episodeNum}: ${jsonContent.error}`);
                                        isErrorJson = true;
                                        // Si es un JSON de error, aún así intentar extraer enlaces de él
                                        links = extractLinksFromText(textContent);
                                        if (links.length > 0) {
                                            console.log(`[v0] Found links within error JSON for S${seasonNum}E${episodeNum}!`);
                                        }
                                    }
                                } catch (e) {
                                    // No es un JSON válido, probablemente HTML. No hacer nada.
                                }

                                // Se elimina la condición textContent.length < 100
                                const hasErrorIndicators = textContent.includes('404') ||
                                                           textContent.includes('Not Found') ||
                                                           textContent.includes('Episode not found') ||
                                                           textContent.includes('No video found') ||
                                                           textContent.includes('Error') ||
                                                           textContent.includes('error') ||
                                                           textContent.trim() === '';

                                console.log(`[v0] Has error indicators: ${hasErrorIndicators}`);
                                
                                // Siempre intentar extraer enlaces, incluso si hay indicadores de error o la respuesta es corta
                                const extractedFromContent = extractLinksFromText(textContent);
                                links = [...new Set([...links, ...extractedFromContent])]; // Combinar y eliminar duplicados
                                episodeExists = links.length > 0 || (textContent.length > 0 && !hasErrorIndicators); // Considerar que existe si hay enlaces o contenido no vacío sin errores claros

                                console.log(`[v0] Episode exists: ${episodeExists}, Links found: ${links.length}`);
                            }

                            // Add episode if it exists OR if we have TMDB data for it
                            if (episodeExists || (seasonData && seasonData.episodes && seasonData.episodes[episodeNum - 1])) {
                                const episodeTitle = seasonData && seasonData.episodes && seasonData.episodes[episodeNum - 1]
                                    ? seasonData.episodes[episodeNum - 1].name
                                    : `Episodio ${episodeNum}`;

                                episodes.push({
                                    episode: episodeNum,
                                    title: episodeTitle,
                                    links: links
                                });

                                console.log(`[v0] Added episode S${seasonNum}E${episodeNum} with ${links.length} links`);
                            } else if (episodeNum > episodeCount + 5 && links.length === 0) { // Stop if we've gone significantly past TMDB's episode count AND found no new episodes
                                console.log(`[v0] No more episodes found after E${episodeNum - 1}, stopping`);
                                break;
                            }

                        } catch (error) {
                            console.error(`[v0] Error scraping episode S${seasonNum}E${episodeNum}:`, error);
                            // Still add episode if we have TMDB data for it, even if scraping failed
                            if (seasonData && seasonData.episodes && seasonData.episodes[episodeNum - 1]) {
                                episodes.push({
                                    episode: episodeNum,
                                    title: seasonData.episodes[episodeNum - 1].name || `Episodio ${episodeNum}`,
                                    links: [] // No links found due to error
                                });
                            }
                        }
                        // Small delay to avoid overwhelming the server
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }

                    if (episodes.length > 0) {
                        seasons.push({
                            season: seasonNum,
                            episodes: episodes
                        });
                    }

                } catch (error) {
                    console.error(`[v0] Error processing season ${seasonNum}:`, error);
                }
            }

            return {
                title,
                type: 'series',
                seasons: seasons,
                debug: {
                    successUrl: `embed69.php with IMDB ID: ${imdbId}`,
                    totalLinksFound: seasons.reduce((total, season) =>
                        total + season.episodes.reduce((episodeTotal, episode) =>
                            episodeTotal + episode.links.length, 0), 0),
                    uniqueLinksFound: seasons.reduce((total, season) =>
                        total + season.episodes.reduce((episodeTotal, episode) =>
                            episodeTotal + episode.links.length, 0), 0)
                }
            };
        }

        // Renombrada para ser más general, ya que ahora procesa cualquier texto
        function extractLinksFromText(text) {
            const links = [];
            // Patrones de regex más generales para encontrar URLs en cualquier texto
            const linkPatterns = [
                /https?:\/\/[^\s"'<>()\[\]{}]+/g, // URLs generales
                /"(https?:\/\/[^"]+)"/g,         // URLs dentro de comillas dobles
                /'(https?:\/\/[^']+)'/g,         // URLs dentro de comillas simples
                /src="(https?:\/\/[^"]+)"/g,     // URLs en atributos src
                /href="(https?:\/\/[^"]+)"/g,    // URLs en atributos href
                /url\((https?:\/\/[^)]+)\)/g,    // URLs en url() CSS
                /data-src="(https?:\/\/[^"]+)"/g, // URLs en atributos data-src
                // NUEVO PATRÓN: Para URLs dentro de llamadas a funciones JavaScript como onclick
                // Busca ' o " seguido de http(s)://... seguido de ' o "
                // Captura el contenido del primer grupo (la URL)
                /(?:abrirReproductorInterno|copiarEnlace)\(['"](https?:\/\/[^'"]+)['"]\)/g
            ];
            
            console.log(`[v0] Extracting links from text (length: ${text.length})`);
            
            linkPatterns.forEach((pattern, index) => {
                let match;
                // Usar exec en un bucle para capturar todas las ocurrencias, incluyendo grupos
                while ((match = pattern.exec(text)) !== null) {
                    // match[0] es el string completo que coincide
                    // match[1] (si existe) es el primer grupo de captura, que debería ser la URL
                    let link = match[1] || match[0]; 
                    
                    // Limpieza adicional para asegurar que sea una URL limpia
                    link = link.replace(/['"()]/g, '')
                               .replace(/src=|href=|url\(|data-src=/g, '')
                               .trim();
                    
                    // Filtros para evitar enlaces no deseados (ads, css, js, imágenes, etc.)
                    if (link.includes('vast.') || 
                        link.includes('/ads/') || 
                        link.includes('partner_id') || 
                        link.includes('googletagmanager') ||
                        link.includes('google-analytics') ||
                        link.includes('facebook.com') ||
                        link.includes('twitter.com') ||
                        link.includes('instagram.com') ||
                        link.includes('.css') ||
                        link.includes('.js') ||
                        link.includes('.png') ||
                        link.includes('.jpg') ||
                        link.includes('.gif') ||
                        link.includes('.ico') ||
                        link.includes('data:image') ||
                        link.length < 10 || // Demasiado corto para ser una URL de video
                        !link.startsWith('http')) { // Asegurarse de que sea una URL completa
                        continue; // Saltar este enlace
                    }
                    
                    // Lógica de filtrado por proveedor mejorada
                    if (selectedProviders.length > 0) {
                        const linkLower = link.toLowerCase();
                        let hasSelectedProvider = false;
                        
                        // Definición de patrones de detección para cada proveedor
                        const providerPatterns = {
                            'vidhide': ['vidhide', 'vid-hide', 'vidhid', 'vh.', '/vh/', 'vidhide.com', 'vidhide.net', 'vidhidepro.com', 'mivalyo.com', 'mivalyo.'],
                            'streamwish': ['streamwish', 'stream-wish', 'streamw', 'sw.', '/sw/', 'streamwish.com', 'streamwish.to', 'hglink.to', 'hglink.'],
                            'filemoon': ['filemoon', 'file-moon', 'filem', 'fm.', '/fm/', 'filemoon.sx', 'filemoon.to', 'filemoon.link', 'filemoon.cc', 'filemoon.net'],
                            'voe': ['voe.', 'voe/', '.voe', '/voe/', 'voe-', 'voe.sx', 'voe.com', 'voe.cc'],
                            'doodstream': ['doodstream', 'dood.', 'dood/', 'doodstream.com', 'doodstream.co', 'dood.to', 'dood.so', 'dood.cx', 'dood.la', 'dood.ws'],
                            'streamtape': ['streamtape', 'stream-tape', 'streamtape.com', 'streamtape.to', 'streamtape.cc', 'stape.', 'stape/'],
                            'netu': ['netu', 'waaw.to', 'waaw.', 'netu.tv', 'netu.to', 'hqq.', 'hqq.tv', 'hqq.to'],
                            'download': ['download', 'dl.', '/dl/', 'downloads', 'dwn.', 'direct.', 'mirror.', 'embed69.org/d/', '/d/']
                        };
                        
                        for (const provider of selectedProviders) {
                            const patterns = providerPatterns[provider] || [provider.toLowerCase()]; // Usar patrones específicos o el nombre del proveedor
                            
                            hasSelectedProvider = patterns.some(pattern => {
                                const patternLower = pattern.toLowerCase();
                                // Comprobación flexible: incluye el patrón en el enlace o en el dominio
                                return linkLower.includes(patternLower) || 
                                       (link.startsWith('http') && new URL(link).hostname.toLowerCase().includes(patternLower.replace(/\./g, '')));
                            });
                            if (hasSelectedProvider) break; // Si se encuentra un proveedor seleccionado, no es necesario seguir buscando
                        }
                        
                        if (!hasSelectedProvider) {
                            continue; // Saltar este enlace si no coincide con los proveedores seleccionados
                        }
                    }
                    
                    const normalizedLink = link.replace(/\/$/, ''); // Eliminar barra final para normalizar
                    if (!links.some(existingLink => existingLink.replace(/\/$/, '') === normalizedLink)) {
                        links.push(link);
                        console.log(`[v0] Added link: ${link}`);
                    }
                }
            });
            
            console.log(`[v0] Total links found: ${links.length}`);
            
            // El fallback de "sin filtros" se mantiene, pero considera si es deseable.
            // Si el usuario selecciona proveedores, ¿realmente quieres mostrar enlaces de otros proveedores si no se encuentran los seleccionados?
            // Podría confundir al usuario. Si no es deseable, elimina este bloque.
            if (links.length === 0 && selectedProviders.length > 0) {
                console.log(`[v0] No links found with provider filtering, trying without filters as fallback...`);
                
                linkPatterns.forEach((pattern, index) => {
                    let match;
                    while ((match = pattern.exec(text)) !== null) {
                        let link = match[1] || match[0];
                        link = link.replace(/['"()]/g, '').replace(/src=|href=|url\(|data-src=/g, '').trim();
                        if (link.includes('vast.') || 
                            link.includes('/ads/') || 
                            link.includes('partner_id') ||
                            link.includes('googletagmanager') ||
                            link.includes('google-analytics') ||
                            link.includes('facebook.com') ||
                            link.includes('twitter.com') ||
                            link.includes('instagram.com') ||
                            link.includes('.css') ||
                            link.includes('.js') ||
                            link.includes('.png') ||
                            link.includes('.jpg') ||
                            link.includes('.gif') ||
                            link.includes('.ico') ||
                            link.includes('data:image') ||
                            link.length < 10 ||
                            !link.startsWith('http')) {
                            continue;
                        }
                        
                        // Check if it looks like a video streaming link
                        const videoIndicators = ['embed', 'player', 'stream', 'video', 'watch', 'play', '.mp4', '.m3u8', '.ts'];
                        const hasVideoIndicator = videoIndicators.some(indicator => 
                            link.toLowerCase().includes(indicator)
                        );
                        
                        if (hasVideoIndicator) {
                            const normalizedLink = link.replace(/\/$/, '');
                            if (!links.some(existingLink => existingLink.replace(/\/$/, '') === normalizedLink)) {
                                links.push(link);
                                console.log(`[v0] Added fallback link: ${link}`);
                            }
                        }
                    }
                });
            }
            
            return links;
        }

        function displayResults(data) {
            const results = document.getElementById('results');
            
            let html = ``
                + `<div class="card">`
                + `    <div class="results-header">`
                + `        <div>`
                + `            <h2>${data.title} <span class="badge badge-${data.type === 'movie' ? 'movie' : 'series'}">${data.type === 'movie' ? 'Película' : 'Serie'}</span></h2>`
                + `            <p style="color: #666; margin-top: 5px;">`
                + `                ${data.type === 'movie' 
                    ? `${data.movieLinks?.length || 0} enlaces encontrados`
                    : `${data.seasons.length} temporadas encontradas`}`
                + `            </p>`
                + `        </div>`
                + `        <button onclick="copyAllLinks()" style="background: #28a745;">`
                + `            📋 Copiar Todos`
                + `        </button>`
                + `    </div>`;
            
            if (data.debug) {
                html += ``
                    + `    <div class="alert alert-info">`
                    + `        <strong>Información de extracción:</strong><br>`
                    + `        URL exitosa: ${data.debug.successUrl}<br>`
                    + `        Enlaces totales encontrados: ${data.debug.totalLinksFound}<br>`
                    + `        Enlaces únicos: ${data.debug.uniqueLinksFound}`
                    + `    </div>`;
            }
            
            if (data.type === 'movie' && data.movieLinks) {
                html += ``
                    + `    <h3 style="margin-bottom: 20px;">Enlaces de la Película:</h3>`;
                
                if (data.movieLinks.length === 0) {
                    html += ``
                        + `    <div class="alert alert-error">`
                        + `        No se encontraron enlaces para esta película. Esto puede deberse a que los enlaces están protegidos, en una sección diferente, o el servidor devolvió un error que no contenía enlaces válidos.`
                        + `    </div>`;
                } else {
                    data.movieLinks.forEach((link, index) => {
                        html += ``
                            + `    <div class="link-item">`
                            + `        <div class="link-url">${link}</div>`
                            + `        <div class="link-buttons">`
                            + `            <button class="btn-icon" onclick="copyToClipboard('${link.replace(/'/g, "\\'")}')">📋</button>`
                            + `            <button class="btn-icon" onclick="window.open('${link}', '_blank')">🔗</button>`
                            + `        </div>`
                            + `    </div>`;
                    });
                }
            } else {
                if (data.seasons.length === 0) {
                    html += ``
                        + `    <div class="alert alert-error">`
                        + `        No se encontraron temporadas o episodios para esta serie. Verifica que el ID sea correcto o que la serie tenga contenido disponible.`
                        + `    </div>`;
                } else {
                    data.seasons.forEach(season => {
                        html += ``
                            + `    <div class="season-section">`
                            + `        <h3 class="season-title">`
                            + `            Temporada ${season.season}`
                            + `            <span class="badge badge-series">${season.episodes.length} episodios</span>`
                            + `        </h3>`;
                        
                        season.episodes.forEach(episode => {
                            html += ``
                                + `        <div class="episode-section">`
                                + `            <h4 class="episode-title">Episodio ${episode.episode}: ${episode.title}</h4>`;
                            
                            if (episode.links.length === 0) {
                                html += ``
                                    + `            <p style="color: #666; font-style: italic;">No hay enlaces disponibles para este episodio (o el servidor devolvió un error que no contenía enlaces válidos).</p>`;
                            } else {
                                episode.links.forEach(link => {
                                    html += ``
                                        + `            <div class="link-item">`
                                        + `                <div class="link-url">${link}</div>`
                                        + `                <div class="link-buttons">`
                                        + `                    <button class="btn-icon" onclick="copyToClipboard('${link.replace(/'/g, "\\'")}')">📋</button>`
                                        + `                    <button class="btn-icon" onclick="window.open('${link}', '_blank')">🔗</button>`
                                        + `                </div>`
                                        + `            </div>`;
                                });
                            }
                            
                            html += `</div>`;
                        });
                        
                        html += `</div>`;
                    });
                }
            }
            
            html += `</div>`;
            
            results.innerHTML = html;
            results.style.display = 'block';
            
            // Store data globally for copy all function
            window.currentData = data;
        }

        function showError(message) {
            const errorAlert = document.getElementById('errorAlert');
            errorAlert.innerHTML = ``
                + `${message}<br>`
                + `<span style="font-size: 14px; margin-top: 10px; display: block;">`
                + `    Consejos: Verifica que el ID sea correcto, que la película/serie, o puede ser que no este disponible, o intenta con un ID diferente.`
                + `</span>`;
            errorAlert.style.display = 'block';
        }

        async function copyToClipboard(text) {
            try {
                await navigator.clipboard.writeText(text);
                showToast('Enlace copiado al portapapeles');
            } catch (error) {
                showToast('No se pudo copiar el enlace', 'error');
            }
        }

        async function copyAllLinks() {
            if (!window.currentData) return;
            
            const data = window.currentData;
            let allLinks = '';
            
            if (data.type === 'movie' && data.movieLinks) {
                allLinks = data.movieLinks.join('\n');
            } else {
                data.seasons.forEach(season => {
                    allLinks += `\n=== TEMPORADA ${season.season} ===\n`;
                    season.episodes.forEach(episode => {
                        allLinks += `\nEpisodio ${episode.episode}: ${episode.title}\n`;
                        episode.links.forEach(link => {
                            allLinks += `${link}\n`;
                        });
                    });
                });
            }
            
            await copyToClipboard(allLinks);
        }
    
