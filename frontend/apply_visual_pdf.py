import re

with open('src/components/modals/DailyTrackingDetailModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for html2canvas
if 'html2canvas' not in content:
    content = content.replace('import jsPDF from "jspdf";', 'import jsPDF from "jspdf";\nimport html2canvas from "html2canvas";')

# We need to find the handleExport function
old_handle_export = '''  const handleExport = (format: "csv" | "pdf" | "excel") => {
    if (format === "pdf") {
      try {
        const empName = employeeData?.employee_name || "Employee";
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

        autoTable(doc, {
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

new_handle_export = '''  const printRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    if (format === "pdf") {
      try {
        const empName = employeeData?.employee_name || "Employee";
        if (printRef.current) {
          // Add a loading state if we want, but html2canvas can be fast.
          const originalHeight = printRef.current.style.height;
          const originalOverflow = printRef.current.style.overflow;
          
          printRef.current.style.height = 'max-content';
          printRef.current.style.overflow = 'visible';

          const canvas = await html2canvas(printRef.current, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            windowWidth: printRef.current.scrollWidth,
            windowHeight: printRef.current.scrollHeight
          });

          // Restore styles
          printRef.current.style.height = originalHeight;
          printRef.current.style.overflow = originalOverflow;

          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          let position = 0;
          let heightLeft = pdfHeight;
          
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();

          while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
          }

          pdf.save(`Tracking_Report_${empName.replace(/\\s+/g, '_')}_${date}.pdf`);
        }
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

# Look for `<div className="flex-1 overflow-y-auto p-6 space-y-6">`
target_div = '<div className="flex-1 overflow-y-auto p-6 space-y-6">'
if target_div in content:
    content = content.replace(target_div, '<div ref={printRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">')

with open('src/components/modals/DailyTrackingDetailModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched handleExport for visual PDF generation!")
