from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.routes.auth import get_current_user
from app.models.user import User
from app.services.ai_service import rag_agent

router = APIRouter(prefix="/agent", tags=["agent"])

class QueryRequest(BaseModel):
    question: str

@router.post("/query")
def agent_query(query: QueryRequest, current_user: User = Depends(get_current_user)):
    """
    RAG-powered agent to answer questions about recycling incentives and regulations
    """
    response = rag_agent.query(query.question)
    return {"question": query.question, "answer": response}