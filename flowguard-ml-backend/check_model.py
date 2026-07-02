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
model.load_state_dict(torch.load('flowguard_model.pth'))
model.eval()
with torch.no_grad():
    for h in range(24):
        for f in [0, 20, 50, 100, 150, 200, 300, 500]:
            scaled = f / 150.0
            t = torch.tensor([[float(h), scaled]], dtype=torch.float32)
            prob = model(t).item()
            if prob < 0.5:
                print(f"Normal: Hour={h}, Flow={f}, Prob={prob:.4f}")
