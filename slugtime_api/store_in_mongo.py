import pandas as pd
from pymongo import MongoClient
from urllib.parse import quote_plus  

def store_csv_in_mongo(csv_file, quarter_label):
    username = "" # protected
    password = ""  # protected

    encoded_password = quote_plus(password)

    uri = f"mongodb+srv://{username}:{encoded_password}@spring2025ucsc.r8ppykq.mongodb.net/?retryWrites=true&w=majority&appName=Spring2025UCSC"

    client = MongoClient(uri)

    db = client["SlugtimeDB"]
    coll = db["occupiedRoomsHistory"]

    df = pd.read_csv(csv_file)
    records = df.to_dict(orient="records")

    for r in records:
        r["quarter"] = quarter_label

    if records:
        coll.insert_many(records)
        print(f"Uploaded {len(records)} records to MongoDB Atlas for {quarter_label}")
    else:
        print("No records found in CSV.")

if __name__ == "__main__":
    store_csv_in_mongo("occupied_rooms.csv", "Spring Quarter 2025")
