import re

with open('src/components/ui/DataTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'jspdf' not in content:
    content = content.replace('import { Input }', 'import jsPDF from "jspdf";\nimport "jspdf-autotable";\nimport { Input }')

# Add handlePDFExport function
pdf_func = '''  const handlePDFExport = () => {
    try {
      const doc = new jsPDF();
      const headers = columns.map((col) => col.header);
      
      const tableData = filteredData.map((row) => {
        return columns.map((col) => {
          let val = getNestedValue(row, col.key as string);
          if (val === null || val === undefined) val = "";
          return String(val);
        });
      });

      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 63, 70], textColor: 255 }, // matches card header color
        margin: { top: 20 },
      });

      doc.save("table_export.pdf");
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to export PDF. Please check console.");
    }
  };'''

if 'handlePDFExport' not in content:
    # Insert before handleCSVExport
    content = content.replace('  const handleCSVExport = () => {', pdf_func + '\n\n  const handleCSVExport = () => {')

# Replace the onClick handler for the PDF export button
old_pdf_click = '''                <DropdownMenuItem onClick={() => {
                  alert("PDF export functionality will be integrated with a backend PDF generator.");
                  window.print();
                }}>
                  Export as PDF
                </DropdownMenuItem>'''

new_pdf_click = '''                <DropdownMenuItem onClick={handlePDFExport}>
                  Export as PDF
                </DropdownMenuItem>'''

if old_pdf_click in content:
    content = content.replace(old_pdf_click, new_pdf_click)

with open('src/components/ui/DataTable.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched DataTable.tsx successfully")
