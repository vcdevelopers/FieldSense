import re

file_path = r"c:\field-senses-app-main\frontend\src\components\tracking\LiveTrackingMap.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Extract Map Section
map_section_match = re.search(r"(      {/\* Map Section \*/}\n      <div className=\"relative.*?)(?=\n      {/\* Bottom Panel Dashboard \*/})", content, re.DOTALL)
map_section = map_section_match.group(1)

# Extract Bottom Panel Section
bottom_panel_match = re.search(r"(      {/\* Bottom Panel Dashboard \*/}\n      <div className=\"w-full flex flex-col gap-4 pr-2 pb-4\">\n        <Card className=\"shadow-lg border border-border\">\n.*?      </div>\n)", content, re.DOTALL)
bottom_panel = bottom_panel_match.group(1)

# Modify Map Section
new_map_section = map_section.replace('shadow-xl', 'shadow-sm').replace('md:h-[450px]', 'md:h-[500px]')

# Modify Bottom Panel
new_bottom_panel = bottom_panel.replace('Bottom Panel Dashboard', 'Top Panel Filters').replace('shadow-lg', 'shadow-sm').replace('pr-2 pb-4', '')

# Replace both
new_content = content.replace(map_section, "").replace(bottom_panel, new_bottom_panel + "\n" + new_map_section)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Done")
