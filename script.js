// API Configuration
const API_KEY = 'dc1487ab17c9441a815140627251809'; // Replace with your WeatherAPI key
const DEFAULT_CITY = 'Pune';

// DOM Elements
const elements = {
    locationModal: document.getElementById('locationModal'),
    allowLocationBtn: document.getElementById('allowLocation'),
    skipLocationBtn: document.getElementById('skipLocation'),
    cityInput: document.getElementById('cityInput'),
    geoBtn: document.getElementById('geoBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    themeToggle: document.getElementById('themeToggle'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    favoritesDropdown: document.getElementById('favoritesDropdown'),
    closeFavorites: document.getElementById('closeFavorites'),
    favoritesList: document.getElementById('favoritesList'),
    noFavorites: document.getElementById('noFavorites'),
    addFavoriteBtn: document.getElementById('addFavoriteBtn'),
    loadingContainer: document.getElementById('loadingContainer'),
    errorContainer: document.getElementById('errorContainer'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    mainContent: document.getElementById('mainContent'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings')
};

// Global state
let currentLocation = null;
let currentWeatherData = null;
let weatherMap = null;
let isLocationPermissionAsked = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkLocationPermission();
});

function initializeApp() {
    // Update current date/time
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
    
    // Load default weather for Pune
    fetchWeatherData(DEFAULT_CITY);
    
    // Load favorites
    loadFavorites();
    
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function setupEventListeners() {
    // Location modal
    elements.allowLocationBtn.addEventListener('click', requestLocation);
    elements.skipLocationBtn.addEventListener('click', () => {
        elements.locationModal.classList.remove('show');
        fetchWeatherData(DEFAULT_CITY);
    });
    
    // Search functionality
    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = elements.cityInput.value.trim();
            if (city) fetchWeatherData(city);
        }
    });
    
    elements.geoBtn.addEventListener('click', requestLocation);
    elements.refreshBtn.addEventListener('click', () => {
        if (currentLocation) {
            if (currentLocation.coords) {
                fetchWeatherByCoords(currentLocation.coords.lat, currentLocation.coords.lon);
            } else {
                fetchWeatherData(currentLocation.name);
            }
        }
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Favorites
    elements.favoritesBtn.addEventListener('click', toggleFavorites);
    elements.closeFavorites.addEventListener('click', () => {
        elements.favoritesDropdown.classList.remove('show');
    });
    elements.addFavoriteBtn.addEventListener('click', addCurrentLocationToFavorites);
    
    // Settings
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('show');
    });
    elements.closeSettings.addEventListener('click', () => {
        elements.settingsModal.classList.remove('show');
    });
    
    // Unit change
    document.querySelectorAll('input[name="unit"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (currentLocation) {
                if (currentLocation.coords) {
                    fetchWeatherByCoords(currentLocation.coords.lat, currentLocation.coords.lon);
                } else {
                    fetchWeatherData(currentLocation.name);
                }
            }
        });
    });
    
    // Error retry
    elements.retryBtn.addEventListener('click', () => {
        if (currentLocation) {
            if (currentLocation.coords) {
                fetchWeatherByCoords(currentLocation.coords.lat, currentLocation.coords.lon);
            } else {
                fetchWeatherData(currentLocation.name);
            }
        } else {
            fetchWeatherData(DEFAULT_CITY);
        }
    });
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === elements.locationModal) {
            elements.locationModal.classList.remove('show');
        }
        if (e.target === elements.settingsModal) {
            elements.settingsModal.classList.remove('show');
        }
        if (!elements.favoritesBtn.contains(e.target) && !elements.favoritesDropdown.contains(e.target)) {
            elements.favoritesDropdown.classList.remove('show');
        }
    });
}

function checkLocationPermission() {
    if (!isLocationPermissionAsked && 'geolocation' in navigator) {
        elements.locationModal.classList.add('show');
        isLocationPermissionAsked = true;
    }
}

function requestLocation() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                elements.locationModal.classList.remove('show');
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error('Location error:', error);
                elements.locationModal.classList.remove('show');
                showError('Unable to get your location. Showing weather for Pune instead.');
                fetchWeatherData(DEFAULT_CITY);
            }
        );
    } else {
        showError('Geolocation is not supported by this browser.');
    }
}

