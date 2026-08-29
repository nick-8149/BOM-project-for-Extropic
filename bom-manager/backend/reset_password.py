import asyncio
import aiosqlite
from app.core.security import hash_password

async def reset_admin_password():
    print("Resetting password for admin@company.com...")
    async with aiosqlite.connect('bom_manager.db') as db:
        new_hash = hash_password('password123')
        await db.execute('UPDATE users SET password_hash = ? WHERE email = ?', (new_hash, 'admin@company.com'))
        await db.commit()
    print("Password successfully reset to: password123")

if __name__ == "__main__":
    asyncio.run(reset_admin_password())
