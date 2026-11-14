
from fastapi import FastAPI
from pydantic import BaseModel, Field
import joblib
import pandas as pd


# Create our FastAPI application
app = FastAPI(title="House Price ML Service")
# Load the trained model ONCE when the server starts
model = joblib.load("model.joblib")


# Describe the data we expect to receive
class HouseFeatures(BaseModel):
    size_sqm: float = Field(
        gt=0,
        description="Size in square meters"
    )

    bedrooms: int = Field(
        ge=1,
        description="Number of bedrooms"
    )

    age_years: float = Field(
        ge=0,
        description="Age of the house in years"
    )


# Route 1: Health check
@app.get("/health")
def health():
    return {"status": "ok"}


# Route 2: Make a prediction
@app.post("/predict")
def predict(house: HouseFeatures):

    # Build a one-row table with the features
    row = pd.DataFrame(
        [[house.size_sqm, house.bedrooms, house.age_years]],
        columns=["size_sqm", "bedrooms", "age_years"],
    )

    # Ask the trained model to predict the price
    price = model.predict(row)[0]

    # Return the result as JSON
    return {
        "predicted_price_k": round(float(price), 2)
    }
