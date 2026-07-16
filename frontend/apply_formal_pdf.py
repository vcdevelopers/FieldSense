import re

with open('src/components/modals/DailyTrackingDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the current handleExport function and replace it.
# The current one uses html2canvas.

old_handle_export_start = '  const handleExport = async (format: "csv" | "pdf" | "excel") => {'
old_handle_export_end = '  };'

# Simple extraction of the function block
lines = content.split('\n')
start_idx = -1
end_idx = -1
brace_count = 0

for i, line in enumerate(lines):
    if old_handle_export_start in line:
        start_idx = i
        brace_count = line.count('{') - line.count('}')
        break

if start_idx != -1:
    for i in range(start_idx + 1, len(lines)):
        brace_count += lines[i].count('{') - lines[i].count('}')
        if brace_count == 0:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    new_handle_export = '''  const handleExport = async (format: "csv" | "pdf" | "excel") => {
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

          tasksWithReports.forEach((t: any) => {
            // Check if we need a page break
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
            if (typeof t.reportData === 'object' && t.reportData !== null) {
              reportBody = Object.entries(t.reportData).map(([key, value]) => {
                const formattedKey = key.replace(/_/g, " ").replace(/\\b\\w/g, l => l.toUpperCase());
                const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return [formattedKey, formattedValue];
              });
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
              }
            });
            yPos = (doc as any).lastAutoTable.finalY + 20;
          });
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
    print("Successfully patched handleExport for formal PDF generation!")
else:
    print("Could not find handleExport function.")
