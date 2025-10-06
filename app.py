from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import traceback

# -----------------------------
# Initialize Flask app
# -----------------------------
app = Flask(__name__)
CORS(app)

# -----------------------------
# Load trained model + scaler
# -----------------------------
try:
    model = joblib.load("artifacts/xgb.pkl")
    scaler = joblib.load("artifacts/tabular_scaler.pkl")
    print("✅ Model and scaler loaded successfully.")
except Exception as e:
    print("⚠️ Error loading model:", e)


# -----------------------------
# Health check endpoint
# -----------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "OK", "message": "Smart LMS Prediction API is running."})


# -----------------------------
# Predict from JSON (single student)
# -----------------------------
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        # Example expected JSON:
        # { "features": [1, 3, 0, 12, 8, 0, 5, 0, 1, 0] }
        X = np.array(data["features"]).reshape(1, -1)

        # Scale features
        X_scaled = scaler.transform(X)

        # Predict probability
        prob = float(model.predict_proba(X_scaled)[0][1])
        label = "High Risk" if prob >= 0.7 else "Low/Moderate Risk"

        return jsonify({"risk_score": round(prob, 4), "risk_label": label})

    except Exception as e:
        return jsonify({
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500


# -----------------------------
# Predict from CSV file (bulk)
# -----------------------------
@app.route("/predict_csv", methods=["POST"])
def predict_csv():
    try:
        # CSV file sent as multipart/form-data
        file = request.files["file"]
        df = pd.read_csv(file)

        # Scale numeric data
        X_scaled = scaler.transform(df.values)

        # Predict probabilities
        probs = model.predict_proba(X_scaled)[:, 1]
        labels = ["High Risk" if p >= 0.7 else "Low/Moderate Risk" for p in probs]

        # Append predictions
        df["risk_score"] = probs
        df["risk_label"] = labels

        # Convert back to JSON for response
        return df.to_json(orient="records")

    except Exception as e:
        return jsonify({
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500


# -----------------------------
# Run the app
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)