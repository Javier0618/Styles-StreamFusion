const apiKey = "32e5e53999e380a0291d66fb304153fe"
const seriesId = 93405; // ID de la serie que quieres consultar (por ejemplo, Stranger Things)
const episodeVideos = {
  1: {
                1: "https://unlimplayer.top/embed/viknamsauhkml7b",
                2: "https://unlimplayer.top/embed/hsrg9dmvrdawcog",
                3: "https://unlimplayer.top/embed/9kuqb7whm8qmxjp",
                4: "https://unlimplayer.top/embed/cabwklp5ksxr0ps",
                5: "https://unlimplayer.top/embed/i4kb9ugzud5perw",
                6: "https://unlimplayer.top/embed/ws6o4usqnja0lgl",
                7: "https://unlimplayer.top/embed/9dyx8mjrsbvbfg",
                8: "https://unlimplayer.top/embed/w26u1dfv9ulshnz",
                9: "https://unlimplayer.top/embed/h10vymxwzpzohfg",
            },
             2: {
                1: "https://unlimplayer.top/embed/ejdct1e1",
                2: "https://unlimplayer.top/embed/ejdct1e2",
                3: "https://unlimplayer.top/embed/ejdct1e3",
                4: "https://unlimplayer.top/embed/ejdct1e4",
                5: "https://unlimplayer.top/embed/ejdct1e5",
                6: "https://unlimplayer.top/embed/ejdct1e6",
                7: "https://unlimplayer.top/embed/ejdct1e7",
            },
};

let currentVideoUrl = ""
let retryCount = 0
const MAX_RETRIES = 3
const loadedResources = {
  seriesData: false,
  recommendedSeries: false,
  video: false,
}

// Función para verificar si todos los recursos se han cargado
function checkAllResourcesLoaded() {
  if (loadedResources.seriesData && loadedResources.recommendedSeries && loadedResources.video) {
    // Ocultar el indicador de carga de la página
    const pageLoader = document.getElementById("pageLoader")
    if (pageLoader) {
      pageLoader.classList.add("hidden")
      setTimeout(() => {
        pageLoader.style.display = "none"
      }, 500)
    }
  }
}

// Función para manejar errores de carga de imágenes
function handleImageError(img, fallbackUrl) {
  img.onerror = null // Evitar bucles infinitos
  if (fallbackUrl) {
    img.src = fallbackUrl
  } else {
    // Crear un SVG de reemplazo
    const svgFallback = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJDMkMyQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNkZWRlZGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==`
    img.src = svgFallback
  }
  console.log("Imagen reemplazada con fallback")
}

async function getConfiguration() {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${apiKey}`)
    if (!response.ok) throw new Error(`Error de configuración: ${response.status}`)
    const data = await response.json()
    return data.images.base_url
  } catch (error) {
    console.error("Error al obtener configuración:", error)
    return "https://image.tmdb.org/t/p/" // URL base por defecto
  }
}

