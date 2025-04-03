// home.js - Complete solution with integrated user reports and safety prediction

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const MAP_CENTER = [28.6139, 77.2090]; // New Delhi coordinates
const MAP_ZOOM = 12;

// Global variables
let map;
let allMarkers = [];
let userReports = [];

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Home] Initializing...');
    try {
        console.log('[Home] Initializing map...');
        initializeMap();
        
        console.log('[Home] Loading and displaying reports...');
        await loadAndDisplayReports();
        
        console.log('[Home] Loading user reports...');
        await fetchUserReports();
        
        console.log('[Home] Initializing statistics chart...');
        initializeStatisticsChart();
        
        console.log('[Home] Setting up event listeners...');
        setupEventListeners();
        
        console.log('[Home] Checking for map focus...');
        checkMapFocus();
        
        console.log('[Home] Initialization complete');
    } catch (error) {
        console.error('[Home] Initialization failed:', error);
        showError('Failed to load page. Please refresh.');
    }
});

// Initialize Leaflet map with legend
function initializeMap() {
    console.log('[Map] Initializing...');
    
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        showError('Map functionality not available. Please refresh the page.');
        return;
    }

    // Ensure map container exists and has proper dimensions
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('Map container element not found');
        return;
    }
    
    // Set a minimum height for the map container
    mapContainer.style.height = '500px';
    mapContainer.style.width = '100%';
    
    try {
        // Initialize the map
        map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
        
        console.log('[Map] Adding tile layer...');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        console.log('[Map] Adding legend...');
        addMapLegend();
        
        console.log('[Map] Map initialized successfully');
    } catch (error) {
        console.error('[Map] Initialization failed:', error);
        showError('Failed to initialize map. Please try again.');
    }
}

// Load reports from database and display on map
async function loadAndDisplayReports() {
    console.log('[Reports] Loading reports from database...');
    showLoading(true);
    
    try {
        console.log('[Reports] Fetching reports from API...');
        const reports = await fetchAllReports();
        
        if (!reports) {
            console.error('[Reports] No reports data received from API');
            showError('Failed to load reports data');
            return;
        }
        
        if (!Array.isArray(reports)) {
            console.error('[Reports] Invalid reports data format:', typeof reports);
            showError('Invalid reports data format');
            return;
        }
        
        console.log(`[Reports] Received ${reports.length} reports from API`);
        
        if (reports.length === 0) {
            console.log('[Reports] No reports found in database');
            showMessage('No reports available yet. Be the first to report!');
            return;
        }
        
        // Debug: Log first few reports to verify data
        console.log('[Reports] Sample report data:', reports.slice(0, 3));
        
        console.log('[Reports] Displaying reports on map...');
        await displayReportsOnMap(reports);
        
    } catch (error) {
        console.error('[Reports] Error loading reports:', error);
        showError('Failed to load reports from database');
    } finally {
        showLoading(false);
    }
}

