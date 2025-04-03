document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed"); // Debug log
    fetchUserProfile();
});

async function fetchUserProfile() {
    console.log("fetchUserProfile function called"); // Debug log
    console.log("Fetching user profile..."); // Debug log

    const token = localStorage.getItem('token');
    console.log("Token from localStorage:", token); // Debug log

    if (!token) {
        console.error("No token found. Redirecting to login page."); // Debug log
        alert('Please log in to view your profile.');
        window.location.href = 'login.html';
        return;
    }

    try {
        console.log("Making API request to fetch profile..."); // Debug log

        const response = await fetch('http://localhost:3000/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log("API response received:", response); // Debug log

        if (!response.ok) {
            console.error("API request failed. Status:", response.status); // Debug log
            throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        console.log("API data:", data); // Debug log

        // Verify the structure of the response
        console.log("Response data structure:", data);

        // Update the DOM with the fetched profile data
        console.log("Updating DOM with profile data...");

        document.getElementById('profile-name').textContent = data.user.name;
        console.log("Updated profile name:", data.user.name);

        document.getElementById('profile-email').textContent = data.user.email;
        console.log("Updated profile email:", data.user.email);

        document.getElementById('profile-phone').textContent = data.user.phone;
        console.log("Updated profile phone:", data.user.phone);

        const profilePicture = document.getElementById('profile-picture');
        profilePicture.src = data.user.profile_picture || 'images/default-profile.png';
        console.log("Updated profile picture:", profilePicture.src);
    } catch (error) {
        console.error("Error fetching profile:", error); // Debug log
        alert('Failed to load profile. Please try again.');
    }
}

// Logout functionality
document.getElementById('logout-btn').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent default link behavior

    // Show logging out message
    const logoutMessage = document.createElement('div');
    logoutMessage.innerText = "Logging out...";
    logoutMessage.style.position = "fixed";
    logoutMessage.style.top = "50%";
    logoutMessage.style.left = "50%";
    logoutMessage.style.transform = "translate(-50%, -50%)";
    logoutMessage.style.background = "rgba(0, 0, 0, 0.8)";
    logoutMessage.style.color = "white";
    logoutMessage.style.padding = "20px";
    logoutMessage.style.fontSize = "1.5rem";
    logoutMessage.style.borderRadius = "8px";
    document.body.appendChild(logoutMessage);

    // Clear session/local storage
    sessionStorage.removeItem("authToken"); 
    localStorage.removeItem("authToken");

    // Delay for effect, then redirect
    setTimeout(() => {
        window.location.href = "index.html";
    }, 2000); // 2 seconds delay
});

// Fetch user reports
let currentPage = 1;
const reportsPerPage = 3; // Display 3 reports per page

console.log("Profile script loaded."); // Debug log



async function fetchUserReports() {
    console.log("🔍 Fetching user reports...");

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to view your reports.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/auth/user-reports', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch reports');

        const data = await response.json();
        const reportsList = document.getElementById('reports-list');

        if (!data.reports || data.reports.length === 0) {
            reportsList.innerHTML = `<tr><td colspan="8">No reports submitted yet.</td></tr>`;
            return;
        }

        reportsList.innerHTML = '';

        for (const report of data.reports) {
            // Get safety prediction for the report's location
            const safetyPrediction = await predictLocationSafety(report.latitude, report.longitude);


             // Format the date to human-readable format
             const formattedDate = new Date(report.date_time).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            report.date_time = formattedDate; // Update the date_time in the report object

            // Add the report to the table
            reportsList.innerHTML += `
                <tr>
                    <td>${report.date_time}</td>,
                    <td>${report.crime_type}</td>
                    <td>${report.latitude}, ${report.longitude}</td>
                    <td>${report.incident_title}, ${report.description}</td>
                    <td>${report.injured}</td>
                    <td>${report.reported}</td>
                    <td>${safetyPrediction}</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error("❌ Error fetching reports:", error);
        alert('Failed to load reports. Please try again.');
    }
}
fetchUserReports();

// // Function to predict location safety (mock implementation)
// async function predictLocationSafety(latitude, longitude) {
//     console.log("🔍 Sending location to ML API for prediction...");

//     try {
//         const response = await fetch('http://127.0.0.1:5000/predict', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ latitude, longitude })
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const data = await response.json();
//         console.log("🔢 ML Prediction:", data);

//         // Return the safety prediction
//         return data.safety_score >= 50 ? 'Safe' : 'Unsafe'; // Adjust based on API response
//     } catch (error) {
//         console.error("❌ Error getting safety prediction:", error);
//         return 'Unknown';
//     }
// }




// Add loading indicator function
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}




// Add this CSS for the loading spinner
const style = document.createElement('style');
style.textContent = `
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
    }
    .hidden { display: none; }
    .safe { color: green; }
    .unsafe { color: red; }
    .unknown { color: orange; }