async function fetchSeriesData() {
  try {
    const [baseUrl, seriesData] = await Promise.all([
      getConfiguration(),
      fetch(
        `https://api.themoviedb.org/3/tv/${seriesId}?api_key=${apiKey}&language=es-MX&append_to_response=credits`,
      ).then((res) => {
        if (!res.ok) throw new Error(`Error al obtener datos de la serie: ${res.status}`)
        return res.json()
      }),
    ])
 
    const posterPath = seriesData.poster_path
    const posterUrl = `${baseUrl}w500${posterPath}`

    // Actualizar la información de la serie
    document.getElementById("seriesTitle").innerText = seriesData.name || "Título no disponible"
    document.getElementById("seriesFirstAirDate").innerText =
      `Año de estreno: ${seriesData.first_air_date ? new Date(seriesData.first_air_date).getFullYear() : "No disponible"}`
    document.getElementById("seriesGenres").innerText =
      `Géneros: ${seriesData.genres && seriesData.genres.length > 0 ? seriesData.genres.map((genre) => genre.name).join(", ") : "No disponible"}`

    const creators =
      seriesData.created_by && seriesData.created_by.length > 0
        ? seriesData.created_by.map((creator) => creator.name).join(", ")
        : "No disponible"
    document.getElementById("seriesCreators").innerText = `Creadores: ${creators}`

    const actors =
      seriesData.credits && seriesData.credits.cast && seriesData.credits.cast.length > 0
        ? seriesData.credits.cast
            .slice(0, 5)
            .map((actor) => actor.name)
            .join(", ")
        : "No disponible"
    document.getElementById("seriesActors").innerText = `Actores principales: ${actors}`

    // Cargar el póster con manejo de errores
    const posterImg = document.getElementById("seriesPoster")
    posterImg.onload = () => {
      adjustDetailsHeight()
    }
    posterImg.onerror = function () {
      handleImageError(this)
    }
    posterImg.src = posterUrl

    document.getElementById("seriesOverview").innerText = seriesData.overview || "Descripción no disponible"

    // Marcar los datos de la serie como cargados
    loadedResources.seriesData = true
    checkAllResourcesLoaded()

    adjustDetailsHeight()
    populateSeasonsDropdown(seriesData.seasons)
  } catch (error) {
    console.error("Error al cargar datos de la serie:", error)

    // Mostrar información de error en la interfaz
    document.getElementById("seriesTitle").innerText = "Error al cargar datos"
    document.getElementById("seriesOverview").innerText =
      "No se pudieron cargar los datos de la serie. Por favor, intente recargar la página."

    // Marcar como cargado para no bloquear la interfaz
    loadedResources.seriesData = true
    checkAllResourcesLoaded()
  }
}

function adjustDetailsHeight() {
  const poster = document.getElementById("seriesPoster")
  const details = document.querySelector(".series-details")

  if (poster && details && poster.complete) {
    details.style.height = `${poster.clientHeight}px`
  }
}

function populateSeasonsDropdown(seasons) {
  const dropdown = document.getElementById("seasonDropdown")
  dropdown.innerHTML = "" // Clear existing options
  seasons.forEach((season) => {
    if (season.season_number >= 1) {
      const option = document.createElement("option")
      option.value = season.season_number
      option.textContent = `Temporada ${season.season_number}`
      dropdown.appendChild(option)
    }
  })
  dropdown.addEventListener("change", (event) => {
    const seasonNumber = event.target.value
    fetchSeasonEpisodes(seasonNumber)
  })
  // Load episodes for the first season by default
  if (seasons.length > 0) {
    const firstSeason = seasons.find((season) => season.season_number >= 1)

    if (firstSeason) {
      fetchSeasonEpisodes(firstSeason.season_number)
    }
  }
}

function fetchSeasonEpisodes(seasonNumber) {
  try {
    const episodesSlider = document.getElementById("episodesSlider")
    episodesSlider.innerHTML = "" // Clear existing episodes

    if (episodeVideos[seasonNumber]) {
      Object.keys(episodeVideos[seasonNumber]).forEach((episodeNumber, index) => {
        const slideItem = document.createElement("div")
        slideItem.className = "episode"
        slideItem.textContent = episodeNumber
        slideItem.dataset.videoUrl = episodeVideos[seasonNumber][episodeNumber]
        slideItem.addEventListener("click", () => {
          const episodes = document.querySelectorAll(".episode")
          episodes.forEach((episode) => episode.classList.remove("selected"))
          slideItem.classList.add("selected")
          loadVideo(slideItem.dataset.videoUrl)
        })
        episodesSlider.appendChild(slideItem)
        // Select the first episode by default
        if (index === 0) {
          slideItem.classList.add("selected")
          // Set a small timeout to ensure DOM is ready before loading video
          setTimeout(() => {
            loadVideo(slideItem.dataset.videoUrl)
          }, 100)
        }
      })
    } else {
      console.log(`No hay videos disponibles para la temporada ${seasonNumber}`)
      episodesSlider.innerHTML = "<p>No hay episodios disponibles para esta temporada.</p>"
    }
  } catch (error) {
    console.error("Error fetching season episodes:", error)
    document.getElementById("episodesSlider").innerHTML =
      "<p>Error al cargar los episodios. Por favor, intente de nuevo.</p>"
  }
}

