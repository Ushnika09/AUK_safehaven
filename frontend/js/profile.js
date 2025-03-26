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

// async function fetchUserReports() {
//     console.log("🔍 Fetching user reports..."); // Debug log

//     // Retrieve the token from localStorage
//     const token = localStorage.getItem('token');
//     console.log("🔑 Token from localStorage:", token); // Debug log

//     if (!token) {
//         console.error("❌ No token found. Redirecting to login page."); // Debug log
//         alert('Please log in to view your reports.');
//         window.location.href = 'login.html';
//         return;
//     }

//     try {
//         console.log("📡 Making API request to fetch reports..."); // Debug log

//         // Add the Authorization header with the token
//         const response = await fetch('http://localhost:3000/api/auth/user-reports', {
//             headers: {
//                 'Authorization': `Bearer ${token}` // Include the token here
//             }
//         });

//         console.log("📄 API response received:", response); // Debug log

//         if (!response.ok) {
//             console.error("❌ API request failed. Status:", response.status); // Debug log
//             throw new Error('Failed to fetch reports');
//         }

//         const data = await response.json();
//         console.log("📊 API data:", data); // Debug log
        

//         // Check if reports exist
//         if (!data.reports || data.reports.length === 0) {
//             console.log("📭 No reports found."); // Debug log
//             document.getElementById('reports-list').innerHTML = `
//                 <tr>
//                     <td colspan="5">No reports submitted yet.</td>
//                 </tr>
//             `;
//             return;
//         }

//         // Display reports
//         console.log("🖥️ Displaying reports..."); // Debug log
//         const reportsList = document.getElementById('reports-list');
//         reportsList.innerHTML = data.reports.map(report => `
//             <tr>
//                 <td>${report.date_time}</td>
//                 <td>${report.latitude}, ${report.longitude}</td>
//                 <td>${report.incident_title}, ${report.description}</td>
//                 <td>${report.severity}</td>
//                 <td>${report.injured}</td>
//                 <td>${report.reported}</td>
//                 <td>${report.anonymous}</td>
//                 <td>${predictLocationSafety(report.latitude, report.longitude)}</td>
//             </tr>
//         `).join('');
//     } catch (error) {
//         console.error("❌ Error fetching reports:", error); // Debug log
//         alert('Failed to load reports. Please try again.');
//     }
// }








// Load reports when the profile page loads


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

            // Add the report to the table
            reportsList.innerHTML += `
                <tr>
                    <td>${report.date_time}</td>
                    <td>${report.latitude}, ${report.longitude}</td>
                    <td>${report.incident_title}, ${report.description}</td>
                    <td>${report.severity}</td>
                    <td>${report.injured}</td>
                    <td>${report.reported}</td>
                    <td>${report.anonymous}</td>
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

// Function to predict location safety (mock implementation)
async function predictLocationSafety(latitude, longitude) {
    console.log("🔍 Sending location to ML API for prediction...");

    try {
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ latitude, longitude })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("🔢 ML Prediction:", data);

        // Return the safety prediction
        return data.safety_score >= 50 ? 'Safe' : 'Unsafe'; // Adjust based on API response
    } catch (error) {
        console.error("❌ Error getting safety prediction:", error);
        return 'Unknown';
    }
}
