import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, delete, update
from app.database.session import AsyncSessionLocal
from app.models.domain import NetworkNodes, NetworkEdges

async def merge_mule_accounts():
    async with AsyncSessionLocal() as db:
        # Find all IFSC nodes
        result = await db.execute(select(NetworkNodes).where(NetworkNodes.entityType == "IFSC_CODE"))
        ifsc_nodes = result.scalars().all()
        
        for ifsc in ifsc_nodes:
            # Find the bank account node for the same report
            bank_res = await db.execute(
                select(NetworkNodes).where(
                    NetworkNodes.reportId == ifsc.reportId,
                    NetworkNodes.entityType == "BANK_ACCOUNT"
                )
            )
            bank_node = bank_res.scalars().first()
            
            if bank_node:
                # Merge IFSC value into Bank Account value if not already merged
                if "IFSC" not in bank_node.entityValue:
                    new_val = f"{bank_node.entityValue} (IFSC: {ifsc.entityValue})"
                    
                    await db.execute(
                        update(NetworkNodes).where(NetworkNodes.id == bank_node.id).values(entityValue=new_val)
                    )
                
                # Re-point any edges that pointed to the IFSC node to point to the bank node
                await db.execute(
                    update(NetworkEdges)
                    .where(NetworkEdges.targetNodeId == ifsc.id)
                    .values(targetNodeId=bank_node.id)
                )
                
                await db.execute(
                    update(NetworkEdges)
                    .where(NetworkEdges.sourceNodeId == ifsc.id)
                    .values(sourceNodeId=bank_node.id)
                )
                
                # Delete the IFSC node
                await db.execute(
                    delete(NetworkNodes).where(NetworkNodes.id == ifsc.id)
                )
        
        await db.commit()
        print(f"Merged {len(ifsc_nodes)} IFSC nodes into Bank Account nodes.")

if __name__ == "__main__":
    asyncio.run(merge_mule_accounts())
