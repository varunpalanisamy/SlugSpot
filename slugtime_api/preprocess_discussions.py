import pandas as pd
import os

def preprocess_discussion_sections(input_csv="all_discussion_sections.csv",
                                   output_csv="all_discussion_sections_cleaned.csv"):
    df = pd.read_csv(input_csv)
    
    df.rename(columns={"Section": "Class"}, inplace=True)
    
    for col in ['Class', 'Location', 'Day/Time']:
        df[col] = df[col].astype(str).str.strip()
    
    df = df.dropna(subset=["Class", "Location", "Day/Time"])
    
    for col in ["Class", "Location", "Day/Time"]:
        df = df[df[col].str.lower() != "nan"]
    
    df = df[(df['Day/Time'] != "") & (df['Location'] != "")]
    
    df = df[~df['Location'].str.contains("remote", case=False, na=False)]
    
    df = df[~df['Class'].str.contains("cancelled|tbd", case=False, na=False)]
    df = df[~df['Location'].str.contains("cancelled|tbd", case=False, na=False)]
    df = df[~df['Day/Time'].str.contains("cancelled|tbd", case=False, na=False)]
    
    df.to_csv(output_csv, index=False)
    print(f"Preprocessing complete. Cleaned data saved to {output_csv}")

if __name__ == "__main__":
    preprocess_discussion_sections()