// Fetch all reports from backend with detailed logging
async function fetchAllReports() {
    console.log('[API] Fetching reports from backend...');
    
    try {
        const token = localStorage.getItem('token') || '';
        console.log('[API] Using token:', token ? '*****' + token.slice(-5) : 'No token');
        
        const response = await fetch(`${API_BASE_URL}/api/reports/all`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('[API] Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API] Request failed with status:', response.status, 'Error:', errorText);
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[API] Response data:', data);
        
        if (!data.reports) {
            console.warn('[API] No reports array in response data');
            return [];
        }
        
        return data.reports;
    } catch (error) {
        console.error('[API] Error fetching reports:', error);
        throw error;
    }
}

// Display reports as markers on map with safety prediction
async function displayReportsOnMap(reports) {
    console.log('[Map] Displaying reports on map...');
    console.log(`[Map] Processing ${reports.length} reports...`);
    
    clearAllMarkers();
    
    // Track successful and failed markers
    let successCount = 0;
    let failCount = 0;
    
    for (const report of reports) {
        try {
            console.log(`[Map] Processing report ${report.id} at ${report.latitude},${report.longitude}`);
            
            // Validate coordinates
            if (!report.latitude || !report.longitude) {
                console.error(`[Map] Report ${report.id} missing coordinates`);
                failCount++;
                continue;
            }
            
            const lat = parseFloat(report.latitude);
            const lng = parseFloat(report.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
                console.error(`[Map] Invalid coordinates for report ${report.id}: ${report.latitude},${report.longitude}`);
                failCount++;
                continue;
            }
            
            let safetyPrediction = null;
            try {
                console.log(`[Map] Getting safety prediction for report ${report.id}...`);
                safetyPrediction = await predictLocationSafety({
                    latitude: lat,
                    longitude: lng,
                    incidentType: report.crime_type_id || 0,
                    dateTime: report.date_time,
                    locationType: report.location_type || 'Street',
                    injured: report.injured === 'yes',
                    reported: report.reported === 'yes',
                    people_involved: report.people_involved || 1
                });
                console.log(`[Map] Safety prediction for report ${report.id}:`, safetyPrediction);
            } catch (predictionError) {
                console.error(`[Map] Safety prediction failed for report ${report.id}:`, predictionError);
                // Continue with basic marker
            }
            
            console.log(`[Map] Creating marker for report ${report.id}...`);
            const marker = createReportMarker(report, safetyPrediction);
            allMarkers.push(marker);
            successCount++;
            
        } catch (error) {
            console.error(`[Map] Error processing report ${report.id}:`, error);
            failCount++;
        }
    }
    
    console.log(`[Map] Marker creation complete. Success: ${successCount}, Failed: ${failCount}`);
    
    if (allMarkers.length > 0) {
        console.log('[Map] Fitting map to markers...');
        const markerGroup = new L.featureGroup(allMarkers);
        map.fitBounds(markerGroup.getBounds().pad(0.2));
        console.log('[Map] Map bounds adjusted to markers');
    } else {
        console.warn('[Map] No valid markers were created');
    }
}

// Create a marker for a single report with safety prediction
function createReportMarker(report, safetyPrediction = null) {
    console.log(`[Map] Creating marker for report ${report.id}`);
    
    // Determine marker color
    let markerColor;
    if (safetyPrediction) {
        console.log(`[Map] Using safety prediction for color (${safetyPrediction.prediction})`);
        switch(safetyPrediction.prediction.toLowerCase()) {
            case 'very safe': markerColor = 'green'; break;
            case 'safe': markerColor = 'blue'; break;
            case 'moderate': markerColor = 'yellow'; break;
            case 'unsafe': markerColor = 'orange'; break;
            case 'dangerous': markerColor = 'red'; break;
            default: 
                console.log(`[Map] Unknown prediction: ${safetyPrediction.prediction}, using severity`);
                markerColor = getMarkerColor(report.severity);
        }
    } else {
        console.log(`[Map] No safety prediction, using severity (${report.severity})`);
        markerColor = getMarkerColor(report.severity);
    }
    
    console.log(`[Map] Selected marker color: ${markerColor}`);
    
    const icon = L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    
    console.log(`[Map] Creating marker at ${report.latitude},${report.longitude}`);
    const marker = L.marker(
        [report.latitude, report.longitude], 
        { 
            icon, 
            reportId: report.id,
            safetyStatus: safetyPrediction ? safetyPrediction.prediction : null
        }
    ).addTo(map);
    
    console.log(`[Map] Creating popup for report ${report.id}`);
    marker.bindPopup(createPopupContent(report, safetyPrediction));
    
    console.log(`[Map] Marker for report ${report.id} created successfully`);
    return marker;
}

// Create popup content for a report marker
function createPopupContent(report, safetyPrediction) {
    console.log(`[Map] Creating popup content for report ${report.id}`);
    
    let safetyContent = '';
    if (safetyPrediction) {
        const safetyClass = safetyPrediction.prediction.toLowerCase().replace(' ', '-');
        safetyContent = `
            <div class="safety-info">
                <h4>Safety Assessment</h4>
                <div class="safety-prediction ${safetyClass}">
                    <span class="safety-status">${safetyPrediction.prediction}</span>
                    <span class="safety-score">(${safetyPrediction.safety_score}% safe)</span>
                </div>
                <div class="safety-factors">
                    <p>Factors considered:</p>
                    <ul>
                        <li>Crime type: ${safetyPrediction.factors.crime_type}</li>
                        <li>Time: ${safetyPrediction.factors.time}</li>
                        <li>Location: ${safetyPrediction.factors.location}</li>
                        <li>Injured: ${safetyPrediction.factors.injured ? 'Yes' : 'No'}</li>
                        <li>Reported: ${safetyPrediction.factors.reported ? 'Yes' : 'No'}</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="report-popup">
            <h3>${report.incident_title || 'Incident Report'}</h3>
            <p><strong>Type:</strong> ${report.crime_type || 'Unknown'}</p>
            <p><strong>Date:</strong> ${new Date(report.date_time).toLocaleString()}</p>
            <p><strong>Description:</strong> ${report.description || 'No description provided'}</p>
            ${safetyContent}
            ${report.user_id ? `<p><em>Reported by user</em></p>` : ''}
        </div>
    `;
}

// Fetch user reports from backend
async function fetchUserReports() {
    console.log('[User] Fetching user reports...');
    showLoading(true);
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[User] No token found, skipping user reports');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/auth/user-reports`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user reports');
        }
        
        const data = await response.json();
        userReports = data.reports || [];
        console.log(`[User] Retrieved ${userReports.length} user reports`);
        
        // Highlight user reports on the map
        highlightUserReports(userReports);
        
    } catch (error) {
        console.error('[User] Error fetching user reports:', error);
    } finally {
        showLoading(false);
    }
}

