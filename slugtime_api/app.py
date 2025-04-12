import streamlit as st
import pandas as pd
import re

def parse_day_time(dt_str):
    """
    Parse a Day/Time string such as "MWF 04:00PM-05:05PM" into three components:
    - Days: e.g. "MWF"
    - Start Time: e.g. "04:00PM"
    - End Time: e.g. "05:05PM"
    
    Returns a tuple: (days, start, end)
    If the string cannot be parsed, returns (None, None, None).
    """
    pattern = r"([A-Za-z]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)"
    match = re.match(pattern, dt_str)
    if match:
        days, start, end = match.groups()
        return days, start, end
    return None, None, None

def load_and_normalize_data():
    """
    Loads the preprocessed CSV dataset, then parses and adds new columns:
      - 'Days'
      - 'Start Time'
      - 'End Time'
    from the 'Day/Time' field.
    """
    # Load your preprocessed CSV; ensure it is in the same directory as this file.
    df = pd.read_csv("ucsc_class_data_preprocessed.csv")
    
    # Parse the 'Day/Time' column into three separate columns.
    # The lambda returns a Series (days, start, end) if there is a valid string; otherwise, [None, None, None].
    parsed = df["Day/Time"].apply(lambda x: pd.Series(parse_day_time(x)) if isinstance(x, str) else pd.Series([None, None, None]))
    parsed.columns = ["Days", "Start Time", "End Time"]
    
    # Concatenate the new columns to the original DataFrame.
    df = pd.concat([df, parsed], axis=1)
    return df

def main():
    st.title("UCSC Free Classroom Finder")
    st.write("Use the sidebar filters to view free classrooms by day and/or location.")
    
    # Load and normalize your dataset.
    df = load_and_normalize_data()
    
    # st.write("### Full Dataset Preview (first 10 rows)")
    # st.dataframe(df.head(10))
    
    # Sidebar filtering options
    st.sidebar.header("Filters")
    
    # --- Filter by Day ---
    # We offer the days Monday to Friday.
    days_options = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    selected_days = st.sidebar.multiselect("Select day(s) to filter on", days_options, default=days_options)
    
    # Define a mapping from full day names to expected abbreviations that might appear in the "Days" column.
    # (For example, the dataset might contain "MWF" for Monday, Wednesday, Friday,
    #  "TuTh" for Tuesday and Thursday, etc.)
    day_mapping = {
        "Monday": "M",
        "Tuesday": "Tu",
        "Wednesday": "W",
        "Thursday": "Th",
        "Friday": "F"
    }
    
    # --- Filter by Location ---
    location_filter = st.sidebar.text_input("Filter by location (text match):", "")
    
    # --- Apply Filtering ---
    filtered_df = df.copy()
    
    # If any days are selected, filter rows to include all rows whose 'Days' column contains
    # the corresponding abbreviation.
    if selected_days:
        mask = pd.Series(True, index=filtered_df.index)
        for day in selected_days:
            abbr = day_mapping.get(day)
            # Use case-insensitive containment
            mask = mask & filtered_df["Days"].fillna("").str.contains(abbr, case=False, na=False)
        filtered_df = filtered_df[mask]

    # Normalize location by removing prefixes like "LEC:", "LAB:", "SEM:", etc.
    normalized_location = filtered_df["Location"].str.replace(r"^[A-Z]+:\s*", "", regex=True)

    if location_filter:
        filtered_df = filtered_df[normalized_location.str.contains(location_filter, case=False, na=False)]

    
    st.write("### Filtered Results")
    st.dataframe(filtered_df)
    
    # Optionally, offer a download button for the filtered dataset.
    csv = filtered_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Download filtered data as CSV",
        data=csv,
        file_name="filtered_ucsc_class_data.csv",
        mime="text/csv",
    )

if __name__ == "__main__":
    main()
