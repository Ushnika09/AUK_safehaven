from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import logging
import datetime

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Load model
try:
    logger.debug("Loading model...")
    model_data = joblib.load("model_package.pkl")
    model = model_data['model']
    logger.debug("Model loaded successfully")
except Exception as e:
    logger.error(f"Model loading failed: {str(e)}")
    raise

# Helper functions
def get_time_category(hour):
    return 0 if 6 <= hour < 18 else 1 if 18 <= hour < 23 else 2

# API Endpoints
@app.route('/')
def home():
    return "Safety Prediction API - Use /predict"

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        logger.debug(f"Received data: {data}")
        
        # Required fields check
        required = ['latitude', 'longitude', 'category', 'date_time']
        if not all(field in data for field in required):
            return jsonify({"error": "Missing required fields"}), 400

        # Process inputs
        date_time = pd.to_datetime(data['date_time'])
        time_cat = get_time_category(date_time.hour)
        
        input_data = [
            float(data['latitude']),
            float(data['longitude']),
            int(data['category']),
            time_cat
        ]
        
        # Make prediction
        prediction = model.predict([input_data])[0]
        proba = model.predict_proba([input_data])[0][1]
        
        return jsonify({
            "prediction": "Unsafe" if prediction == 1 else "Safe",
            "confidence": round(float(proba), 2),
            "timestamp": datetime.datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting server at http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)