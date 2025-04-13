import pandas as pd

classes_df = pd.read_csv("data/ucsc_class_data_preprocessed.csv")

discussions_df = pd.read_csv("all_discussion_sections_cleaned.csv")

if "Section" in discussions_df.columns:
    discussions_df.rename(columns={"Section": "Class"}, inplace=True)

occupied_rooms = pd.concat([classes_df, discussions_df], ignore_index=True)

occupied_rooms.sort_values(by="Class", inplace=True)
occupied_rooms.reset_index(drop=True, inplace=True)

occupied_rooms.to_csv("occupied_rooms.csv", index=False)

print("Combined master schedule saved to 'occupied_rooms.csv'.")
