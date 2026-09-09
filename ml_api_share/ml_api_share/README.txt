SCST ML Prediction API
======================

This folder contains the ML prediction API for the SCST project.

FILES
-----
app.py
distress_score_model.joblib
risk_level_model.joblib
requirements.txt


SETUP
-----
1. Create a virtual environment:

python3 -m venv venv

2. Activate it:

source venv/bin/activate

3. Install dependencies:

pip install -r requirements.txt


API KEY
-------
The API requires the ML_API_KEY environment variable.

Set it using:

export ML_API_KEY="THE_API_KEY_PROVIDED_SEPARATELY"

Do NOT put the API key directly inside app.py.


RUN THE API
-----------
Run:

python -m uvicorn app:app --host 0.0.0.0 --port 8000


API DOCUMENTATION
-----------------
After starting the server, open:

http://127.0.0.1:8000/docs


PREDICTION ENDPOINT
-------------------
POST /predict

Required header:

x-api-key: YOUR_API_KEY

The endpoint accepts the PredictionRequest JSON defined in app.py.


IMPORTANT
---------
The API has been tested successfully with the included models.

The models were created using scikit-learn 1.8.0, so the requirements.txt
pins scikit-learn==1.8.0.

For production use, the API must be deployed to a server or integrated
into the project's backend. The localhost URL only works on the machine
where the API is running.