`;
document.head.appendChild(style);

// Add loading spinner div to your HTML (before </body>)
const spinner = document.createElement('div');
spinner.id = 'loading-spinner';
spinner.className = 'hidden';
spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading safety prediction...';
document.body.appendChild(spinner);





// Enhanced Safety Prediction Model
const safetyModel = {
    // Crime type weights (0-10 scale)
    crimeWeights: {
        "Eve-Teasing": 3, "Catcalling": 2, "Stalking": 4, "Threats & Intimidation": 5,
        "Unwanted Touching": 7, "Robbery & Theft": 8, "Snatching": 6,
        "Pickpocketing": 3, "Forced Robbery": 9, "Public Transport Harassment": 5,
        "Suspicious Taxi/Auto Behavior": 6, "Overcrowding & Unsafe Situations": 4,
        "Poor Street Lighting": 5, "Lack of CCTV Coverage": 6, "Isolated Areas": 7
    },

    // Time-based risk multipliers
    timeRiskFactors: {
        "Daytime": 1.0,
        "Night": 1.5,
        "Midnight": 1.8
    },

    // Location risk factors
    locationRiskFactors: {
        "Residential": 1.0,
        "Commercial": 1.3,
        "Public Transport": 1.7,
        "Park": 1.5,
        "Street": 1.4,
        "Alley": 2.0
    },

    // Additional risk factors
    additionalFactors: {
        "injured": 15,
        "reported": -5,
        "anonymous": 3,
        "weapons": 10,
        "alcohol": 5,
        "crowded": -3,
        "isolated": 8,
        "police_nearby": -7,
        "good_lighting": -4
    },

    categoryMapping: {
        0: "Eve-Teasing",
        1: "Catcalling",
        2: "Stalking",
        3: "Threats & Intimidation",
        4: "Unwanted Touching",
        5: "Robbery & Theft",
        6: "Snatching",
        7: "Pickpocketing",
        8: "Forced Robbery",
        9: "Public Transport Harassment",
        10: "Suspicious Taxi/Auto Behavior",
        11: "Overcrowding & Unsafe Situations",
        12: "Poor Street Lighting",
        13: "Lack of CCTV Coverage",
        14: "Isolated Areas"
    },

    // Calculate dynamic risk score considering all factors
    calculateRiskScore(params) {
        const crimeType = this.categoryMapping[params.incidentType] || "Unknown";
        const timeCategory = this.getTimeCategory(params.dateTime);
        
        // Base risk from crime type
        let riskScore = this.crimeWeights[crimeType] || 5;
        
        // Apply time factor
        riskScore *= this.timeRiskFactors[timeCategory] || 1.0;
        
        // Apply location factor
        riskScore *= this.locationRiskFactors[params.locationType] || 1.2;
        
        // Apply additional factors
        if (params.injured) riskScore += this.additionalFactors.injured;
        if (params.reported) riskScore += this.additionalFactors.reported;
        if (params.anonymous) riskScore += this.additionalFactors.anonymous;
        if (params.weapons) riskScore += this.additionalFactors.weapons;
        if (params.alcohol) riskScore += this.additionalFactors.alcohol;
        if (params.crowded) riskScore += this.additionalFactors.crowded;
        if (params.isolated) riskScore += this.additionalFactors.isolated;
        if (params.police_nearby) riskScore += this.additionalFactors.police_nearby;
        if (params.good_lighting) riskScore += this.additionalFactors.good_lighting;
        
        // Adjust for number of people involved
        if (params.people_involved > 1) {
            riskScore += (params.people_involved - 1) * 2;
        }
        
        return riskScore;
    },

    getTimeCategory(dateTime) {
        const hour = new Date(dateTime).getHours();
        if (6 <= hour && hour < 18) return "Daytime";
        if (18 <= hour && hour < 23) return "Night";
        return "Midnight";
    },

    // Predict safety considering all parameter combinations
    predictSafety(params) {
        const riskScore = this.calculateRiskScore(params);
        let safetyScore, prediction;
        
        if (riskScore < 4) {
            safetyScore = 85 + (Math.random() * 10); // 85-95%
            prediction = "Very Safe";
        } else if (riskScore < 7) {
            safetyScore = 70 + (Math.random() * 15); // 70-85%
            prediction = "Safe";
        } else if (riskScore < 10) {
            safetyScore = 50 + (Math.random() * 20); // 50-70%
            prediction = "Moderate";
        } else if (riskScore < 15) {
            safetyScore = 30 + (Math.random() * 20); // 30-50%
            prediction = "Unsafe";
        } else {
            safetyScore = 10 + (Math.random() * 20); // 10-30%
            prediction = "Dangerous";
        }
        
        // Ensure score is within bounds
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

// Format the safety result with all factors
function formatSafetyResult(data) {
    const safetyClass = data.prediction.toLowerCase().replace(' ', '-');
    const factors = Object.entries(data.factors)
        .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
        .join('');
    
    return `
        <div class="safety-prediction ${safetyClass}">
            <div class="prediction-header">
                <span class="safety-status">${data.prediction}</span>
                
            </div>
           <span class="safety-score">${data.safety_score}%</span>
        </div>
    `;
}

function formatErrorResult() {
    return `
        <div class="safety-prediction error">
            <div class="prediction-header">
                <span class="safety-status">Error</span>
            </div>
            <div class="error-message">Could not determine safety prediction</div>
        </div>
    `;
}

// Add enhanced styles
const enhancedStyles = document.createElement('style');
enhancedStyles.textContent = `
    .safety-prediction {
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .prediction-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
    }
    .safety-status {
        font-weight: bold;
        font-size: 1.2em;
    }
    .safety-score {
        font-weight: bold;
        font-size: 1.1em;
    }
    .risk-score {
        color: #666;
        margin-bottom: 10px;
    }
    .factors {
        margin-top: 10px;
    }
    .factors h4 {
        margin-bottom: 5px;
    }
    .factors ul {
        padding-left: 20px;
    }
    .factors li {
        margin-bottom: 3px;
    }
    
    /* Safety level colors */
    .very-safe {
        background-color: #e8f5e9;
        border-left: 5px solid #4caf50;
    }
    .safe {
        background-color: #e3f2fd;
        border-left: 5px solid #2196f3;
    }
    .moderate {
        background-color: #fff8e1;
        border-left: 5px solid #ffc107;
    }
    .unsafe {
        background-color: #ffebee;
        border-left: 5px solid #f44336;
    }
    .dangerous {
        background-color: #fce4ec;
        border-left: 5px solid #e91e63;
    }
    .error {
        background-color: #f5f5f5;
        border-left: 5px solid #9e9e9e;
    }
`;
document.head.appendChild(enhancedStyles);

// Example usage with all possible parameters
async function runExample() {
    const prediction = await predictLocationSafety({
        latitude: 40.7128,
        longitude: -74.0060,
        incidentType: 3, // Threats & Intimidation
        locationType: "Public Transport",
        dateTime: new Date().toISOString(),
        injured: true,
        reported: false,
        weapons: false,
        alcohol: true,
        crowded: false,
        isolated: true,
        police_nearby: false,
        good_lighting: false,
        people_involved: 2
    });
    
    document.getElementById('prediction-container').innerHTML = prediction;
}

// Initialize when ready
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('loading-spinner')) {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.innerHTML = 'Analyzing safety...';
        document.body.appendChild(spinner);
    }
});



