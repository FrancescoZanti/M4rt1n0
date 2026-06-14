from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 'openai', 'azure', o 'local'
    LLM_PROVIDER: str = "local" 
    
    # OpenAI Settings
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    
    # Azure OpenAI Settings
    AZURE_OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_ENDPOINT: str | None = None
    AZURE_OPENAI_DEPLOYMENT_NAME: str | None = None
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    
    # Local LLM Settings (Ollama / vLLM)
    # Default Ollama port is 11434. Per vLLM di solito è 8000.
    LOCAL_LLM_BASE_URL: str = "http://localhost:11434/v1" 
    LOCAL_LLM_MODEL: str = "llama3"

    class Config:
        env_file = ".env"

settings = Settings()
