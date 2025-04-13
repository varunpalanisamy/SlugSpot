import pandas as pd

def preprocess_classes():
    input_file = "ucsc_class_data.csv"
    output_file = "ucsc_class_data_preprocessed.csv"
    
    df = pd.read_csv(input_file)
    
    def should_remove(row):
        location = row["Location"] if pd.notna(row["Location"]) else ""
        day_time = row["Day/Time"] if pd.notna(row["Day/Time"]) else ""
        
        loc_lower = location.lower()
        dt_lower = day_time.lower().strip()
        
        if "online" in loc_lower or "remote instruction" in loc_lower or "digital arts" in loc_lower:
            return True
        
        if "tbd in person" in loc_lower:
            return True
        
        if "cancelled" in dt_lower:
            return True
        
        if dt_lower == "day and time:":
            return True
        
        return False

    df_filtered = df[~df.apply(should_remove, axis=1)]
    
    df_filtered.to_csv(output_file, index=False)
    
    return df_filtered

if __name__ == "__main__":
    df_preprocessed = preprocess_classes()
    print("Preprocessing complete.")
    print("New dataset has", len(df_preprocessed), "rows.")
    print(df_preprocessed.head())
