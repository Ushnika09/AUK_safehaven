import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Load the trained model, selected features, and category mapping
MODEL_PATH = os.getenv("MODEL_PATH", "model_and_features.pkl")
logger.debug(f"Loading model and features from: {MODEL_PATH}")
try:
    model_data = joblib.load(MODEL_PATH)
    if len(model_data) == 3:
        model, selected_features, category_mapping = model_data
    else:
        # Backward compatibility
        model, selected_features = model_data
        category_mapping = {}
    logger.debug(f"Model loaded successfully. Selected features: {selected_features}")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise

# Crime severity weights (should match training)
crime_weights = {
    "Eve-Teasing": 3, "Catcalling": 2, "Stalking": 4, "Threats & Intimidation": 5,
    "Unwanted Touching (Molestation)": 7, "Robbery & Theft": 8, "Snatching": 6,
    "Pickpocketing": 3, "Forced Robbery": 9, "Public Transport Harassment": 5,
    "Suspicious Taxi/Auto Behavior": 6, "Overcrowding & Unsafe Situations": 4,
    "Poor Street Lighting": 5, "Lack of CCTV Coverage": 6, "Isolated Areas": 7
}

def categorize_time(hour):
    logger.debug(f"Categorizing hour: {hour}")
    if 6 <= hour < 18:
        return 0  # Daytime
    elif 18 <= hour < 23:
        return 1  # Night
    else:
        return 2  # Midnight

def calculate_severity(category_code, injured, time_incident):
    """Calculate severity score based on category, injury, and time"""
    try:
        category_name = category_mapping.get(category_code, "")
        base_severity = crime_weights.get(category_name, 0)
        severity = base_severity + (2 if injured else 0) + time_incident
        logger.debug(f"Calculated severity: {severity} (category: {category_name}, code: {category_code})")
        return severity
    except Exception as e:
        logger.error(f"Error calculating severity: {str(e)}")
        return 0

@app.route('/predict', methods=['POST'])
def predict():
    try:
        logger.debug("Received prediction request")
        
        # Validate input
        data = request.json
        if not data:
            logger.error("No input data provided")
            return jsonify({"error": "No input data provided"}), 400

        required_fields = ["latitude", "longitude", "category", "injured", "reported", "date_time"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}")
            return jsonify({"error": f"Missing required fields: {missing_fields}"}), 400

        # Parse and validate inputs
        try:
            latitude = float(data["latitude"])
            longitude = float(data["longitude"])
            category = int(data["category"])
            injured = int(data["injured"])
            reported = int(data["reported"])
            date_time = pd.to_datetime(data["date_time"], errors="coerce")
            
            if pd.isna(date_time):
                raise ValueError("Invalid date/time format")
                
            if injured not in (0, 1) or reported not in (0, 1):
                raise ValueError("Injured and reported must be 0 or 1")
                
        except ValueError as e:
            logger.error(f"Invalid input: {str(e)}")
            return jsonify({"error": f"Invalid input: {str(e)}"}), 400

        # Calculate time category and severity
        time_incident = categorize_time(date_time.hour)
        severity = calculate_severity(category, injured, time_incident)
        
        # Rule-based override for high severity
        if severity >= 6:
            logger.debug("Rule-based override: Unsafe due to high severity")
            return jsonify({"prediction": "Unsafe", "reason": "high_severity"})

        # Prepare input features
        input_data = {
            "Latitude": [latitude],
            "Longitude": [longitude],
            "Category of Incident": [category],
            "Was anyone injured?": [injured],
            "Was it reported to authorities?": [reported],
            "Time of Incident": [time_incident],
            "Severity": [severity]
        }
        
        # Create DataFrame and ensure correct feature order
        input_df = pd.DataFrame(input_data)
        
        # Ensure we only use the features the model was trained with
        missing_features = set(selected_features) - set(input_df.columns)
        for feature in missing_features:
            input_df[feature] = 0  # Add missing features with default value
            
        input_df = input_df[selected_features]
        logger.debug(f"Final input features: {input_df.to_dict()}")

        # Make prediction
        prediction = model.predict(input_df)
        status = "Unsafe" if prediction[0] == 1 else "Safe"
        logger.debug(f"Model prediction: {status}")

        return jsonify({
            "prediction": status,
            "severity": severity,
            "features": input_df.iloc[0].to_dict()
        })

    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        return jsonify({"error": "An internal error occurred during prediction"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint to check if the API is working"""
    logger.debug("I'm working! API is healthy")
    return jsonify({
        "status": "healthy",
        "message": "API is working",
        "model_features": list(selected_features),
        "category_mapping": category_mapping
    })

if __name__ == '__main__':
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting server on {host}:{port}")
    app.run(host=host, port=port, debug=os.getenv("FLASK_DEBUG", "False").lower() == "true")