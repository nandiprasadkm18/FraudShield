import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database.session import engine
from app.api.v1.intel import get_network

async def main():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        # bypass Depends by passing the db directly
        result = await get_network(db=db, layout="hierarchical")
        edges = result.get("edges", [])
        print("Total edges:", len(edges))
        
        red_edges = [e for e in edges if e.get("style", {}).get("stroke") == "#ef4444"]
        white_edges = [e for e in edges if e.get("style", {}).get("stroke") == "#ffffff"]
        print("Red edges count:", len(red_edges))
        print("White edges count:", len(white_edges))
        
        for e in edges:
            if "Received Call" in e.get("label", ""):
                print(f"Edge {e['source']} -> {e['target']}: {e.get('style', {}).get('stroke')}")
                
        print("Checking hidden edges in clusters...")
        nodes = result.get("nodes", [])
        for n in nodes:
            if n["data"].get("entityType") == "CLUSTER":
                hidden_edges = n["data"].get("hidden_edges", [])
                for he in hidden_edges:
                    print(f"Hidden Edge {he['source']} -> {he['target']}: {he.get('label', '')} {he.get('style', {}).get('stroke')}")

if __name__ == "__main__":
    asyncio.run(main())
