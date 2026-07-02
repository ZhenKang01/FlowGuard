import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# 1. Load the dataset
df = pd.read_csv('flowguard_sensor_data.csv')

# 2. Feature Engineering: Extract hour of day from text string
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour

# 3. Feature Scaling: Normalize flow rate between 0 and 1
scaler = MinMaxScaler()
df['scaled_flow_rate'] = scaler.fit_transform(df[['flow_rate_gallons_per_hour']])

# 4. Isolate features (X) and ground-truth labels (y)
X = df[['hour', 'scaled_flow_rate']].values
y = df['is_leak'].values

print("Preprocessing Complete.")
print("Features matrix shape (X):", X.shape)
print("Labels vector shape (y):", y.shape)
print("Sample row 0 features [Hour, Scaled Flow]:", X[0])