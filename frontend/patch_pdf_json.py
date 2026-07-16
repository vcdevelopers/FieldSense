import re

with open('src/components/modals/DailyTrackingDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = '''            let reportBody: any[] = [];
            if (typeof t.reportData === 'object' && t.reportData !== null) {
              reportBody = Object.entries(t.reportData).map(([key, value]) => {
                const formattedKey = key.replace(/_/g, " ").replace(/\\b\\w/g, l => l.toUpperCase());
                const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return [formattedKey, formattedValue];
              });
            } else {
               reportBody = [["Data", String(t.reportData)]];
            }'''

new_logic = '''            let reportBody: any[] = [];
            const formatKey = (key: string) => key.replace(/_/g, " ").replace(/\\b\\w/g, l => l.toUpperCase());

            const flattenObject = (obj: any, prefix = '') => {
              for (const [key, value] of Object.entries(obj)) {
                // If the key is 'data' or 'Data' and value is a string, try parsing it
                if (key.toLowerCase() === 'data' && typeof value === 'string') {
                  try {
                    const parsed = JSON.parse(value);
                    flattenObject(parsed, prefix);
                    continue;
                  } catch(e) {}
                }
                
                const formattedKey = prefix ? `${prefix} - ${formatKey(key)}` : formatKey(key);
                
                if (typeof value === 'object' && value !== null) {
                  // Special formatting for answer/comment pairs
                  if ('answer' in value || 'comment' in value) {
                    let text = [];
                    if ((value as any).answer) text.push(`Answer: ${(value as any).answer}`);
                    if ((value as any).comment) text.push(`Comment: ${(value as any).comment}`);
                    reportBody.push([formattedKey, text.join("\\n") || "-"]);
                  } else {
                    // Recursively flatten nested objects
                    flattenObject(value, formattedKey);
                  }
                } else {
                  // Handle regular key-value
                  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                     try {
                        const parsed = JSON.parse(value);
                        if (typeof parsed === 'object' && parsed !== null) {
                           flattenObject(parsed, formattedKey);
                           continue;
                        }
                     } catch(e) {}
                  }
                  reportBody.push([formattedKey, String(value || "-")]);
                }
              }
            };

            if (typeof t.reportData === 'object' && t.reportData !== null) {
              flattenObject(t.reportData);
            } else if (typeof t.reportData === 'string') {
              try {
                const parsed = JSON.parse(t.reportData);
                flattenObject(parsed);
              } catch(e) {
                reportBody = [["Data", String(t.reportData)]];
              }
            } else {
              reportBody = [["Data", String(t.reportData)]];
            }'''

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('src/components/modals/DailyTrackingDetailModal.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched handleExport to parse JSON nicely!")
else:
    print("Could not find the old parsing logic.")
