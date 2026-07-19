"""Reset admin password to a known value using the same hashing as auth_service"""
import psycopg2
import bcrypt

conn = psycopg2.connect('postgresql://postgres:nandi@localhost:5432/eth_db')
cur = conn.cursor()

# Reset admin password to 'admin123'
new_password = "admin123"
pw_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
cur.execute("UPDATE users SET \"passwordHash\" = %s WHERE email = 'admin@gmail.com'", (pw_hash,))
conn.commit()
print(f"Admin password reset to: {new_password}")

# Reset citizen password too
citizen_password = "citizen123"
pw_hash2 = bcrypt.hashpw(citizen_password.encode(), bcrypt.gensalt()).decode()
cur.execute("UPDATE users SET \"passwordHash\" = %s WHERE email = 'citizen@gmail.com'", (pw_hash2,))
conn.commit()
print(f"Citizen password reset to: {citizen_password}")

# Verify
cur.execute("SELECT email, \"passwordHash\" FROM users")
for row in cur.fetchall():
    email, hash_val = row
    test_pw = "admin123" if "admin" in email else "citizen123"
    result = bcrypt.checkpw(test_pw.encode(), hash_val.encode())
    print(f"{email}: hash verify ({test_pw}) = {result}")

conn.close()
print("\nDone! Login credentials:")
print("  Admin:   admin@gmail.com   / admin123")
print("  Citizen: citizen@gmail.com / citizen123")
