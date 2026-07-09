import os
import io
import torch
import torch.nn as nn
import uvicorn
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
import requests
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables (.env)
load_dotenv()

# 1. Initialize the API (ONLY ONCE)
app = FastAPI(title="FlowGuard AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://flowguard-jet.vercel.app", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. PyTorch Model Architecture & Loading
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
try:
    model.load_state_dict(torch.load('flowguard_model.pth'))
    model.eval() 
except Exception as e:
    print(f"Warning: Model weights not found. {e}")

@app.post("/predict")
async def predict_leak(request: Request):
    form = await request.form()
    hour = int(form.get("hour"))
    flow_rate = float(form.get("flow_rate"))
    image = form.get("image") # UploadFile or None

    # 1. PyTorch Tabular Model Inference
    scaled_flow = flow_rate / 150.0 
    input_tensor = torch.tensor([[float(hour), scaled_flow]], dtype=torch.float32)
    with torch.no_grad():
        pytorch_probability = model(input_tensor).item()
    
    pytorch_leak = pytorch_probability > 0.5

    # 2. Roboflow Image Inference (Optional)
    roboflow_leak = False
    roboflow_confidence = None
    roboflow_message = "No image provided."

    if image and image.filename:
        rf_api_key = os.getenv("ROBOFLOW_API_KEY")
        rf_endpoint = os.getenv("ROBOFLOW_MODEL_ENDPOINT") # e.g. "my-project/1"

        if not rf_api_key or not rf_endpoint:
            roboflow_message = "Roboflow API Key or Endpoint not configured in backend."
        else:
            try:
                image_bytes = await image.read()
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                url = f"https://detect.roboflow.com/{rf_endpoint}?api_key={rf_api_key}"
                resp = requests.post(url, data=image_base64, headers={"Content-Type": "application/x-www-form-urlencoded"}, verify=False)
                
                if resp.status_code == 200:
                    rf_data = resp.json()
                    predictions = rf_data.get("predictions", [])
                    # Look for "leak" class (Option B: Either model)
                    leak_preds = [p for p in predictions if p.get("class", "").lower() == "leak"]
                    if leak_preds:
                        roboflow_leak = True
                        roboflow_confidence = max(p.get("confidence", 0) for p in leak_preds)
                        roboflow_message = f"Leak detected in image (Confidence: {roboflow_confidence:.2f})"
                    else:
                        roboflow_message = "No leak detected in image."
                else:
                    roboflow_message = f"Roboflow API error: {resp.status_code} - {resp.text}"
            except Exception as e:
                roboflow_message = f"Failed to call Roboflow: {str(e)}"

    # 3. Combine Results
    is_leak_detected = pytorch_leak or roboflow_leak

    return {
        "leak_probability": round(pytorch_probability, 4),
        "is_leak_detected": is_leak_detected,
        "pytorch_detected": pytorch_leak,
        "roboflow_detected": roboflow_leak,
        "roboflow_message": roboflow_message,
        "safety_protocol": "Acknowledge & Dispatch required." if is_leak_detected else "Normal."
    }

openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)
else:
    openai_client = None

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None

@app.post("/upload-document")
async def upload_document(file: UploadFile = File(...)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection missing.")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Must be a PDF.")
    
    try:
        file_bytes = await file.read()
        pdf_reader = PdfReader(io.BytesIO(file_bytes))
        
        raw_text = ""
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                raw_text += page_text + "\n"
                
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = text_splitter.split_text(raw_text)
        
        records = []
        for index, chunk in enumerate(chunks):
            response = openai_client.embeddings.create(input=chunk, model="text-embedding-3-small")
            records.append({
                "content": chunk,
                "metadata": {"source": file.filename, "id": index},
                "embedding": response.data[0].embedding
            })
            
        supabase.table("documents").insert(records).execute()
        return {"status": "success", "chunks_processed": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatQuery(BaseModel):
    message: str

@app.post("/chat")
async def chat_bot(query: ChatQuery):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection missing.")
    try:
        emb_res = openai_client.embeddings.create(input=query.message, model="text-embedding-3-small")
        db_res = supabase.rpc("match_documents", {"query_embedding": emb_res.data[0].embedding, "match_count": 3}).execute()
        
        context_text = "\n---\n".join([r["content"] for r in db_res.data]) if db_res.data else "No relevant info."

        prompt = f"Context:\n{context_text}\n\nAnswer the user based ONLY on the context above."
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": query.message}
            ],
            temperature=0.2
        )
        return {"reply": completion.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))