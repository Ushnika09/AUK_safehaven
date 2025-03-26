import numpy as np
import pandas as pd
import warnings
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler
from geopy.distance import geodesic
import joblib
from datetime import datetime

warnings.simplefilter("ignore", UserWarning)

# Load dataset
file_path = "C:/Users/karus/OneDrive/Desktop/AUK SAFEHAVEN/project/AUKSafehaven model/AUKSafehaven/women_safety_dataset.csv"
df = pd.read_csv(file_path)

# Required columns
required_columns = [
    "Latitude", "Longitude", "Category of Incident", "Was anyone injured?",
    "Was it reported to authorities?", "Date & Time"
]

if "Number of People Involved" in df.columns:
    required_columns.append("Number of People Involved")

df = df[required_columns]

# Convert "Date & Time" to datetime format
df["Date & Time"] = pd.to_datetime(df["Date & Time"], errors="coerce")

# Extract hour from timestamp
df["Hour"] = df["Date & Time"].dt.hour

# Define time categories
def categorize_time(hour):
    if 6 <= hour < 12:
        return 0  # Morning
    elif 12 <= hour < 18:
        return 1  # Afternoon
    elif 18 <= hour < 23:
        return 2  # Evening
    else:
        return 3  # Midnight

df["Time of Incident"] = df["Hour"].apply(categorize_time)

# Drop unnecessary columns
df.drop(columns=["Hour", "Date & Time"], inplace=True)

# Encode categorical features
df["Category of Incident"] = df["Category of Incident"].astype("category")
category_mapping = dict(enumerate(df["Category of Incident"].cat.categories))
df["Category of Incident"] = df["Category of Incident"].cat.codes

df["Was anyone injured?"] = df["Was anyone injured?"].map({"Yes": 1, "No": 0})
df["Was it reported to authorities?"] = df["Was it reported to authorities?"].map({"Yes": 1, "No": 0})

# Feature Engineering: Location Clustering
def count_nearby_incidents(lat, lon, radius=250):
    count = 0
    for _, row in df.iterrows():
        if geodesic((lat, lon), (row["Latitude"], row["Longitude"])).meters <= radius:
            count += 1
    return count

df["Nearby Incidents"] = df.apply(lambda row: count_nearby_incidents(row["Latitude"], row["Longitude"]), axis=1)

# Target Variable: Safety Status
# Assume "Unsafe" if there are multiple incidents in the same location
df["Safety Status"] = np.where(df["Nearby Incidents"] > 1, "Unsafe", "Safe")

# Prepare features and target
X = df.drop(columns=["Safety Status"])
y = df["Safety Status"].map({"Safe": 0, "Unsafe": 1})

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Feature Scaling
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# Train Random Forest model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate model
y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Classification Report:\n", classification_report(y_test, y_pred))

# Save the model and scaler
joblib.dump(model, "model1.pkl")
joblib.dump(scaler, "scaler1.pkl")
print("✅ Model and scaler saved successfully.")

# Function to Predict Safety Status
def predict_safety():
    print("\n🔍 Enter details for prediction:")

    # Display incident categories for user reference
    print("\nIncident Categories:")
    for code, name in category_mapping.items():
        print(f"{code}: {name}")

    # Get user input
    latitude = float(input("Enter Latitude: ").strip())
    longitude = float(input("Enter Longitude: ").strip())
    category = int(input("Enter Category of Incident (0-N): ").strip())
    injured = int(input("Was anyone injured? (1: Yes, 0: No): ").strip())
    reported = int(input("Was it reported to authorities? (1: Yes, 0: No): ").strip())
    date_time_str = input("Enter Date & Time (YYYY-MM-DD HH:MM): ").strip()

    # Automatically determine time of day
    date_time = pd.to_datetime(date_time_str, errors="coerce")
    if pd.isna(date_time):
        print("Invalid date/time format. Please use YYYY-MM-DD HH:MM.")
        return

    time_incident = categorize_time(date_time.hour)

    # Feature Engineering: Count nearby incidents
    nearby_incidents = count_nearby_incidents(latitude, longitude)

    # Prepare input data
    input_data = {
        "Latitude": latitude,
        "Longitude": longitude,
        "Category of Incident": category,
        "Was anyone injured?": injured,
        "Was it reported to authorities?": reported,
        "Time of Incident": time_incident,
        "Nearby Incidents": nearby_incidents
    }

    # Add "Number of People Involved" if it exists in the dataset
    if "Number of People Involved" in df.columns:
        num_people = int(input("Enter Number of People Involved: ").strip())
        input_data["Number of People Involved"] = num_people

    # Convert input data to DataFrame
    input_df = pd.DataFrame([input_data])

    # Ensure all required features are present
    for feature in X.columns:
        if feature not in input_df.columns:
            input_df[feature] = 0  # Fill missing features with 0

    # Reorder columns to match training data
    input_df = input_df[X.columns]

    # Scale input data
    input_scaled = scaler.transform(input_df)

    # Make prediction
    prediction = model.predict(input_scaled)
    status = "Unsafe" if prediction[0] == 1 else "Safe"

    print(f"\nPrediction: The location is **{status}**.")

if __name__ == "__main__":
    predict_safety()