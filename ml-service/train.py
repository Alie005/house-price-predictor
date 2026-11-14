
import pandas as pd #import pandas (a python library for working with tabular data) and give it a nickname - pd.
import joblib # import joblib (a python library for managing trained machine learning models)

from sklearn.model_selection import train_test_split # spliting the dataset for training and for testing.
from sklearn.linear_model import LinearRegression # the algorithm the model uses.
from sklearn.metrics import mean_absolute_error, r2_score # for testing if the model got the coefficients and constants right.


df = pd.read_csv("houses.csv") # the tabular dataset in CSV format.


feature_names = ["size_sqm", "bedrooms", "age_years"] # creating dictionaries of important information from the tabular dataset. This part defines the features (X).

X = df[feature_names]#feature (X)
y = df["price_k"] # target (Y)


X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
) # Split the data into training and testing sets


model = LinearRegression() # create a linear regression algorithm model 
model.fit(X_train, y_train) #train the model - here we hope it gets the relationship between the features and target.

predictions = model.predict(X_test) # making the model predict the test features we already know the targets to see if the model is accurate.

mae = mean_absolute_error(y_test, predictions) # test the models predictions using Mean Absolute Error.
r2 = r2_score(y_test, predictions) # test the models predictions using R -squared score. 

print(f"Average error (MAE): {mae:.2f} (in thousands)")
print(f"R2 score: {r2:.3f}")


# Display what the model learned
print("\nWhat the model learned:") 
for name, weight in zip(feature_names, model.coef_):
    print(f"{name}: {weight:.2f}")

print(f"Base price (intercept): {model.intercept_:.2f}")


joblib.dump(model, "model.joblib") # Save the trained model

print("\nSaved model.joblib")