function loadVideo(videoUrl) {
  return new Promise((resolve, reject) => {
    if (!videoUrl) {
      console.error("URL de video no válida")
      loadedResources.video = true
      checkAllResourcesLoaded()
      return resolve()
    }
    
    currentVideoUrl = videoUrl
    const iframe = document.getElementById("videoPlayer")
    
    // Asegurarse de que el iframe esté limpio antes de cargar
    if (iframe.src !== "about:blank" && iframe.src !== videoUrl) {
      iframe.src = "about:blank"
      // Pequeña pausa para asegurar que se limpie
      setTimeout(() => {
        setVideoSource(iframe, videoUrl, resolve, reject)
      }, 100)
    } else {
      setVideoSource(iframe, videoUrl, resolve, reject)
    }
  })
}

// Función auxiliar para establecer la fuente del video
function setVideoSource(iframe, videoUrl, resolve, reject) {
  // Configurar evento de carga
  iframe.onload = () => {
    console.log("Video cargado correctamente:", videoUrl)
    loadedResources.video = true
    checkAllResourcesLoaded()
    resolve()
  }

  // Configurar evento de error
  iframe.onerror = () => {
    console.error("Error al cargar el video")
    if (retryCount < MAX_RETRIES) {
      retryCount++
      console.log(`Reintentando cargar video (${retryCount}/${MAX_RETRIES})...`)
      setTimeout(() => {
        iframe.src = "about:blank"
        setTimeout(() => {
          iframe.src = videoUrl
        }, 500)
      }, 1000)
    } else {
      loadedResources.video = true // Marcar como cargado aunque haya fallado
      checkAllResourcesLoaded()
      reject(new Error("No se pudo cargar el video después de varios intentos"))
    }
  }

  // Cargar el video
  iframe.src = videoUrl

  // Establecer un tiempo máximo de espera
  setTimeout(() => {
    if (!loadedResources.video) {
      loadedResources.video = true
      checkAllResourcesLoaded()
      console.log("Tiempo de carga del video excedido, continuando con la interfaz")
      resolve()
    }
  }, 10000) // 10 segundos máximo de espera
}

function reloadCurrentVideo() {
  const reloadButton = document.getElementById("reloadButton")
  reloadButton.classList.add("loading")

  const iframe = document.getElementById("videoPlayer")
  iframe.src = "about:blank"

  setTimeout(() => {
    iframe.src = currentVideoUrl
    setTimeout(() => {
      reloadButton.classList.remove("loading")
    }, 1000)
  }, 1000)
}