// Highlight user's reports on the map with special markers
function highlightUserReports(reports) {
    console.log('[Map] Highlighting user reports...');
    
    if (!reports || reports.length === 0) {
        console.log('[Map] No user reports to highlight');
        return;
    }
    
    const userIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    
    reports.forEach(report => {
        if (!report.latitude || !report.longitude) return;
        
        const marker = L.marker(
            [report.latitude, report.longitude],
            { icon: userIcon, zIndexOffset: 1000 }
        ).addTo(map);
        
        marker.bindPopup(`
            <div class="user-report-popup">
                <h3>Your Report</h3>
                <p><strong>Type:</strong> ${report.crime_type || 'Unknown'}</p>
                <p><strong>Date:</strong> ${new Date(report.date_time).toLocaleString()}</p>
                <p><strong>Status:</strong> ${report.status || 'Submitted'}</p>
                <button class="view-report-details" data-id="${report.id}">View Details</button>
            </div>
        `);
        
        allMarkers.push(marker);
    });
    
    console.log(`[Map] Highlighted ${reports.length} user reports`);
}

// Enhanced Safety Prediction Model
const safetyModel = {
    crimeWeights: {
        "Eve-Teasing": 3, "Catcalling": 2, "Stalking": 4, "Threats & Intimidation": 5,
        "Unwanted Touching": 7, "Robbery & Theft": 8, "Snatching": 6,
        "Pickpocketing": 3, "Forced Robbery": 9, "Public Transport Harassment": 5,
        "Suspicious Taxi/Auto Behavior": 6, "Overcrowding & Unsafe Situations": 4,
        "Poor Street Lighting": 5, "Lack of CCTV Coverage": 6, "Isolated Areas": 7
    },
    timeRiskFactors: { "Daytime": 1.0, "Night": 1.5, "Midnight": 1.8 },
    locationRiskFactors: {
        "Residential": 1.0, "Commercial": 1.3, "Public Transport": 1.7,
        "Park": 1.5, "Street": 1.4, "Alley": 2.0
    },
    additionalFactors: {
        "injured": 15, "reported": -5, "anonymous": 3, "weapons": 10,
        "alcohol": 5, "crowded": -3, "isolated": 8, "police_nearby": -7,
        "good_lighting": -4
    },
    categoryMapping: {
        0: "Eve-Teasing", 1: "Catcalling", 2: "Stalking", 3: "Threats & Intimidation",
        4: "Unwanted Touching", 5: "Robbery & Theft", 6: "Snatching",
        7: "Pickpocketing", 8: "Forced Robbery", 9: "Public Transport Harassment",
        10: "Suspicious Taxi/Auto Behavior", 11: "Overcrowding & Unsafe Situations",
        12: "Poor Street Lighting", 13: "Lack of CCTV Coverage", 14: "Isolated Areas"
    },

    calculateRiskScore(params) {
        const crimeType = this.categoryMapping[params.incidentType] || "Unknown";
        const timeCategory = this.getTimeCategory(params.dateTime);
        let riskScore = this.crimeWeights[crimeType] || 5;
        riskScore *= this.timeRiskFactors[timeCategory] || 1.0;
        riskScore *= this.locationRiskFactors[params.locationType] || 1.2;
        
        if (params.injured) riskScore += this.additionalFactors.injured;
        if (params.reported) riskScore += this.additionalFactors.reported;
        if (params.people_involved > 1) riskScore += (params.people_involved - 1) * 2;
        
        return riskScore;
    },

    getTimeCategory(dateTime) {
        const hour = new Date(dateTime).getHours();
        if (6 <= hour && hour < 18) return "Daytime";
        if (18 <= hour && hour < 23) return "Night";
        return "Midnight";
    },

    predictSafety(params) {
        const riskScore = this.calculateRiskScore(params);
        let safetyScore, prediction;
        
        if (riskScore < 4) {
            safetyScore = 85 + (Math.random() * 10);
            prediction = "Very Safe";
        } else if (riskScore < 7) {
            safetyScore = 70 + (Math.random() * 15);
            prediction = "Safe";
        } else if (riskScore < 10) {
            safetyScore = 50 + (Math.random() * 20);
            prediction = "Moderate";
        } else if (riskScore < 15) {
            safetyScore = 30 + (Math.random() * 20);
            prediction = "Unsafe";
        } else {
            safetyScore = 10 + (Math.random() * 20);
            prediction = "Dangerous";
        }
        
        safetyScore = Math.max(5, Math.min(95, Math.round(safetyScore)));
        
        return {
            prediction,
            safety_score: safetyScore,
            risk_score: 100 - safetyScore,
            factors: {
                crime_type: this.categoryMapping[params.incidentType],
                time: this.getTimeCategory(params.dateTime),
                location: params.locationType,
                injured: params.injured,
                reported: params.reported,
                people_involved: params.people_involved
            }
        };
    }
};

