import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# 1. Data Ingestion & Preprocessing (from previous steps)
df = pd.read_csv('flowguard_sensor_data.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour

scaler = MinMaxScaler()
df['scaled_flow_rate'] = scaler.fit_transform(df[['flow_rate_gallons_per_hour']])

X = df[['hour', 'scaled_flow_rate']].values
y = df['is_leak'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Convert to Tensors
X_train_tensor = torch.tensor(X_train, dtype=torch.float32)
y_train_tensor = torch.tensor(y_train, dtype=torch.float32).unsqueeze(1)
X_test_tensor = torch.tensor(X_test, dtype=torch.float32)
y_test_tensor = torch.tensor(y_test, dtype=torch.float32).unsqueeze(1)

# Create DataLoaders
train_loader = DataLoader(TensorDataset(X_train_tensor, y_train_tensor), batch_size=32, shuffle=True)
test_loader = DataLoader(TensorDataset(X_test_tensor, y_test_tensor), batch_size=32, shuffle=False)

# 2. Model Architecture
class FlowGuardAnomalyDetector(nn.Module):
    def __init__(self):
        super(FlowGuardAnomalyDetector, self).__init__()
        self.layer1 = nn.Linear(2, 16)
        self.relu = nn.ReLU()
        self.layer2 = nn.Linear(16, 8)
        self.output_layer = nn.Linear(8, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu(self.layer1(x))
        x = self.relu(self.layer2(x))
        x = self.sigmoid(self.output_layer(x))
        return x

model = FlowGuardAnomalyDetector()
criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)

# 3. The Training Loop
epochs = 50
print("Starting training...")

for epoch in range(epochs):
    model.train() # Set model to training mode
    epoch_loss = 0
    
    for batch_X, batch_y in train_loader:
        # Zero the gradients
        optimizer.zero_grad()
        
        # Forward pass
        predictions = model(batch_X)
        
        # Calculate loss
        loss = criterion(predictions, batch_y)
        
        # Backward pass (Backpropagation)
        loss.backward()
        
        # Update weights
        optimizer.step()
        
        epoch_loss += loss.item()
        
    if (epoch + 1) % 10 == 0:
        print(f"Epoch {epoch+1}/{epochs} | Loss: {epoch_loss/len(train_loader):.4f}")

# 4. Evaluation and Export
model.eval() # Set model to evaluation mode
with torch.no_grad():
    test_predictions = model(X_test_tensor)
    # Convert probabilities to binary classes (0 or 1) using 0.5 threshold
    test_predictions_class = (test_predictions >= 0.5).float()
    accuracy = (test_predictions_class == y_test_tensor).sum().item() / len(y_test_tensor)
    print(f"\nFinal Test Accuracy: {accuracy * 100:.2f}%")

# [Certain] Save ONLY the state_dict (weights), not the entire model class, to ensure API compatibility.
torch.save(model.state_dict(), 'flowguard_model.pth')
print("Model weights successfully saved to 'flowguard_model.pth'")