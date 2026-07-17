import asyncio
import sys
import os
import uuid
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

engine = create_async_engine('postgresql+asyncpg://postgres:nandi@localhost:5432/eth_db')
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def fix_existing():
    async with SessionLocal() as db:
        # Get all existing threat reports
        reports = await db.execute(text("SELECT id, \"targetPhoneNumber\" FROM threat_reports"))
        rows = reports.fetchall()
        print(f"Found {len(rows)} reports")
        
        for report_id, phone in rows:
            # Check if a VICTIM node exists for this report
            existing = await db.execute(
                text("SELECT id FROM network_nodes WHERE \"reportId\" = :rid AND \"entityType\" = 'VICTIM'"),
                {"rid": report_id}
            )
            if existing.fetchone():
                print(f"Report {report_id} already has victim node, skipping")
                continue
            
            # Get the scammer phone node for this report
            phone_node = await db.execute(
                text("SELECT id FROM network_nodes WHERE \"reportId\" = :rid AND \"entityType\" = 'PHONE_NUMBER'"),
                {"rid": report_id}
            )
            phone_row = phone_node.fetchone()
            phone_node_id = phone_row[0] if phone_row else None
            
            # Create victim node
            victim_node_id = str(uuid.uuid4())
            victim_value = f"victim_{report_id[:8]}"
            await db.execute(
                text("""INSERT INTO network_nodes (id, "entityType", "entityValue", "reportId", label, "createdAt")
                        VALUES (:id, 'VICTIM', :val, :rid, 'VICTIM', NOW())"""),
                {"id": victim_node_id, "val": victim_value, "rid": report_id}
            )
            print(f"Created victim node {victim_node_id} for report {report_id}")
            
            # Link victim to scammer phone if available
            if phone_node_id:
                edge_id = str(uuid.uuid4())
                await db.execute(
                    text("""INSERT INTO network_edges (id, "sourceNodeId", "targetNodeId", "reportId", weight, "createdAt")
                            VALUES (:id, :src, :tgt, :rid, 1.0, NOW())"""),
                    {"id": edge_id, "src": victim_node_id, "tgt": phone_node_id, "rid": report_id}
                )
                print(f"  Linked victim -> scammer phone")
            
            # Fix scammer phone label
            if phone_node_id:
                await db.execute(
                    text('UPDATE network_nodes SET label = \'Scammer Phone\' WHERE id = :id'),
                    {"id": phone_node_id}
                )
        
        await db.commit()
        print("Done fixing existing data!")

asyncio.run(fix_existing())
