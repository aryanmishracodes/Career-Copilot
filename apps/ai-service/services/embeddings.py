import asyncio

async def embed_text(text: str) -> list[float]:
    # In production, use OpenAIEmbeddings or Pinecone Inference
    # Returning a mock vector of 1536 dimensions
    return [0.01] * 1536

async def upsert_to_pinecone(embedding_id: str, vector: list[float], metadata: dict):
    # In production, use Pinecone client to upsert
    print(f"Mock upserted {embedding_id} to Pinecone with metadata {metadata}")
