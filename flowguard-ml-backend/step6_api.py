import os
import io
import torch
import torch.nn as nn
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
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
    allow_origins=["https://flowguard-jet.vercel.app", "http://localhost:3000"],
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

class SensorData(BaseModel):
    hour: int
    flow_rate: float

@app.post("/predict")
def predict_leak(data: SensorData):
    scaled_flow = data.flow_rate / 150.0 
    input_tensor = torch.tensor([[float(data.hour), scaled_flow]], dtype=torch.float32)
    with torch.no_grad():
        probability = model(input_tensor).item()
    return {
        "leak_probability": round(probability, 4),
        "is_leak_detected": probability > 0.5,
        "safety_protocol": "Acknowledge & Dispatch required." if probability > 0.5 else "Normal."
    }

# 3. RAG Chatbot Infrastructure
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
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