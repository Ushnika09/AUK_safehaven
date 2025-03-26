import numpy as np
import pandas as pd
import warnings
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.model_selection import train_test_split

warnings.simplefilter("ignore", UserWarning)

# Incident Title,Date & Time,Latitude,Longitude,Category of Incident,Severity,Number of People Involved,Was anyone injured?,Was it reported to authorities?

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

# 🔹 Crime severity mapping (Fixing category names)
crime_weights = {
    "Eve-Teasing": 3, "Catcalling": 2, "Stalking": 4, "Threats & Intimidation": 5,
    "Unwanted Touching (Molestation)": 7, "Robbery & Theft": 8, "Snatching": 6,
    "Pickpocketing": 3, "Forced Robbery": 9, "Public Transport Harassment": 5,
    "Suspicious Taxi/Auto Behavior": 6, "Overcrowding & Unsafe Situations": 4,
    "Poor Street Lighting": 5, "Lack of CCTV Coverage": 6, "Isolated Areas": 7
}

# Convert "Date & Time" to datetime format
df["Date & Time"] = pd.to_datetime(df["Date & Time"], errors="coerce")

# Extract hour from timestamp
df["Hour"] = df["Date & Time"].dt.hour

# Define time categories
def categorize_time(hour):
    if 6 <= hour < 18:
        return 0  # Daytime
    elif 18 <= hour < 23:
        return 1  # Night
    else:
        return 2  # Midnight

df["Time of Incident"] = df["Hour"].apply(categorize_time)

# Drop unnecessary columns
df.drop(columns=["Hour", "Date & Time"], inplace=True)

# 🔹 Extract only the core incident type
df["Category of Incident"] = df["Category of Incident"].astype(str).apply(lambda x: x.split(" - ")[-1])

# Map categories to numeric values
df["Category of Incident"] = df["Category of Incident"].astype("category")
category_mapping = dict(enumerate(df["Category of Incident"].cat.categories))
reverse_mapping = {v: k for k, v in category_mapping.items()}
df["Category of Incident"] = df["Category of Incident"].cat.codes

df["Was anyone injured?"] = df["Was anyone injured?"].map({"Yes": 1, "No": 0})

# 🔹 Calculate severity score
df["Severity"] = (
    df["Category of Incident"].map(lambda x: crime_weights.get(category_mapping.get(x, ""), 0)) +
    df["Was anyone injured?"] * 2 +
    df["Time of Incident"]
)

# Assign Safety Status
df["Safety Status"] = np.where(df["Severity"] >= 6, "Unsafe", "Safe")

# 🔹 Drop non-numeric columns before training
X = df.drop(columns=["Safety Status"], errors="ignore")
y = df["Safety Status"].map({"Safe": 0, "Unsafe": 1})

# Convert X to numeric
X = X.apply(pd.to_numeric, errors="coerce")
X.fillna(0, inplace=True)  # Replace NaN values
X.replace([np.inf, -np.inf], 0, inplace=True)  # Replace Inf values

# Apply feature selection
if X.shape[1] >= 5:
    try:
        selector = SelectKBest(f_classif, k=5)
        X_selected = selector.fit_transform(X, y)
        selected_features = X.columns[selector.get_support(indices=True)]
    except Exception as e:
        print(f"\n Feature selection error: {e}. Using all features instead.")
        X_selected = X.values
        selected_features = X.columns
else:
    X_selected = X.values
    selected_features = X.columns

# Train model
X_train, X_test, y_train, y_test = train_test_split(X_selected, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Function to Predict Safety Status
def predict_safety():
    print("\n🔍 Enter details for prediction:")

    def get_valid_input(prompt, dtype=float, valid_values=None, display_options=None):
        while True:
            try:
                if display_options:
                    print("\nSelect an option:")
                    for key, value in display_options.items():
                        print(f"{key}: {value}")

                value = dtype(input(prompt).strip())

                if valid_values and value not in valid_values:
                    print(f"Invalid input! Choose from {valid_values}.")
                    continue

                return value
            except ValueError:
                print("Invalid input! Please enter a valid number.")

    latitude = get_valid_input("Enter Latitude: ")
    longitude = get_valid_input("Enter Longitude: ")

    category = get_valid_input(
        "Enter Category of Incident (Choose from options below): ",
        int,
        list(category_mapping.keys()),
        category_mapping  
    )

    injured = get_valid_input("Was anyone injured? (1: Yes, 0: No): ", int, [0, 1])
    reported = get_valid_input("Was it reported to authorities? (1: Yes, 0: No): ", int, [0, 1])

    # 🔹 Automatically detect time of incident from user input
    date_time_str = input("Enter Date & Time (YYYY-MM-DD HH:MM): ").strip()
    date_time = pd.to_datetime(date_time_str, errors="coerce")

    time_incident = categorize_time(date_time.hour)

    # 🔹 Calculate severity score for input
    incident_name = category_mapping.get(category, "")  # Get category name
    severity = (
        crime_weights.get(incident_name, 0) +
        (2 if injured == 1 else 0) +
        time_incident
    )

    print(f"\nCalculated Severity: {severity}")  # Debugging severity score

    # 🔹 Rule-Based Override if Severity ≥ 6
    if severity >= 5:
        print("\nPrediction: The location is **Unsafe** (based on severity).")
        return

    input_df = pd.DataFrame([[latitude, longitude, category, severity, injured, reported, time_incident]],
                            columns=["Latitude", "Longitude", "Category of Incident", "Severity",
                                     "Was anyone injured?", "Was it reported to authorities?", "Time of Incident"])

    for feature in selected_features:
        if feature not in input_df.columns:
            input_df[feature] = 0  

    input_df = input_df[selected_features]

    prediction = model.predict(input_df)
    status = "Unsafe" if prediction[0] == 1 else "Safe"

    print(f"\nPrediction: The location is **{status}**.")

if __name__ == "__main__":
    predict_safety()

import joblib

# Save the trained model
joblib.dump(model, "model.pkl")

print("✅ Model saved successfully as model.pkl")


import joblib

# Save the trained model and selected features
joblib.dump((model, selected_features), "model_and_features.pkl")
print("✅ Model and selected features saved successfully.")

