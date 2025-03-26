document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("reportForm");
    const getLocationBtn = document.getElementById("getLocationBtn");
    const setManualLocationBtn = document.getElementById("setManualLocationBtn");
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const dateTimeInput = document.getElementById("date_time");

    // Initialize Leaflet Map
    const map = L.map('map').setView([20.5937, 78.9629], 5); // Default to India
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let marker;

    // Add click event to map to set latitude and longitude
    map.on('click', function (e) {
        const { lat, lng } = e.latlng;
        latitudeInput.value = lat.toFixed(6);
        longitudeInput.value = lng.toFixed(6);

        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker([lat, lng]).addTo(map);
        console.log("📍 Map clicked. Latitude:", lat, "Longitude:", lng); // Debugging log
    });

    

    // 🗺️ Get User's Location
    getLocationBtn.addEventListener("click", function () {
        if (!navigator.geolocation) {
            alert("❌ Geolocation is not supported by your browser.");
            return;
        }

        getLocationBtn.textContent = "Fetching...";
        getLocationBtn.disabled = true;

        console.log("🌍 Fetching live location..."); // Debugging log

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                latitudeInput.value = latitude.toFixed(6);
                longitudeInput.value = longitude.toFixed(6);

                // Update map view
                map.setView([latitude, longitude], 15);
                if (marker) {
                    map.removeLayer(marker);
                }
                marker = L.marker([latitude, longitude]).addTo(map);

                console.log("✅ Live location fetched. Latitude:", latitude, "Longitude:", longitude); // Debugging log

                getLocationBtn.textContent = "Location Fetched ✅";
                getLocationBtn.style.backgroundColor = "#4CAF50"; // Green for success
            },
            (error) => {
                console.error("❌ Geolocation error:", error); // Debugging log

                let errorMessage = "❌ Error fetching location. ";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += "Please enable location access.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage += "Request timed out. Try again.";
                        break;
                    default:
                        errorMessage += "An unknown error occurred.";
                }

                alert(errorMessage);
                getLocationBtn.textContent = "Get Live Location";
                getLocationBtn.disabled = false;
            }
        );
    });

    // 📍 Set Location Manually
    setManualLocationBtn.addEventListener("click", function () {
        const lat = parseFloat(latitudeInput.value);
        const lng = parseFloat(longitudeInput.value);

        if (isNaN(lat) || isNaN(lng)) {
            alert("❌ Please enter valid latitude and longitude.");
            return;
        }

        // Update map view
        map.setView([lat, lng], 15);
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker([lat, lng]).addTo(map);

        console.log("📍 Manual location set. Latitude:", lat, "Longitude:", lng); // Debugging log
    });


    // 📅 Prevent Future Dates and Set Dynamic Current Time
    function updateDateTime() {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        dateTimeInput.max = localDateTime;
    }

    // Update the date-time input every second
    setInterval(updateDateTime, 1000);
    updateDateTime(); // Initial call

    // 📝 Form Submission
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
    
        console.log("🚀 Form submitted! Fetch request is about to start...");
    
        // Update the date-time input with the current time before submission
        updateDateTime();
        console.log("📅 Updated date-time input with current time.");
    
        // Additional validation to ensure date is not in the future
        const selectedDateTime = new Date(dateTimeInput.value);
        const currentDateTime = new Date();
        console.log("📅 Selected Date Time:", selectedDateTime);
        console.log("📅 Current Date Time:", currentDateTime);
    
        if (selectedDateTime > currentDateTime) {
            console.error("❌ Date and time cannot be in the future.");
            alert("❌ Please select a date and time that is not in the future.");
            return;
        }
    
        // Get form data
        const formData = new FormData(form);
        console.log("📄 FormData created from form.");
    
        // Parse people_involved as an integer
        const people_involved = parseInt(formData.get("people_involved"), 10);
        console.log("👥 Parsed people_involved:", people_involved);
        formData.set("people_involved", people_involved);
    
        // Parse injured as 'yes' or 'no'
        const injured = formData.get("injured") === "yes" ? "yes" : "no";
        console.log("🤕 Parsed injured:", injured);
        formData.set("injured", injured);
    
        // Retrieve user_id from localStorage or sessionStorage
        const user_id = localStorage.getItem("user_id") || sessionStorage.getItem("user_id");
        console.log("🆔 Retrieved user_id:", user_id);
        if (!user_id) {
            console.error("❌ User not authenticated. Please log in.");
            alert("❌ User not authenticated. Please log in.");
            return;
        }
        formData.set("user_id", user_id);
    
        // Debugging: Log all form data
        console.log("📄 Form Data Entries:");
        for (const [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }
    
        try {
            console.log("📡 Sending fetch request to backend...");
    
            const response = await fetch("http://localhost:3000/submit-report", {
                method: "POST",
                body: formData,
            });
    
            console.log("📡 Fetch request sent. Awaiting response...");
    
            // Log response status and headers
            console.log("📡 Response Status:", response.status);
            console.log("📡 Response Headers:", JSON.stringify([...response.headers]));
    
            if (!response.ok) {
                const errorData = await response.json(); // Parse error response
                console.error("❌ Server Error Response:", errorData);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("📡 Server Response:", data);
    
            if (data.success) {
                console.log("✅ Report submitted successfully!");
                alert("✅ Report submitted successfully!");
                form.reset();
            } else {
                console.error("❌ Error submitting report:", data.error || "Unknown error");
                alert("❌ Error submitting report: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("❌ Fetch Error:", error);
            alert("❌ An error occurred. Please try again.");
        }
    });
});
