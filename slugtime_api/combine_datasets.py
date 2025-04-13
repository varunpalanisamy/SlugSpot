import pandas as pd

# Load the pre-processed classes dataset.
# This file should already have columns: Class, Location, Day/Time.
classes_df = pd.read_csv("data/ucsc_class_data_preprocessed.csv")

# Load the pre-processed discussion sections dataset.
# It was originally named "all_discussion_sections.csv" but after cleaning it should have matching columns.
discussions_df = pd.read_csv("all_discussion_sections_cleaned.csv")

# If the discussion dataset still has the column named "Section" instead of "Class", we rename it.
if "Section" in discussions_df.columns:
    discussions_df.rename(columns={"Section": "Class"}, inplace=True)

# Now both DataFrames have the same column names: Class, Location, Day/Time

# Combine the two DataFrames by concatenating them row-wise.
occupied_rooms = pd.concat([classes_df, discussions_df], ignore_index=True)

# Optionally, you could sort the master schedule by the Class column or any other criteria.
occupied_rooms.sort_values(by="Class", inplace=True)
occupied_rooms.reset_index(drop=True, inplace=True)

# Save the resulting master schedule DataFrame to a new CSV file.
occupied_rooms.to_csv("occupied_rooms.csv", index=False)

print("Combined master schedule saved to 'occupied_rooms.csv'.")
