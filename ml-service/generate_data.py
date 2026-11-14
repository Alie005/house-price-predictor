
import numpy as np # import python library for numerical calculations.
import pandas as pd # import python library for working with tabular data.

rng = np.random.default_rng(42) # seed the reandom generation to make it repeat the same numbers in the future.

n = 1000 # we will have 1000 house records in our synthetic dataset.


# Generate random house features
size_sqm = rng.integers(30, 300, n) # feature 1 - house area in square meters.
bedrooms = rng.integers(1, 6, n) # feature 2 - number of bedrooms.
age_years = rng.integers(0, 50, n) # feature 3 - age of the house.

noise = rng.normal(0, 15, n) # noise for generating radomness.
price_k = (
    20
    + size_sqm * 1.5
    + bedrooms * 10
    - age_years * 0.8
    + noise
) # using the noise generated earlier we randomize the house prices.


df = pd.DataFrame({
    "size_sqm": size_sqm,
    "bedrooms": bedrooms,
    "age_years": age_years,
    "price_k": price_k.round(2),
}) # using a function from pandas library, we organise the individual dictionaries into one table.


df.to_csv("houses.csv", index=False) # save the dataset without indexing the rows.


print(df.head())

print(f"\nSaved {len(df)} houses to houses.csv")
