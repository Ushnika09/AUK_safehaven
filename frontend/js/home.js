


// <!-- JavaScript for Statistics Chart -->

    const ctx = document.getElementById('comparison-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'],
            datasets: [
                {
                    label: 'Reported Crimes Against Women',
                    data: [378277, 405861, 371503, 428278, 445256, 450000, 460000],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Estimated Total Crimes Against Women',
                    data: [500000, 530000, 490000, 550000, 570000, 580000, 590000],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });



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


    //for map
        var map = L.map('map').setView([28.6139, 77.2090], 10); // Default location: New Delhi
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        function markLocationOnMap(latitude, longitude, safetyPrediction) {
            const markerColor = safetyPrediction === 'Safe' ? 'green' : 'red';
            const marker = L.marker([latitude, longitude], {
                icon: L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);

            marker.bindPopup(`<b>${safetyPrediction}</b><br>Lat: ${latitude}, Lon: ${longitude}`).openPopup();
        }

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

                    // Mark the location on the map
                    markLocationOnMap(report.latitude, report.longitude, safetyPrediction);
                }
            } catch (error) {
                console.error("❌ Error fetching reports:", error);
                alert('Failed to load reports. Please try again.');
            }
        }

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

        document.addEventListener('DOMContentLoaded', () => {
            console.log("DOM fully loaded and parsed");
            fetchUserProfile();
            fetchUserReports(); // Fetch and display reports on page load
        });
