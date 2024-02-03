import json
import html


def replace_unicode_escape(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as file:
        data = json.load(file)

    # Replace Unicode escape sequences in the description field
    for entry in data:
        description = entry["input_values"]["description"]
        entry["input_values"]["description"] = html.unescape(description)

    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=2, ensure_ascii=False)


# Read meme links from kym_memes_choice.txt
with open('../input_data_1/kym_memes_choice.txt', 'r') as file:
    meme_links = [line.strip() for line in file]

with open('../input_data_1/memes.json', 'r', encoding='utf-8') as file:
    kym_data = json.load(file)

# Initialize input_data list
input_data = []

# Iterate through meme links
for link in meme_links:
    # Find the corresponding entry in kym.json
    meme_entry = next((entry for entry in kym_data if entry['url'] == link), None)

    # If the entry is found, extract required information
    if meme_entry:
        meme_data = {
            "input_values": {
                "meme": meme_entry["template_image_url"],
                "description": meme_entry["meta"]["description"],
                "kymLink": meme_entry["url"]
            }
        }
        input_data.append(meme_data)
    else:
        print(link + " not found in dataset")

# Write input_data to input_data.json
with open('../input_data_1/input_data.json', 'w') as file:
    json.dump(input_data, file, indent=2)

replace_unicode_escape('../input_data_1/input_data.json', 'data/input_data_processed.json')