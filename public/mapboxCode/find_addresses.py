import pandas as pd

def separate_location():
    file_path = 'ucsc_class_data_preprocessed.csv'
    data = pd.read_csv(file_path)

    # Normalize column names
    data.columns = data.columns.str.strip()

    if 'Location' not in data.columns:
        print("ERROR: 'Location' column not found.")
        return

    # Remove prefix like "LEC: " (first 5 characters) and strip whitespace
    data['Location'] = data['Location'].str[5:].str.strip()

    # Remove last word if it's numeric (room number)
    def remove_last_if_number(loc):
        parts = loc.split()
        if parts and parts[-1].isdigit():
            return ' '.join(parts[:-1])
        return loc

    data['CleanedLocation'] = data['Location'].apply(remove_last_if_number)

    # Get unique cleaned locations in a new DataFrame
    unique_locations_df = data[['CleanedLocation']].drop_duplicates().reset_index(drop=True)

    # Print result
    print(unique_locations_df)

    return unique_locations_df

# Call the function
unique_locations = separate_location()
if unique_locations is not None:
    pd.set_option('display.max_rows', None)
    print(unique_locations)


# import pandas as pd
# import requests
# import time

# file_path = 'addresses.csv'
# data = pd.read_csv(file_path)

# # Strip any whitespace in column names
# data.columns = data.columns.str.strip()

# print("Columns in your file:", list(data.columns))

# # Check column existence
# location_col = None
# if 'Location' in data.columns:
#     location_col = 'Location'
# elif 'CleanedLocation' in data.columns:
#     location_col = 'CleanedLocation'
# else:
#     raise Exception("No valid 'Location' or 'CleanedLocation' column found!")

# # Your Mapbox token
# MAPBOX_TOKEN = 'your_mapbox_token_here'

# def geocode_location(location_name):
#     url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{location_name}, UC Santa Cruz, CA.json"
#     params = {
#         'access_token': MAPBOX_TOKEN,
#         'limit': 1
#     }
#     response = requests.get(url, params=params)
#     if response.status_code == 200:
#         results = response.json()
#         if results['features']:
#             return results['features'][0]['place_name']
#     return None

# geocoded_addresses = []
# for loc in data[location_col]:
#     if pd.notna(loc) and str(loc).strip() != "":
#         address = geocode_location(loc)
#         geocoded_addresses.append(address)
#         print(f"{loc} → {address}")
#         time.sleep(0.25)
#     else:
#         geocoded_addresses.append(None)

# data['GeocodedAddress'] = geocoded_addresses
# data.to_csv("ucsc_locations_with_addresses.csv", index=False)
# print("✅ Geocoded addresses saved!")