function fetchRandomSeries() {
  const BASE_URL = "https://api.themoviedb.org/3"
  const IMG_URL = "https://image.tmdb.org/t/p/"
  const LANGUAGE = "es-MX"
  const seriesIDs = [138501, 125988, 85271, 85723, 128839, 133903, 158300, 63174, 158141, 90660, 201834, 102621, 80752, 84773, 120734, 230424, 45666, 48866, 259730, 202506, 156902, 2038, 11250, 110418, 1396, 108545, 71446, 84958, 82452, 92749, 60625, 93405, 82856, 1399, 66732, 60574, 60735, 5371, 52814, 1403, 119243, 94997, 39351, 456, 76479];

  const shuffled = seriesIDs.sort(() => 0.5 - Math.random())
  const selectedSeries = shuffled.slice(0, 18)

  // Crear todas las promesas de fetch
  const fetchPromises = selectedSeries.map((id) =>
    fetch(`${BASE_URL}/tv/${id}?api_key=${apiKey}&language=${LANGUAGE}`).then((response) => response.json()),
  )

  // Ejecutar todas las promesas en paralelo
  Promise.all(fetchPromises)
    .then((seriesArray) => {
      // Limpiar los indicadores de carga
      document.getElementById("relatedLoader").style.display = "none"
      document.getElementById("relatedLoader2").style.display = "none"

      // Procesar las series en lotes para mejorar el rendimiento
      const processSeriesInBatches = (series, startIndex, batchSize) => {
        const endIndex = Math.min(startIndex + batchSize, series.length)
        const batch = series.slice(startIndex, endIndex)

        batch.forEach((item, index) => {
          const actualIndex = startIndex + index
          const containerClass = actualIndex < 6 ? "#relatedContent" : "#relatedContent2"
          const container = document.querySelector(containerClass)

          if (!container) return

          const div = document.createElement("div")
          div.classList.add("item")

          // Crear la imagen con un placeholder mientras carga
          const posterPath = item.poster_path
          const posterUrl = posterPath ? `${IMG_URL}w500${posterPath}` : null

          div.innerHTML = `
                        <a href="go:${item.id}" target="_blank" rel="noreferrer">
                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzJDMkMyQyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNkZWRlZGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkNhcmdhbmRvLi4uPC90ZXh0Pjwvc3ZnPg==" 
                                 data-src="${posterUrl}" 
                                 alt="${item.name}" 
                                 loading="lazy">
                            <div class="rating-badge">⭐ ${item.vote_average ? item.vote_average.toFixed(1) : "N/A"}</div>
                            <div class="item-title">${item.name}</div>                        
                        </a>
                    `
          container.appendChild(div)

          // Cargar la imagen real después de añadir al DOM
          const img = div.querySelector("img")
          if (posterUrl) {
            const actualImg = new Image()
            actualImg.onload = () => {
              img.src = posterUrl
            }
            actualImg.onerror = () => {
              handleImageError(img)
            }
            actualImg.src = posterUrl
          } else {
            handleImageError(img)
          }
        })

        // Procesar el siguiente lote si hay más series
        if (endIndex < series.length) {
          setTimeout(() => {
            processSeriesInBatches(series, endIndex, batchSize)
          }, 50) // Pequeño retraso para no bloquear el hilo principal
        } else {
          // Todos los lotes procesados
          loadedResources.recommendedSeries = true
          checkAllResourcesLoaded()
        }
      }

      // Iniciar el procesamiento por lotes (6 series a la vez)
      processSeriesInBatches(seriesArray, 0, 6)
    })
    .catch((error) => {
      console.error("Error al cargar series recomendadas:", error)
      document.getElementById("relatedLoader").style.display = "none"
      document.getElementById("relatedLoader2").style.display = "none"

      // Marcar como cargado para no bloquear la interfaz
      loadedResources.recommendedSeries = true
      checkAllResourcesLoaded()
    })
}

// Función para cargar imágenes diferidas
function loadLazyImages() {
  const lazyImages = document.querySelectorAll("img[data-src]")
  lazyImages.forEach((img) => {
    if (img.dataset.src) {
      const actualImg = new Image()
      actualImg.onload = () => {
        img.src = img.dataset.src
        img.removeAttribute("data-src")
      }
      actualImg.onerror = () => {
        handleImageError(img)
        img.removeAttribute("data-src")
        }
      actualImg.src = img.dataset.src
    }
  })
}

// Inicializar la página
async function initPage() {
  try {
    // Iniciar la carga de datos de serie y series recomendadas
    fetchSeriesData()
    fetchRandomSeries()

    // Configurar observador de imágenes para carga diferida
    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target
            if (img.dataset.src) {
              img.src = img.dataset.src
              img.removeAttribute("data-src")
              imageObserver.unobserve(img)
            }
          }
        })
      })

      document.querySelectorAll("img[data-src]").forEach((img) => {
        imageObserver.observe(img)
      })
    } else {
      // Fallback para navegadores que no soportan IntersectionObserver
      loadLazyImages()
    }
  } catch (error) {
    console.error("Error durante la inicialización de la página:", error)
    // Asegurar que la interfaz se muestre aunque haya errores
    Object.keys(loadedResources).forEach(key => {
      if (!loadedResources[key]) loadedResources[key] = true
    })
    checkAllResourcesLoaded()
  }
}

// Eventos de la página
window.addEventListener("load", () => {
  // Configurar el botón de recarga
  document.getElementById("reloadButton").addEventListener("click", (e) => {
    e.preventDefault()
    reloadCurrentVideo()
  })

  // Iniciar la carga de la página
  initPage()
})

window.addEventListener("resize", adjustDetailsHeight)

// Manejar errores globales
window.addEventListener("error", (e) => {
  console.error("Error global capturado:", e.message)
  // No bloquear la interfaz en caso de error
  Object.keys(loadedResources).forEach((key) => {
    if (!loadedResources[key]) {
      loadedResources[key] = true
    }
  })
  checkAllResourcesLoaded()
})
