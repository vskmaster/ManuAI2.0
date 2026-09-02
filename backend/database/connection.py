import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_config = Database()

async def connect_to_mongo():
    if settings.MONGODB_URI:
        db_config.client = AsyncIOMotorClient(settings.MONGODB_URI, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
        db_config.db = db_config.client.manu_ai
        print("Connected to MongoDB Atlas")
    else:
        print("Warning: MONGODB_URI not configured.")

async def close_mongo_connection():
    if db_config.client:
        db_config.client.close()
        print("Closed MongoDB connection")

def get_db():
    return db_config.db
