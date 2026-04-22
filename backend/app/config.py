from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str
    redis_url: str
    ollama_base_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    class Config:
        env_file = ".env"

settings = Settings()
