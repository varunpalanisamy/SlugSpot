import streamlit as st
import pandas as pd
import re

def parse_day_time(dt_str):
    pattern = r"([A-Za-z]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)"
    match = re.match(pattern, dt_str)
    if match:
        days, start, end = match.groups()
        return days, start, end
    return None, None, None

def load_and_normalize_data():

    df = pd.read_csv("ucsc_class_data_preprocessed.csv")
    
    parsed = df["Day/Time"].apply(lambda x: pd.Series(parse_day_time(x)) if isinstance(x, str) else pd.Series([None, None, None]))
    parsed.columns = ["Days", "Start Time", "End Time"]
    
    df = pd.concat([df, parsed], axis=1)
    return df

def main():
    st.title("UCSC Free Classroom Finder")
    st.write("Use the sidebar filters to view free classrooms by day and/or location.")
    
    df = load_and_normalize_data()
    
    # st.write("### Full Dataset Preview (first 10 rows)")
    # st.dataframe(df.head(10))
 
    st.sidebar.header("Filters")
    
    days_options = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    selected_days = st.sidebar.multiselect("Select day(s) to filter on", days_options, default=days_options)
    
    day_mapping = {
        "Monday": "M",
        "Tuesday": "Tu",
        "Wednesday": "W",
        "Thursday": "Th",
        "Friday": "F"
    }
    
    location_filter = st.sidebar.text_input("Filter by location (text match):", "")
    
    filtered_df = df.copy()
    
    if selected_days:
        mask = pd.Series(True, index=filtered_df.index)
        for day in selected_days:
            abbr = day_mapping.get(day)
            mask = mask & filtered_df["Days"].fillna("").str.contains(abbr, case=False, na=False)
        filtered_df = filtered_df[mask]

    normalized_location = filtered_df["Location"].str.replace(r"^[A-Z]+:\s*", "", regex=True)

    if location_filter:
        filtered_df = filtered_df[normalized_location.str.contains(location_filter, case=False, na=False)]

    
    st.write("### Filtered Results")
    st.dataframe(filtered_df)
    
    csv = filtered_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="Download filtered data as CSV",
        data=csv,
        file_name="filtered_ucsc_class_data.csv",
        mime="text/csv",
    )

if __name__ == "__main__":
    main()
