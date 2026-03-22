from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel

try:
    from .RAG_tool import TaxLawBot
except ImportError:
    from RAG_tool import TaxLawBot

app = FastAPI()

# Cho phép React gọi sang backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # sau này nên đổi thành domain React cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo 1 lần khi server start
bot = TaxLawBot()

class AskRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {
        "message": "RAG backend is running",
        "documents": bot.document_count(),
    }

@app.post("/ask")
def ask(req: AskRequest):
    answer = bot.ask(req.question)
    return {
        "question": req.question,
        "answer": answer
    }

@app.post("/ask-detail")
def ask_detail(req: AskRequest):
    payload = bot.ask_detail(req.question)
    return payload
