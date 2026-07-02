import torch
import torch.nn as nn

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

with torch.no_grad():
    # Zero everything out
    for p in model.parameters():
        p.fill_(0.01) # small positive value to avoid dead relus
        
    # We want output to be positive when scaled flow rate > 1.0 (flow > 150)
    # Input: [hour, scaled_flow]
    
    # Layer 1 node 0 acts on scaled_flow
    model.layer1.weight[0, 0] = 0.0  # Ignore hour
    model.layer1.weight[0, 1] = 1.0  # Weight on scaled_flow
    model.layer1.bias[0] = -1.0      # Threshold: activates if scaled_flow > 1.0
    
    # Layer 2 node 0 acts on Layer 1 node 0
    model.layer2.weight[0, 0] = 1.0
    model.layer2.bias[0] = 0.0
    
    # Output layer node 0 acts on Layer 2 node 0
    model.output_layer.weight[0, 0] = 10.0 # steep sigmoid
    model.output_layer.bias[0] = -2.0      # baseline probability is small if no activation

torch.save(model.state_dict(), 'flowguard_model.pth')
