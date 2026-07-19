import psycopg2

conn = psycopg2.connect('postgresql://postgres:nandi@localhost:5432/eth_db')
cur = conn.cursor()

# Check if targetPhoneNumber is nullable
cur.execute("""
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'threat_reports' AND column_name = 'targetPhoneNumber'
""")
row = cur.fetchone()
print(f"targetPhoneNumber: nullable={row[1]}, default={row[2]}")

# Check FK constraints on threat_reports
cur.execute("""
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name, ccu.column_name as fk_col,
           rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name  
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'threat_reports'
""")
print("\n=== threat_reports FK constraints ===")
for row in cur.fetchall():
    print(f"  col={row[1]} -> {row[2]}.{row[3]} (on delete: {row[4]})")

conn.close()
