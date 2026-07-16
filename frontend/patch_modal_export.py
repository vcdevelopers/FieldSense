import re

with open('src/components/modals/DailyTrackingDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'jspdf' not in content:
    content = content.replace('import { MapPin,', 'import jsPDF from "jspdf";\nimport "jspdf-autotable";\nimport { MapPin,')

# Replace handleExport
old_handle_export = '''  const handleExport = (format: "csv" | "pdf" | "excel") => {
    console.log(`Exporting as ${format}...`);
  };'''

new_handle_export = '''  const handleExport = (format: "csv" | "pdf" | "excel") => {
    if (format === "pdf") {
      try {
        const doc = new jsPDF();
        doc.text(`Daily Tracking Report - ${empName}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Date: ${date}`, 14, 22);

        const tableColumn = ["Task Name", "Type", "Status", "Time", "Client", "Outcome"];
        const tableRows = filteredTasks.map((t: any) => [
          t.taskName,
          t.taskType,
          t.status,
          t.time,
          t.client,
          t.outcome || ""
        ]);

        (doc as any).autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 30,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [63, 63, 70], textColor: 255 }
        });

        doc.save(`Tracking_Report_${empName.replace(/\\s+/g, '_')}_${date}.pdf`);
      } catch (err) {
        console.error("PDF export failed", err);
        alert("Failed to export PDF.");
      }
    } else {
      console.log(`Exporting as ${format}... (to be implemented)`);
      alert(`${format.toUpperCase()} export is coming soon. Please use PDF for now.`);
    }
  };'''

if old_handle_export in content:
    content = content.replace(old_handle_export, new_handle_export)

with open('src/components/modals/DailyTrackingDetailModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched handleExport!")
