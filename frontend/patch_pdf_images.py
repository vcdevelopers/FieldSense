import re

with open('src/components/modals/DailyTrackingDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the whole handleExport block
old_handle_export_start = '  const printRef = useRef<HTMLDivElement>(null);'
old_handle_export_end = '  };'

lines = content.split('\n')
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if old_handle_export_start in line:
        start_idx = i
        break

if start_idx != -1:
    brace_count = 0
    in_function = False
    for i in range(start_idx, len(lines)):
        if 'const handleExport' in lines[i]:
            in_function = True
        if in_function:
            brace_count += lines[i].count('{') - lines[i].count('}')
            if brace_count == 0 and '}' in lines[i]:
                end_idx = i
                break

if start_idx != -1 and end_idx != -1:
    new_handle_export = '''  const printRef = useRef<HTMLDivElement>(null);

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    if (format === "pdf") {
      try {
        const doc = new jsPDF("p", "pt", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;
        let yPos = 40;

        // --- TITLE ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("LOGICON", margin, yPos);
        
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        doc.text("Daily Tracking & Activity Report", margin, yPos + 20);
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, yPos, { align: "right" });
        yPos += 50;

        // --- EMPLOYEE INFO ---
        autoTable(doc, {
          startY: yPos,
          theme: "grid",
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          bodyStyles: { textColor: 50 },
          head: [["Employee Name", "Role", "Department", "Date", "Check-In", "Check-Out"]],
          body: [
            [
              employee.name,
              employee.role,
              employee.department || "N/A",
              date,
              employee.checkInTime,
              employee.checkOutTime || "Active"
            ]
          ]
        });
        yPos = (doc as any).lastAutoTable.finalY + 30;

        // --- TASKS TABLE ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Tasks & Activities Summary", margin, yPos);
        yPos += 15;

        const tasksBody = filteredTasks.map((t: any) => [
          t.taskName,
          t.taskType,
          t.status,
          t.startTime || t.time || "-",
          t.distance ? `${t.distance} km` : "-",
          t.notes || "-"
        ]);

        autoTable(doc, {
          startY: yPos,
          theme: "striped",
          headStyles: { fillColor: [52, 73, 94] },
          head: [["Task Name", "Type", "Status", "Time", "Distance", "Notes"]],
          body: tasksBody
        });
        yPos = (doc as any).lastAutoTable.finalY + 30;

        // --- DETAILED REPORTS & CHECKLISTS ---
        const tasksWithReports = filteredTasks.filter((t: any) => t.reportData);
        if (tasksWithReports.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text("Detailed Forms & Checklists", margin, yPos);
          yPos += 20;

          // Process each task sequentially to await images
          for (const t of tasksWithReports) {
            if (yPos > doc.internal.pageSize.getHeight() - 100) {
              doc.addPage();
              yPos = 40;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(41, 128, 185);
            doc.text(`Task: ${t.taskName} (${t.taskType})`, margin, yPos);
            yPos += 10;

            let reportBody: any[] = [];
            const formatKey = (key: string) => key.replace(/_/g, " ").replace(/\\b\\w/g, l => l.toUpperCase());

            const flattenObject = async (obj: any, prefix = '') => {
              for (const [key, value] of Object.entries(obj)) {
                if (key.toLowerCase() === 'data' && typeof value === 'string') {
                  try {
                    const parsed = JSON.parse(value);
                    await flattenObject(parsed, prefix);
                    continue;
                  } catch(e) {}
                }
                
                const formattedKey = prefix ? `${prefix} - ${formatKey(key)}` : formatKey(key);
                
                if (typeof value === 'object' && value !== null) {
                  if ('answer' in value || 'comment' in value) {
                    let text = [];
                    if ((value as any).answer) text.push(`Answer: ${(value as any).answer}`);
                    if ((value as any).comment) text.push(`Comment: ${(value as any).comment}`);
                    reportBody.push([formattedKey, text.join("\\n") || "-"]);
                  } else {
                    await flattenObject(value, formattedKey);
                  }
                } else {
                  if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                     try {
                        const parsed = JSON.parse(value);
                        if (typeof parsed === 'object' && parsed !== null) {
                           await flattenObject(parsed, formattedKey);
                           continue;
                        }
                     } catch(e) {}
                  }
                  
                  // Image check
                  if (typeof value === 'string' && value.match(/^https?:\\/\\/.*\\.(jpg|jpeg|png|gif|webp)/i)) {
                    try {
                      const img = await loadImage(value);
                      // Calculate aspect ratio to fit inside max 200px width/height
                      let w = img.width;
                      let h = img.height;
                      const maxDim = 150;
                      if (w > maxDim || h > maxDim) {
                        const ratio = Math.min(maxDim/w, maxDim/h);
                        w = w * ratio;
                        h = h * ratio;
                      }
                      reportBody.push([formattedKey, { content: "", image: img, imgW: w, imgH: h, styles: { minCellHeight: h + 10 } }]);
                    } catch(e) {
                      reportBody.push([formattedKey, value]); // fallback to url
                    }
                  } else {
                    reportBody.push([formattedKey, String(value || "-")]);
                  }
                }
              }
            };

            if (typeof t.reportData === 'object' && t.reportData !== null) {
              await flattenObject(t.reportData);
            } else if (typeof t.reportData === 'string') {
              try {
                const parsed = JSON.parse(t.reportData);
                await flattenObject(parsed);
              } catch(e) {
                reportBody = [["Data", String(t.reportData)]];
              }
            } else {
              reportBody = [["Data", String(t.reportData)]];
            }

            autoTable(doc, {
              startY: yPos,
              theme: "grid",
              headStyles: { fillColor: [236, 240, 241], textColor: 0 },
              head: [["Form Field / Question", "Response"]],
              body: reportBody,
              columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 150 }
              },
              didDrawCell: function(data: any) {
                if (data.column.index === 1 && data.cell.raw && data.cell.raw.image) {
                  const raw = data.cell.raw;
                  // Center image vertically in the cell
                  const y = data.cell.y + (data.cell.height - raw.imgH) / 2;
                  doc.addImage(raw.image, data.cell.x + 5, y, raw.imgW, raw.imgH);
                }
              }
            });
            yPos = (doc as any).lastAutoTable.finalY + 20;
          }
        }
        
        doc.save(`Logicon_Tracking_Report_${employee.name.replace(/\\s+/g, '_')}_${date}.pdf`);
      } catch (err) {
        console.error("PDF export failed", err);
        alert("Failed to export PDF.");
      }
    } else {
      console.log(`Exporting as ${format}... (to be implemented)`);
      alert(`${format.toUpperCase()} export is coming soon. Please use PDF for now.`);
    }
  };'''

    lines[start_idx:end_idx+1] = new_handle_export.split('\n')
    
    with open('src/components/modals/DailyTrackingDetailModal.tsx', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print("Patched handleExport to fetch and draw images nicely!")
else:
    print("Could not find the old function.")
