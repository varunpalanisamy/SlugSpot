import pandas as pd
import os

def preprocess_discussion_sections(input_csv="all_discussion_sections.csv",
                                   output_csv="all_discussion_sections_cleaned.csv"):
    # Read the CSV file containing the discussion sections data.
    df = pd.read_csv(input_csv)
    
    # Rename the first column from "Section" to "Class"
    df.rename(columns={"Section": "Class"}, inplace=True)
    
    # Strip whitespace from the 'Class', 'Location', and 'Day/Time' columns.
    for col in ['Class', 'Location', 'Day/Time']:
        df[col] = df[col].astype(str).str.strip()
    
    # Remove rows with actual NaN values in any key column.
    df = df.dropna(subset=["Class", "Location", "Day/Time"])
    
    # Remove rows that contain "nan" (case-insensitive) in any of the key columns.
    for col in ["Class", "Location", "Day/Time"]:
        df = df[df[col].str.lower() != "nan"]
    
    # Remove rows where Day/Time or Location are empty.
    df = df[(df['Day/Time'] != "") & (df['Location'] != "")]
    
    # Remove rows where the Location field contains "Remote" (case-insensitive).
    df = df[~df['Location'].str.contains("remote", case=False, na=False)]
    
    # Remove rows if any key field contains "Cancelled" or "TBD" (case-insensitive).
    df = df[~df['Class'].str.contains("cancelled|tbd", case=False, na=False)]
    df = df[~df['Location'].str.contains("cancelled|tbd", case=False, na=False)]
    df = df[~df['Day/Time'].str.contains("cancelled|tbd", case=False, na=False)]
    
    # Save the cleaned data to a new CSV file.
    df.to_csv(output_csv, index=False)
    print(f"Preprocessing complete. Cleaned data saved to {output_csv}")

if __name__ == "__main__":
    preprocess_discussion_sections()
