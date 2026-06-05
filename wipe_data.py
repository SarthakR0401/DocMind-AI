import os
import json
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# 1. Clear Local users.json
if os.path.exists("users.json"):
    os.remove("users.json")
    print("Deleted local users.json")

# 2. Clear MongoDB users collection
MONGO_URI = os.getenv("MONGO_URI")
if MONGO_URI:
    try:
        client = MongoClient(MONGO_URI)
        db = client["docmind_db"]
        users_col = db["users"]
        result = users_col.delete_many({})
        print(f"Deleted {result.deleted_count} users from MongoDB Atlas")
    except Exception as e:
        print(f"Error clearing MongoDB: {e}")
else:
    print("MONGO_URI not found in environment")
