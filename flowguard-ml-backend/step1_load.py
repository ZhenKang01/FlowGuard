import pandas as pd

# Load the synthetic data generated previously
df = pd.read_csv('flowguard_sensor_data.csv')

# Print the first 5 rows to verify successful ingestion
print(df.head())