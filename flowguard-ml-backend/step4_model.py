import torch
import torch.nn as nn
import torch.optim as optim

# 1. Define the Neural Network Class
class FlowGuardAnomalyDetector(nn.Module):
    def __init__(self):
        super(FlowGuardAnomalyDetector, self).__init__()
        # Input layer: 2 features (hour, scaled_flow_rate) -> 16 hidden nodes
        self.layer1 = nn.Linear(2, 16)
        self.relu = nn.ReLU()
        # Hidden layer: 16 nodes -> 8 hidden nodes
        self.layer2 = nn.Linear(16, 8)
        # Output layer: 8 nodes -> 1 output node (probability of leak)
        self.output_layer = nn.Linear(8, 1)
        # Sigmoid compresses the final output to a probability between 0 and 1
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        x = self.relu(x)
        x = self.output_layer(x)
        x = self.sigmoid(x)
        return x

# 2. Instantiate the model
model = FlowGuardAnomalyDetector()

# 3. Define the Loss Function and Optimizer
# Binary Cross Entropy is mathematically required for 0/1 classification
criterion = nn.BCELoss()
# Adam optimizer is highly efficient for adjusting weights during training
optimizer = optim.Adam(model.parameters(), lr=0.001)

print("Model Architecture Defined Successfully.")
print(model)