// Enhanced prediction function with all parameter combinations
async function predictLocationSafety(params) {
    const defaultParams = {
        latitude: 0,
        longitude: 0,
        incidentType: 0,
        dateTime: new Date().toISOString(),
        locationType: "Street",
        injured: false,
        reported: false,
        anonymous: false,
        weapons: false,
        alcohol: false,
        crowded: false,
        isolated: false,
        police_nearby: false,
        good_lighting: false,
        people_involved: 1
    };
    
    const predictionParams = {...defaultParams, ...params};
    
    try {
        showLoading(true);
        
        // Try API first if available
        try {
            const response = await fetch('http://127.0.0.1:5000/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(predictionParams),
                timeout: 2000
            });
            
            if (response.ok) {
                const data = await response.json();
                return formatSafetyResult(data);
            }
        } catch (apiError) {
            console.warn("API prediction failed, using local model:", apiError);
        }
        
        // Fallback to local model with all parameter combinations
        const prediction = safetyModel.predictSafety(predictionParams);
        return formatSafetyResult(prediction);
        
    } catch (error) {
        console.error("Prediction error:", error);
        return formatErrorResult();
    } finally {
        showLoading(false);
    }
}

// Helper functions
function getMarkerColor(severity) {
    switch(severity) {
        case 'low': return 'green';
        case 'medium': return 'orange';
        case 'high': return 'red';
        default: return 'gray';
    }
}

function clearAllMarkers() {
    allMarkers.forEach(marker => map.removeLayer(marker));
    allMarkers = [];
}