async function fetchWeatherData(city) {
    showLoading(true);
    try {
        const units = getSelectedUnit();
        const response = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city)}&days=7&aqi=yes&alerts=no`
        );
        
        if (!response.ok) {
            throw new Error('Weather data not found');
        }
        
        const data = await response.json();
        currentWeatherData = data;
        currentLocation = {
            name: `${data.location.name}, ${data.location.region}`,
            coords: { lat: data.location.lat, lon: data.location.lon }
        };
        
        displayWeatherData(data);
        updateWeatherTheme(data.current.condition.code);
        
    } catch (error) {
        console.error('Weather fetch error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

async function fetchWeatherByCoords(lat, lon) {
    showLoading(true);
    try {
        const units = getSelectedUnit();
        const response = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=7&aqi=yes&alerts=no`
        );
        
        if (!response.ok) {
            throw new Error('Weather data not found');
        }
        
        const data = await response.json();
        currentWeatherData = data;
        currentLocation = {
            name: `${data.location.name}, ${data.location.region}`,
            coords: { lat: data.location.lat, lon: data.location.lon }
        };
        
        displayWeatherData(data);
        updateWeatherTheme(data.current.condition.code);
        
    } catch (error) {
        console.error('Weather fetch error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function displayWeatherData(data) {
    const units = getSelectedUnit();
    const isMetric = units === 'metric';
    
    // Update location and time
    document.getElementById('currentLocation').textContent = currentLocation.name;
    
    // Update main weather display
    const temp = isMetric ? data.current.temp_c : data.current.temp_f;
    const feelsLike = isMetric ? data.current.feelslike_c : data.current.feelslike_f;
    const maxTemp = isMetric ? data.forecast.forecastday[0].day.maxtemp_c : data.forecast.forecastday[0].day.maxtemp_f;
    const minTemp = isMetric ? data.forecast.forecastday[0].day.mintemp_c : data.forecast.forecastday[0].day.mintemp_f;
    
    document.getElementById('mainTemperature').textContent = `${Math.round(temp)}°`;
    document.getElementById('feelsLike').textContent = `Feels like ${Math.round(feelsLike)}°`;
    document.getElementById('tempRange').textContent = `H:${Math.round(maxTemp)}° L:${Math.round(minTemp)}°`;
    document.getElementById('mainWeatherIcon').src = `https:${data.current.condition.icon}`;
    document.getElementById('weatherCondition').textContent = data.current.condition.text;
    document.getElementById('weatherDetails').textContent = getWeatherDetails(data);
    
    // Update stats
    document.getElementById('humidity').textContent = `${data.current.humidity}%`;
    document.getElementById('windSpeed').textContent = isMetric ? 
        `${data.current.wind_kph} km/h` : `${data.current.wind_mph} mph`;
    document.getElementById('pressure').textContent = `${data.current.pressure_mb} mb`;
    document.getElementById('visibility').textContent = isMetric ? 
        `${data.current.vis_km} km` : `${data.current.vis_miles} mi`;
    document.getElementById('uvIndex').textContent = data.current.uv;
    document.getElementById('chanceOfRain').textContent = `${data.forecast.forecastday[0].day.daily_chance_of_rain}%`;
    
    // Update sun/moon info
    document.getElementById('sunrise').textContent = data.forecast.forecastday[0].astro.sunrise;
    document.getElementById('sunset').textContent = data.forecast.forecastday[0].astro.sunset;
    document.getElementById('moonPhaseName').textContent = data.forecast.forecastday[0].astro.moon_phase;
    document.getElementById('moonIllumination').textContent = `${data.forecast.forecastday[0].astro.moon_illumination}% illuminated`;
    
    // Update hourly forecast
    updateHourlyForecast(data.forecast.forecastday[0].hour, isMetric);
    
    // Update weekly forecast
    updateWeeklyForecast(data.forecast.forecastday, isMetric);
    
    // Update air quality
    if (data.current.air_quality) {
        updateAirQuality(data.current.air_quality);
    }
    
    // Update map
    updateMap(data.location.lat, data.location.lon, data.location.name);
    
    // Show main content
    elements.mainContent.classList.add('show');
}

function updateHourlyForecast(hourlyData, isMetric) {
    const container = document.getElementById('hourlyScroll');
    container.innerHTML = '';
    
    const currentHour = new Date().getHours();
    const next24Hours = hourlyData.slice(currentHour).concat(hourlyData.slice(0, currentHour));
    
    next24Hours.slice(0, 24).forEach((hour, index) => {
        const time = new Date(hour.time).getHours();
        const temp = isMetric ? hour.temp_c : hour.temp_f;
        
        const hourCard = document.createElement('div');
        hourCard.className = 'hourly-card';
        hourCard.innerHTML = `
            <div class="hourly-time">${index === 0 ? 'Now' : `${time}:00`}</div>
            <img class="hourly-icon" src="https:${hour.condition.icon}" alt="${hour.condition.text}">
            <div class="hourly-temp">${Math.round(temp)}°</div>
            <div class="hourly-desc">${hour.chance_of_rain}%</div>
        `;
        container.appendChild(hourCard);
    });
}

function updateWeeklyForecast(forecastData, isMetric) {
    const container = document.getElementById('weeklyContainer');
    container.innerHTML = '';
    
    forecastData.forEach((day, index) => {
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Today' : 
                       index === 1 ? 'Tomorrow' : 
                       date.toLocaleDateString('en', { weekday: 'long' });
        
        const maxTemp = isMetric ? day.day.maxtemp_c : day.day.maxtemp_f;
        const minTemp = isMetric ? day.day.mintemp_c : day.day.mintemp_f;
        
        const weeklyCard = document.createElement('div');
        weeklyCard.className = 'weekly-card';
        weeklyCard.innerHTML = `
            <div class="weekly-day">${dayName}</div>
            <img class="weekly-icon" src="https:${day.day.condition.icon}" alt="${day.day.condition.text}">
            <div class="weekly-desc">${day.day.condition.text}</div>
            <div class="weekly-temps">
                <span class="weekly-high">${Math.round(maxTemp)}°</span>
                <span class="weekly-low">${Math.round(minTemp)}°</span>
            </div>
            <div class="weekly-rain">${day.day.daily_chance_of_rain}%</div>
        `;
        container.appendChild(weeklyCard);
    });
}

function updateAirQuality(aqiData) {
    const aqi = Math.round(aqiData.us_epa_index || 50);
    let aqiLabel = 'Good';
    let aqiDescription = 'Air quality is satisfactory';
    
    if (aqi <= 50) {
        aqiLabel = 'Good';
        aqiDescription = 'Air quality is satisfactory';
    } else if (aqi <= 100) {
        aqiLabel = 'Moderate';
        aqiDescription = 'Air quality is acceptable';
    } else if (aqi <= 150) {
        aqiLabel = 'Unhealthy for Sensitive Groups';
        aqiDescription = 'May cause issues for sensitive individuals';
    } else {
        aqiLabel = 'Unhealthy';
        aqiDescription = 'Everyone may experience health effects';
    }
    
    document.getElementById('aqiValue').textContent = aqi;
    document.getElementById('aqiLabel').textContent = aqiLabel;
    document.getElementById('aqiDescription').textContent = aqiDescription;
    
    // Update individual components (if available)
    if (aqiData.pm2_5) document.getElementById('pm25').textContent = `${Math.round(aqiData.pm2_5)} μg/m³`;
    if (aqiData.pm10) document.getElementById('pm10').textContent = `${Math.round(aqiData.pm10)} μg/m³`;
    if (aqiData.o3) document.getElementById('o3').textContent = `${Math.round(aqiData.o3)} μg/m³`;
    if (aqiData.no2) document.getElementById('no2').textContent = `${Math.round(aqiData.no2)} μg/m³`;
}

function updateMap(lat, lon, locationName) {
    if (!weatherMap) {
        weatherMap = L.map('weatherMap').setView([lat, lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(weatherMap);
    }
    
    weatherMap.setView([lat, lon], 10);
    
    // Clear existing markers
    weatherMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            weatherMap.removeLayer(layer);
        }
    });
    
    // Add new marker
    L.marker([lat, lon]).addTo(weatherMap)
        .bindPopup(`<b>${locationName}</b><br>Current weather location`)
        .openPopup();
    
    // Update map overlay info
    document.getElementById('mapLocationName').textContent = locationName;
    document.getElementById('mapLocationCoords').textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
}

