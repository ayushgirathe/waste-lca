from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import engine, Base
from app.routes import auth, upload, recommend, agent
from app.routes import auth, upload, recommend, agent, market_prices
from app.routes import auth, upload, recommend, agent, market_prices, analytics
from app.routes import auth, upload, recommend, agent, market_prices, analytics, export, blockchain

# Add this line


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Waste LCA AI", description="AI-powered waste recycling optimization")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(recommend.router)
app.include_router(agent.router)
app.include_router(market_prices.router)
app.include_router(analytics.router)
app.include_router(blockchain.router)
app.include_router(export.router)


@app.get("/")
def root():
    return {"message": "Waste LCA AI Backend is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(market_prices.router)

# Add this line
app.include_router(analytics.router)