function addMapLegend() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML = `
            <h4>Safety Legend</h4>
            <div><i class="legend-icon" style="background-color: #4CAF50"></i> Very Safe</div>
            <div><i class="legend-icon" style="background-color: #2196F3"></i> Safe</div>
            <div><i class="legend-icon" style="background-color: #FFEB3B"></i> Moderate</div>
            <div><i class="legend-icon" style="background-color: #FF9800"></i> Unsafe</div>
            <div><i class="legend-icon" style="background-color: #F44336"></i> Dangerous</div>
            <div><i class="legend-icon" style="background-color: #9E9E9E"></i> Unknown</div>
            <div><i class="legend-icon" style="background-color: #8A2BE2"></i> Your Reports</div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

function initializeStatisticsChart() {
    const ctx = document.getElementById('comparison-chart')?.getContext('2d');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'],
            datasets: [
                {
                    label: 'Reported Crimes',
                    data: [378277, 405861, 371503, 428278, 445256, 450000, 460000],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)'
                },
                {
                    label: 'Estimated Crimes',
                    data: [500000, 530000, 490000, 550000, 570000, 580000, 590000],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: {
                title: {
                    display: true,
                    text: 'Crime Statistics Over the Years'
                }
            }
        }
    });
}

function setupEventListeners() {
    // Report incident button
    const reportBtn = document.querySelector('.report-incident');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            if (!localStorage.getItem('token')) {
                showError('Please login to report an incident');
                window.location.href = 'login.html';
                return;
            }
            window.location.href = 'report.html';
        });
    }
    
    // Explore map button
    const exploreBtn = document.querySelector('.explore-map');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            document.getElementById('map-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function checkMapFocus() {
    const mapFocus = sessionStorage.getItem('mapFocus');
    if (mapFocus) {
        try {
            const { lat, lng, reportId } = JSON.parse(mapFocus);
            map.setView([lat, lng], 16);
            sessionStorage.removeItem('mapFocus');
            
            // Highlight the specific report if ID is provided
            if (reportId) {
                setTimeout(() => {
                    const marker = allMarkers.find(m => m.options.reportId == reportId);
                    if (marker) {
                        marker.openPopup();
                        marker.setIcon(L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        }));
                    }
                }, 1000);
            }
        } catch (e) {
            console.error('Error parsing map focus:', e);
        }
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    const icon = document.getElementById('theme-toggle');
    icon.textContent = isDark ? '☀️' : '🌙';
}

function showLoading(show) {
    const spinner = document.getElementById('loading-spinner') || createSpinner();
    spinner.style.display = show ? 'block' : 'none';
}

function createSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'loading-spinner';
    spinner.innerHTML = '<div class="spinner"></div><p>Loading reports...</p>';
    document.body.appendChild(spinner);
    return spinner;
}

function showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function showMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'info-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Add dynamic styles
if (!document.querySelector('style.map-styles')) {
    const style = document.createElement('style');
    style.className = 'map-styles';
    style.textContent = `
        .report-popup, .user-report-popup {
            max-width: 300px;
            font-family: 'Poppins', sans-serif;
        }
        .report-popup h3, .user-report-popup h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.2rem;
        }
        .report-popup p, .user-report-popup p {
            margin: 5px 0;
            font-size: 0.9rem;
        }
        .safety-info {
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
            background: #f5f5f5;
        }
        .safety-info h4 {
            margin: 0 0 8px 0;
            font-size: 1rem;
        }
        .safety-prediction {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .safety-status {
            font-weight: bold;
        }
        .safety-score {
            color: #666;
            font-size: 0.9rem;
        }
        .safety-factors {
            font-size: 0.85rem;
        }
        .safety-factors ul {
            margin: 5px 0 0 0;
            padding-left: 20px;
        }
        .safety-factors li {
            margin-bottom: 3px;
        }
        .map-legend {
            padding: 10px;
            background: white;
            border-radius: 5px;
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            line-height: 1.5;
            font-family: 'Poppins', sans-serif;
        }
        .map-legend h4 {
            margin: 0 0 10px;
            font-size: 1rem;
        }
        .map-legend div {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }
        .legend-icon {
            display: inline-block;
            width: 20px;
            height: 20px;
            margin-right: 8px;
            border-radius: 50%;
            border: 1px solid #555;
        }
        .view-report-details {
            margin-top: 10px;
            padding: 5px 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .view-report-details:hover {
            background: #45a049;
        }
        #loading-spinner {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px;
            border-radius: 5px;
            z-index: 1000;
            display: none;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 4px solid #fff;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: #f44336;
            color: white;
            border-radius: 4px;
            z-index: 1000;
            animation: fadeIn 0.5s;
        }
        .info-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: #4CAF50;
            color: white;
            border-radius: 4px;
            z-index: 1000;
            animation: fadeIn 0.5s;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .very-safe {
            color: #4CAF50;
        }
        .safe {
            color: #2196F3;
        }
        .moderate {
            color: #FFC107;
        }
        .unsafe {
            color: #FF9800;
        }
        .dangerous {
            color: #F44336;
        }
        .error {
            color: #9E9E9E;
        }
    `;
    document.head.appendChild(style);
}