function updateWeatherTheme(conditionCode) {
    const body = document.body;
    
    // Remove existing weather classes
    body.classList.remove('weather-sunny', 'weather-cloudy', 'weather-rainy', 'weather-stormy', 'weather-snowy');
    
    // Add appropriate weather class based on condition code
    if ([1000].includes(conditionCode)) {
        body.classList.add('weather-sunny');
    } else if ([1003, 1006, 1009].includes(conditionCode)) {
        body.classList.add('weather-cloudy');
    } else if ([1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(conditionCode)) {
        body.classList.add('weather-rainy');
    } else if ([1273, 1276, 1279, 1282].includes(conditionCode)) {
        body.classList.add('weather-stormy');
    } else if ([1066, 1069, 1072, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225].includes(conditionCode)) {
        body.classList.add('weather-snowy');
    } else {
        body.classList.add('weather-cloudy'); // Default
    }
}

function getWeatherDetails(data) {
    const windDir = data.current.wind_dir;
    const windSpeed = data.current.wind_kph;
    return `Wind ${windSpeed} km/h ${windDir}`;
}

function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-US', options);
}

function getSelectedUnit() {
    return document.querySelector('input[name="unit"]:checked').value;
}

function showLoading(show) {
    elements.loadingContainer.classList.toggle('show', show);
    elements.errorContainer.classList.remove('show');
    elements.mainContent.classList.toggle('show', !show);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorContainer.classList.add('show');
    elements.loadingContainer.classList.remove('show');
    elements.mainContent.classList.remove('show');
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    elements.themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function toggleFavorites() {
    elements.favoritesDropdown.classList.toggle('show');
}

function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');
    const container = elements.favoritesList;
    const noFavorites = elements.noFavorites;
    
    container.innerHTML = '';
    
    if (favorites.length === 0) {
        noFavorites.style.display = 'block';
        return;
    }
    
    noFavorites.style.display = 'none';
    
    favorites.forEach((fav, index) => {
        const favItem = document.createElement('div');
        favItem.className = 'favorite-item';
        favItem.innerHTML = `
            <div class="favorite-info">
                <div class="favorite-name">${fav.name}</div>
                <div class="favorite-coords">${fav.lat.toFixed(2)}°, ${fav.lon.toFixed(2)}°</div>
            </div>
            <button class="remove-favorite" onclick="removeFavorite(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        favItem.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-favorite')) {
                elements.favoritesDropdown.classList.remove('show');
                fetchWeatherByCoords(fav.lat, fav.lon);
            }
        });
        
        container.appendChild(favItem);
    });
}

function addCurrentLocationToFavorites() {
    if (!currentLocation) return;
    
    const favorites = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');
    
    // Check if already exists
    const exists = favorites.some(fav => 
        Math.abs(fav.lat - currentLocation.coords.lat) < 0.01 && 
        Math.abs(fav.lon - currentLocation.coords.lon) < 0.01
    );
    
    if (exists) {
        alert('This location is already in your favorites!');
        return;
    }
    
    favorites.push({
        name: currentLocation.name,
        lat: currentLocation.coords.lat,
        lon: currentLocation.coords.lon
    });
    
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    loadFavorites();
    
    // Update button state
    elements.addFavoriteBtn.classList.add('active');
    elements.addFavoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
    
    setTimeout(() => {
        elements.addFavoriteBtn.classList.remove('active');
        elements.addFavoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
    }, 2000);
}

function removeFavorite(index) {
    const favorites = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');
    favorites.splice(index, 1);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    loadFavorites();
}

// Make removeFavorite available globally
window.removeFavorite = removeFavorite;
