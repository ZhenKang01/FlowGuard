import torch
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# --- Step 2 Code (Preserved for continuity) ---
df = pd.read_csv('flowguard_sensor_data.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour
scaler = MinMaxScaler()
df['scaled_flow_rate'] = scaler.fit_transform(df[['flow_rate_gallons_per_hour']])
X = df[['hour', 'scaled_flow_rate']].values
y = df['is_leak'].values

# --- Step 3: Split and Convert to Tensors ---
# 1. Split the data (80% training, 20% testing)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 2. Convert NumPy arrays to PyTorch Tensors
X_train_tensor = torch.tensor(X_train, dtype=torch.float32)
# unsqueeze(1) converts shape from (576,) to (576, 1) to match output neuron
y_train_tensor = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1) 
X_test_tensor = torch.tensor(X_test, dtype=torch.float32)
y_test_tensor = torch.tensor(y_test, dtype=torch.float32).unsqueeze(1)

# 3. Create DataLoaders (Batching size of 32)
train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
test_dataset = TensorDataset(X_test_tensor, y_test_tensor)

train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)

print("PyTorch DataLoaders Ready.")
print("X_train shape:", X_train_tensor.shape)
print("X_test shape:", X_test_tensor.shape)