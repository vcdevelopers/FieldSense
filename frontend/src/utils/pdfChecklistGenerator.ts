import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ============================================================================
   COMMON HELPERS
   ============================================================================ */

// Loads an image and returns both its base64 data URL and its real pixel
// dimensions, so we can size it on the page WITHOUT distorting it.
const fetchImageAsBase64 = async (
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  try {
    // If the URL is a relative backend media URL, prepend the API backend URL so fetch doesn't 404 on Vite
    if (url.startsWith("/media/")) {
      const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      url = `${baseUrl}${url}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    const blob = await response.blob();

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const { width, height } = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = dataUrl;
      }
    );

    return { dataUrl, width, height };
  } catch (error) {
    console.warn(`Could not load image at ${url}`, error);
    return null;
  }
};

// jsPDF needs to know the actual format (PNG/JPEG) â€” guess it from the data URL
// instead of hardcoding it, which was silently corrupting the map image before.
const formatFromDataUrl = (dataUrl: string): "PNG" | "JPEG" => {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
};

// Fit an image into a maxWidth x maxHeight box, preserving aspect ratio.
const fitImage = (
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
  return { width: imgWidth * ratio, height: imgHeight * ratio };
};

// "mom_purpose" / "clientFeedback" -> "Mom Purpose" / "Client Feedback"
const humanizeKey = (key: string): string => {
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

// Extracts readable text from nested objects (e.g. { answer: "Good", comment: "..." })
const formatFieldValue = (val: unknown): string => {
  if (typeof val === "object" && val !== null) {
    const v = val as Record<string, unknown>;
    if (v.answer) {
      return v.comment ? `${v.answer} (${v.comment})` : String(v.answer);
    }
    return Object.values(v).filter(Boolean).join(", ");
  }
  return String(val);
};

const isImageUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const val = value.trim();
  if (val.startsWith("data:image/")) return true;
  if (val.startsWith("/media/") && !val.endsWith(".pdf")) return true;
  return /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(val);
};

// Brand palette â€” tweak these to match your actual brand colors.
const COLORS = {
  primary: [21, 41, 92] as [number, number, number], // deep navy accent bar
  primaryLight: [235, 238, 245] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  muted: [110, 110, 110] as [number, number, number],
  border: [210, 210, 210] as [number, number, number],
};

const PAGE = {
  margin: 40,
};

interface PDFContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

const newContext = (): PDFContext => {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  return {
    doc,
    pageWidth,
    pageHeight,
    margin: PAGE.margin,
    contentWidth: pageWidth - PAGE.margin * 2,
  };
};

// Ensures there's room for `needed` points before the bottom margin; if not,
// starts a new page and returns the reset Y position.
const ensureSpace = (ctx: PDFContext, currentY: number, needed: number): number => {
  const bottomLimit = ctx.pageHeight - 60; // leave room for footer
  if (currentY + needed > bottomLimit) {
    ctx.doc.addPage();
    return ctx.margin;
  }
  return currentY;
};

// Draws the letterhead: logo (aspect-ratio safe) + report title on a light band.
const drawHeader = async (ctx: PDFContext, title: string): Promise<number> => {
  const { doc, margin, pageWidth } = ctx;
  let y = margin;

  const logo = await fetchImageAsBase64("/logicon-logo.png");
  if (logo) {
    // Cap the logo to a sensible box and preserve its real aspect ratio.
    const { width, height } = fitImage(logo.width, logo.height, 130, 46);
    doc.addImage(logo.dataUrl, formatFromDataUrl(logo.dataUrl), margin, y, width, height);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.primary);
  doc.text(title, pageWidth - margin, y + 20, { align: "right" });

  y += 60;

  // Accent rule under the header
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);

  return y + 24;
};

// Renders label/value metadata pairs as a clean two-column table so
// alignment is guaranteed, instead of manually computed x/y offsets.
const drawMetadataTable = (ctx: PDFContext, startY: number, rows: [string, string][]): number => {
  autoTable(ctx.doc, {
    startY,
    margin: { left: ctx.margin, right: ctx.margin },
    body: rows,
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: { top: 3, bottom: 3, left: 0, right: 8 },
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 150, textColor: COLORS.muted },
      1: { fontStyle: "normal", cellWidth: ctx.contentWidth - 150 },
    },
  });
  return (ctx.doc as any).lastAutoTable.finalY + 20;
};

// A small colored section heading, consistent across the report.
const drawSectionTitle = (ctx: PDFContext, y: number, label: string): number => {
  const { doc, margin, contentWidth } = ctx;
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(margin, y, contentWidth, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.primary);
  doc.text(label.toUpperCase(), margin + 8, y + 15);
  return y + 22 + 14;
};

const drawFooters = (ctx: PDFContext, generatedLabel: string) => {
  const { doc, pageWidth, pageHeight, margin } = ctx;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(generatedLabel, margin, pageHeight - 28);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 28, {
      align: "right",
    });
  }
};

// Draws the Google Static Map (or a graceful placeholder) into the report.
const drawLocationSection = async (
  ctx: PDFContext,
  startY: number,
  coordinates?: { lat: number; lng: number },
  fallbackLabel?: string
): Promise<number> => {
  const { doc, margin, contentWidth, pageWidth } = ctx;
  let y = ensureSpace(ctx, startY, 22 + 150 + 14);
  y = drawSectionTitle(ctx, y, "Location");

  const boxHeight = 150;
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  let mapImage: { dataUrl: string; width: number; height: number } | null = null;
  if (coordinates?.lat && coordinates?.lng && GOOGLE_MAPS_API_KEY) {
    const { lat, lng } = coordinates;
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&markers=color:red%7Clabel:S%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(staticMapUrl)}`;
    mapImage = await fetchImageAsBase64(corsProxyUrl);
  }

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.75);
  doc.rect(margin, y, contentWidth, boxHeight);

  if (mapImage) {
    // Use the real format (fixes the PNG-tagged-as-JPEG bug) and fill the box
    // without stretching, since a static map's aspect ratio is fixed (2:1).
    doc.addImage(mapImage.dataUrl, "PNG", margin, y, contentWidth, boxHeight);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    const label = coordinates
      ? `GPS Coordinates: ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
      : `Location: ${fallbackLabel || "Unknown"}`;
    doc.text("Map preview unavailable", pageWidth / 2, y + boxHeight / 2 - 8, { align: "center" });
    doc.text(label, pageWidth / 2, y + boxHeight / 2 + 8, { align: "center" });
  }

  return y + boxHeight + 26;
};

// Renders any photo fields found in the report data as actual embedded
// images (aspect-ratio preserved) instead of dumping raw URLs into a table.
const drawPhotosSection = async (
  ctx: PDFContext,
  startY: number,
  photos: { label: string; url: string }[]
): Promise<number> => {
  if (photos.length === 0) return startY;

  const { doc, margin, contentWidth, pageWidth } = ctx;
  let y = ensureSpace(ctx, startY, 40);
  y = drawSectionTitle(ctx, y, "Photos");

  const maxPhotoW = (contentWidth - 20) / 2; // two per row
  const maxPhotoH = 180;
  let col = 0;
  let rowStartY = y;
  let rowHeight = 0;

  for (const photo of photos) {
    const img = await fetchImageAsBase64(photo.url);
    const x = margin + col * (maxPhotoW + 20);

    if (col === 0) {
      rowStartY = ensureSpace(ctx, rowStartY, maxPhotoH + 30);
      y = rowStartY;
    }

    if (img) {
      const { width, height } = fitImage(img.width, img.height, maxPhotoW, maxPhotoH);
      doc.setDrawColor(...COLORS.border);
      doc.rect(x, y, width, height);
      doc.addImage(img.dataUrl, formatFromDataUrl(img.dataUrl), x, y, width, height);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(photo.label, x, y + height + 12);
      rowHeight = Math.max(rowHeight, height + 20);
    } else {
      doc.setFillColor(...COLORS.primaryLight);
      doc.rect(x, y, maxPhotoW, maxPhotoH, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text("(Image could not be loaded)", x + maxPhotoW / 2, y + maxPhotoH / 2, {
        align: "center",
      });
      rowHeight = Math.max(rowHeight, maxPhotoH + 20);
    }

    col = col === 0 ? 1 : 0;
    if (col === 0) {
      rowStartY = y + rowHeight;
    }
  }

  // if we ended mid-row, still account for that row's height
  const finalY = col === 0 ? rowStartY : rowStartY + rowHeight;
  return finalY + 10;
};

const drawSignatureBlock = (ctx: PDFContext, startY: number): number => {
  const { doc, margin, contentWidth } = ctx;
  const y = ensureSpace(ctx, startY, 70);
  const colWidth = contentWidth / 2 - 20;

  doc.setDrawColor(...COLORS.border);
  doc.line(margin, y + 40, margin + colWidth, y + 40);
  doc.line(margin + colWidth + 40, y + 40, margin + colWidth + 40 + colWidth, y + 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text("Client Signature", margin, y + 52);
  doc.text("Operations / Manager Signature", margin + colWidth + 40, y + 52);

  return y + 70;
};

const formatDate = (isoTime?: string, startTime?: string): string => {
  const t = isoTime || startTime;
  const d = t ? new Date(t) : new Date();
  return d.toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* ============================================================================
   DATA PARSING
   ============================================================================ */

export interface TaskData {
  taskName?: string;
  clientName?: string;
  location?: string;
  startTime?: string;
  isoTime?: string;
  employeeName?: string;
  proofUrl?: string;
  reportData?: any;
  coordinates?: { lat: number; lng: number };
}

const parseReportData = (reportData: any): Record<string, unknown> => {
  if (!reportData) return {};

  let finalData = reportData;
  if (typeof reportData === "string") {
    try {
      finalData = JSON.parse(reportData);
    } catch {
      return {};
    }
  }

  let parsedData = finalData;
  if (finalData && finalData.data) {
    if (typeof finalData.data === "string") {
      try {
        parsedData = JSON.parse(finalData.data);
      } catch {
        parsedData = {};
      }
    } else {
      parsedData = finalData.data;
    }
  }

  if (finalData.remarks && !parsedData.remarks) {
    parsedData.remarks = finalData.remarks;
  }
  return parsedData || {};
};

// Splits report fields into: table rows, photo fields, and remarks â€”
// so photos never end up as raw URL text in a table cell again.
const splitReportFields = (finalData: Record<string, unknown>, extraPhotoUrl?: string) => {
  const tableRows: [string, unknown][] = [];
  const photos: { label: string; url: string }[] = [];
  let remarks = "";

  for (const [key, val] of Object.entries(finalData)) {
    if (key === "_attachmentUrl" || key === "remarks") continue;
    
    if (isImageUrl(val)) {
      photos.push({ label: humanizeKey(key), url: val as string });
    } else {
      // Check if it's an object that contains a nested photo
      if (typeof val === "object" && val !== null) {
        const v = val as Record<string, unknown>;
        if (v.photo && isImageUrl(v.photo)) {
          photos.push({ label: `${humanizeKey(key)} Photo`, url: v.photo as string });
        }
        if (v.image && isImageUrl(v.image)) {
          photos.push({ label: `${humanizeKey(key)} Image`, url: v.image as string });
        }
        if (v.attachment && isImageUrl(v.attachment)) {
          photos.push({ label: `${humanizeKey(key)} Attachment`, url: v.attachment as string });
        }
      }
      tableRows.push([key, val]);
    }
  }

  if (typeof finalData.remarks === "string") remarks = finalData.remarks;
  if (finalData._attachmentUrl && typeof finalData._attachmentUrl === "string") {
    photos.push({ label: "Attachment", url: finalData._attachmentUrl });
  }
  if (extraPhotoUrl) {
    photos.push({ label: "Site Visit Photo", url: extraPhotoUrl });
  }

  return { tableRows, photos, remarks };
};

/* ============================================================================
   SITE VISIT REPORT
   ============================================================================ */

export const generateSiteVisitPDF = async (task: TaskData, employeeName: string, title = "Site Visit Report") => {
  const ctx = newContext();
  const { doc, margin, contentWidth } = ctx;

  let y = await drawHeader(ctx, title);

  const clientName = task.clientName || "N/A";
  const siteName = task.location || task.taskName || "N/A";
  const reportCreatedBy = employeeName || task.employeeName || "N/A";

  y = drawMetadataTable(ctx, y, [
    ["Date of Visit", formatDate(task.isoTime, task.startTime)],
    ["Client Name", clientName],
    ["Site Name", siteName],
    ["Client Manager / Supervisor", "N/A"],
    ["Report Created By", reportCreatedBy],
  ]);

  const finalData = parseReportData(task.reportData);
  const { tableRows, photos, remarks } = splitReportFields(finalData, task.proofUrl);

  y = drawSectionTitle(ctx, y, "Checklist");

  const body =
    tableRows.length > 0
      ? tableRows.map(([key, val]) => {
        const stringVal = formatFieldValue(val);
        const isChecked = ["true", "yes", "ok", "good"].includes(stringVal.toLowerCase());
        return [humanizeKey(key), isChecked ? "Yes" : "No", stringVal, "-"];
      })
      : [["No data provided", "", "", ""]];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Action Point", "Checked", "Action Taken", "Est. Closure Date"]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.32 },
      1: { cellWidth: contentWidth * 0.13, halign: "center" },
      2: { cellWidth: contentWidth * 0.32 },
      3: { cellWidth: "auto" },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  y = ensureSpace(ctx, y, 40);
  y = drawSectionTitle(ctx, y, "Remarks");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.text);
  const remarksLines = doc.splitTextToSize(remarks || "-", contentWidth);
  doc.text(remarksLines, margin, y);
  y += remarksLines.length * 13 + 20;

  y = drawSignatureBlock(ctx, y);
  y += 10;

  y = await drawLocationSection(ctx, y, task.coordinates, task.location);
  y = await drawPhotosSection(ctx, y, photos);

  drawFooters(ctx, `Generated ${new Date().toLocaleString()} Â· Logicon`);

  doc.save(`Site_Visit_Report_${clientName.replace(/\s+/g, "_")}.pdf`);
};

/* ============================================================================
   MINUTES OF MEETING (MOM)
   ============================================================================ */

export const generateMOMPDF = async (task: TaskData, employeeName: string) => {
  const ctx = newContext();
  const { doc, margin, contentWidth } = ctx;

  let y = await drawHeader(ctx, "Minutes of Meeting");

  const clientName = task.clientName || "N/A";
  const siteName = task.location || task.taskName || "N/A";
  const reportCreatedBy = employeeName || task.employeeName || "N/A";

  y = drawMetadataTable(ctx, y, [
    ["Date", formatDate(task.isoTime, task.startTime)],
    ["Client", clientName],
    ["Site", siteName],
    ["Report Created By", reportCreatedBy],
  ]);

  y = drawSectionTitle(ctx, y, "Attendees");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Client Representative", "Logicon Representative"]],
    body: [
      ["N/A (Client)", reportCreatedBy],
      ["", reportCreatedBy],
    ],
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9.5, cellPadding: 7, textColor: COLORS.text, lineColor: COLORS.border },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  const finalData = parseReportData(task.reportData);
  const { tableRows, photos, remarks } = splitReportFields(finalData);

  y = ensureSpace(ctx, y, 40);
  y = drawSectionTitle(ctx, y, "Discussion Points");

  const body =
    tableRows.length > 0
      ? tableRows.map(([key, val]) => [humanizeKey(key), "Logicon", "WIP", formatFieldValue(val)])
      : [["No points discussed", "", "", ""]];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["MOM Point", "Action By", "Status", "Remarks"]],
    body,
    theme: "grid",
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 6, textColor: COLORS.text, lineColor: COLORS.border },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.3 },
      1: { cellWidth: contentWidth * 0.16 },
      2: { cellWidth: contentWidth * 0.16 },
      3: { cellWidth: "auto" },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 20;

  if (remarks) {
    y = ensureSpace(ctx, y, 40);
    y = drawSectionTitle(ctx, y, "Remarks");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.text);
    const remarksLines = doc.splitTextToSize(remarks, contentWidth);
    doc.text(remarksLines, margin, y);
    y += remarksLines.length * 13 + 20;
  }

  y = await drawLocationSection(ctx, y, task.coordinates, task.location);
  y = await drawPhotosSection(ctx, y, photos);

  drawFooters(ctx, `Generated ${new Date().toLocaleString()} Â· Logicon`);

  doc.save(`MOM_Report_${clientName.replace(/\s+/g, "_")}.pdf`);
};

/* ============================================================================
   TRAINING REPORT â€” Professional, data-driven layout
   Pages are created ONLY when there is data to show:
     â€¢ Always: Cover page (with bg image) + header on every page
     â€¢ Always: Training Detail table (the form fields, correctly parsed)
     â€¢ If photos exist: Photos page
     â€¢ If attendance uploads exist: Attendance page
     â€¢ If coordinates exist: Map page
     â€¢ Always: Sign-off page (with bg image bottom strip)
   ============================================================================ */

// Lightweight branded letterhead for inner pages (no bg image, just logo + rule)
const drawInnerPageHeader = (
  ctx: PDFContext,
  logoData: { dataUrl: string; width: number; height: number } | null,
  title: string,
  date: string
): number => {
  const { doc, margin, pageWidth } = ctx;

  // Navy top bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 52, "F");

  if (logoData) {
    const { width, height } = fitImage(logoData.width, logoData.height, 100, 32);
    doc.addImage(logoData.dataUrl, formatFromDataUrl(logoData.dataUrl), margin, 10, width, height);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageWidth - margin, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 235);
  doc.text(date, pageWidth - margin, 38, { align: "right" });

  return 68; // y-position after header
};

export const generateTrainingReportPDF = async (
  task: TaskData,
  employeeName: string,
  templateName = "Training Report",
  templateSchema?: any[]
) => {
  const ctx = newContext();
  const { doc, margin, contentWidth, pageWidth, pageHeight } = ctx;

  // â”€â”€ Pre-load assets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [logoData, coverBgData] = await Promise.all([
    fetchImageAsBase64("/logicon-logo.png"),
    fetchImageAsBase64("/training-cover-bg.png"),
  ]);

  const reportDate = formatDate(task.isoTime, task.startTime);
  const siteName   = task.location || task.taskName || "N/A";
  const createdBy  = employeeName || task.employeeName || "N/A";
  const clientName = task.clientName || "N/A";

  // â”€â”€ Parse report data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // We get the raw keyâ†’value map from the submitted form
  const rawData = parseReportData(task.reportData);

  // If we have the schema, use it to get the ordered list of labels + values
  // so we show "Trainer Name" not "field_1783689456767"
  let formRows: { label: string; value: string; isImage: boolean }[] = [];
  const photos: { label: string; url: string }[] = [];
  const attendancePhotos: { label: string; url: string }[] = [];

  if (templateSchema && templateSchema.length > 0) {
    for (const field of templateSchema) {
      const fieldId: string = field.id || field.field_id || "";
      const label: string  = field.label || humanizeKey(fieldId);
      // Try the field id, then the label as key
      const rawVal = rawData[fieldId] ?? rawData[label] ?? rawData[humanizeKey(fieldId)];
      if (rawVal === undefined || rawVal === null || rawVal === "") continue;

      if (isImageUrl(rawVal)) {
        const lbl = label.toLowerCase();
        if (lbl.includes("attendance") || lbl.includes("register") || lbl.includes("sheet")) {
          attendancePhotos.push({ label, url: rawVal as string });
        } else {
          photos.push({ label, url: rawVal as string });
        }
      } else if (typeof rawVal === "object" && rawVal !== null) {
        const v = rawVal as Record<string, unknown>;
        // Extract nested images
        for (const imgKey of ["photo", "image", "attachment"]) {
          if (v[imgKey] && isImageUrl(v[imgKey])) {
            photos.push({ label: `${label} Photo`, url: v[imgKey] as string });
          }
        }
        formRows.push({ label, value: formatFieldValue(rawVal), isImage: false });
      } else {
        formRows.push({ label, value: String(rawVal), isImage: false });
      }
    }
  }

  // Fallback: no schema provided â€” use raw keys
  if (formRows.length === 0 && Object.keys(rawData).length > 0) {
    for (const [key, val] of Object.entries(rawData)) {
      if (key === "remarks" || key === "_attachmentUrl" || key === "_attendanceUrl") continue;
      if (isImageUrl(val)) {
        const lbl = key.toLowerCase();
        if (lbl.includes("attendance") || lbl.includes("register")) {
          attendancePhotos.push({ label: humanizeKey(key), url: val as string });
        } else {
          photos.push({ label: humanizeKey(key), url: val as string });
        }
      } else {
        formRows.push({ label: humanizeKey(key), value: formatFieldValue(val), isImage: false });
      }
    }
  }

  // Add proof photo as first photo if available and not already in list
  if (task.proofUrl && !photos.find(p => p.url === task.proofUrl)) {
    photos.unshift({ label: "Training Proof", url: task.proofUrl });
  }

  const remarks = typeof rawData.remarks === "string" ? rawData.remarks : "";

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE 1 â€” COVER PAGE (background image + overlay)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // Full-page navy background fallback
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Cover background image (right half overlay, semi-transparent via opacity trick)
  if (coverBgData) {
    // Draw on right 60% of the page
    const imgW = pageWidth * 0.62;
    const { width: fw, height: fh } = fitImage(coverBgData.width, coverBgData.height, imgW, pageHeight);
    doc.addImage(coverBgData.dataUrl, formatFromDataUrl(coverBgData.dataUrl), pageWidth - fw, 0, fw, fh);
    // Dark gradient overlay (left-to-right navy fade) â€” draw a left panel
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth * 0.45, pageHeight, "F");
    // Blend strip
    doc.setFillColor(21, 41, 92);
    doc.rect(pageWidth * 0.42, 0, pageWidth * 0.1, pageHeight, "F");
  }

  // Logicon logo (top-left)
  if (logoData) {
    const { width, height } = fitImage(logoData.width, logoData.height, 130, 48);
    doc.addImage(logoData.dataUrl, formatFromDataUrl(logoData.dataUrl), margin, margin, width, height);
  }

  // Logicon wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(180, 195, 230);
  doc.text("LOGICON ENTERPRISE", margin, margin + 60);

  // Decorative gold accent line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(3);
  doc.line(margin, pageHeight * 0.38, margin + 200, pageHeight * 0.38);

  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text("TRAINING", margin, pageHeight * 0.44);
  doc.text("REPORT", margin, pageHeight * 0.44 + 36);

  // Template sub-title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(180, 195, 230);
  doc.text(templateName, margin, pageHeight * 0.44 + 62);

  // Metadata pills at bottom-left
  const metaY = pageHeight * 0.68;
  const metaItems: [string, string][] = [
    ["PREPARED BY", createdBy],
    ["SITE / LOCATION", siteName],
    ["DATE", reportDate],
    ["CLIENT", clientName],
  ];

  let my = metaY;
  for (const [label, value] of metaItems) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(212, 175, 55); // gold label
    doc.text(label, margin, my);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(230, 235, 245);
    const lines = doc.splitTextToSize(value, 200);
    doc.text(lines, margin, my + 12);
    my += 12 + lines.length * 12 + 6;
  }

  // Bottom bar
  doc.setFillColor(12, 24, 58);
  doc.rect(0, pageHeight - 36, pageWidth, 36, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 165, 200);
  doc.text(`Confidential Â· ${new Date().getFullYear()} Logicon Enterprise`, margin, pageHeight - 16);
  doc.text(reportDate, pageWidth - margin, pageHeight - 16, { align: "right" });

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE 2 â€” TRAINING DETAILS (form data table)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  doc.addPage();
  let y = drawInnerPageHeader(ctx, logoData, templateName, reportDate);

  y = drawSectionTitle(ctx, y, "Training Details");

  if (formRows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Field", "Value"]],
      body: formRows.map(r => [r.label, r.value]),
      theme: "grid",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9.5,
        cellPadding: 8,
      },
      styles: {
        fontSize: 9.5,
        cellPadding: 7,
        textColor: COLORS.text,
        lineColor: COLORS.border,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.38, fontStyle: "bold", textColor: [60, 70, 90] },
        1: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [245, 247, 252] },
    });
    y = (doc as any).lastAutoTable.finalY + 24;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text("No training data was submitted for this checklist.", margin, y + 16);
    y += 40;
  }

  // Remarks â€” on same page if space allows
  if (remarks) {
    y = ensureSpace(ctx, y, 80);
    y = drawSectionTitle(ctx, y, "Remarks / Observations");
    doc.setFillColor(245, 247, 252);
    doc.roundedRect(margin, y, contentWidth, Math.max(60, remarks.length * 0.3), 4, 4, "F");
    doc.setDrawColor(...COLORS.border);
    doc.roundedRect(margin, y, contentWidth, Math.max(60, remarks.length * 0.3), 4, 4, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.text);
    const rLines = doc.splitTextToSize(remarks, contentWidth - 16);
    doc.text(rLines, margin + 8, y + 14);
    y += Math.max(60, remarks.length * 0.3) + 24;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE 3 â€” PHOTOS (only if photos exist)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (photos.length > 0) {
    doc.addPage();
    y = drawInnerPageHeader(ctx, logoData, templateName, reportDate);
    y = drawSectionTitle(ctx, y, "Training Photos");
    y = await drawPhotosSection(ctx, y, photos);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE â€” ATTENDANCE REGISTER (only if attendance uploads exist)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (attendancePhotos.length > 0) {
    doc.addPage();
    y = drawInnerPageHeader(ctx, logoData, templateName, reportDate);
    y = drawSectionTitle(ctx, y, "Training Attendance Register");
    y = await drawPhotosSection(ctx, y, attendancePhotos);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // PAGE â€” LOCATION MAP (only if coordinates exist)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (task.coordinates?.lat && task.coordinates?.lng) {
    doc.addPage();
    y = drawInnerPageHeader(ctx, logoData, templateName, reportDate);
    y = await drawLocationSection(ctx, y, task.coordinates, siteName);
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // LAST PAGE â€” SIGN-OFF (navy background with bg image, same as cover)
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  doc.addPage();

  // Reuse cover background on sign-off page
  doc.setFillColor(245, 247, 252);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top navy strip
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 60, "F");

  if (logoData) {
    const { width, height } = fitImage(logoData.width, logoData.height, 110, 36);
    doc.addImage(logoData.dataUrl, formatFromDataUrl(logoData.dataUrl), margin, 12, width, height);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("SIGN-OFF & AUTHORISATION", pageWidth - margin, 32, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 200, 235);
  doc.text(templateName + " Â· " + reportDate, pageWidth - margin, 46, { align: "right" });

  y = 80;

  // Sign-off summary box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, contentWidth, 100, 6, 6, "F");
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, y, contentWidth, 100, 6, 6, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text("PREPARED BY", margin + 16, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.text(createdBy, margin + 16, y + 36);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text("DATE", margin + 16, y + 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.text(reportDate, margin + 16, y + 72);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  doc.text("SITE / LOCATION", pageWidth / 2 + 16, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  const siteLines = doc.splitTextToSize(siteName, contentWidth / 2 - 24);
  doc.text(siteLines, pageWidth / 2 + 16, y + 36);

  y += 120;

  // Signature table
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Trainer / Presenter", "Manager / Operations", "Client Representative"]],
    body: [[createdBy, "", ""]],
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 8,
    },
    styles: {
      fontSize: 10,
      cellPadding: 0,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      minCellHeight: 60,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: "auto" },
      2: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      // Make body cells light background
      if (data.section === "body") {
        data.cell.styles.fillColor = [250, 250, 255];
      }
    }
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Signature note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("Signatures above confirm the accuracy of the report contents.", margin, y);

  // Bottom navy footer on sign-off page with bg image
  if (coverBgData) {
    const footerH = 140;
    const imgW = pageWidth * 0.5;
    const { width: fw, height: fh } = fitImage(coverBgData.width, coverBgData.height, imgW, footerH);
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - footerH, pageWidth, footerH, "F");
    doc.addImage(coverBgData.dataUrl, formatFromDataUrl(coverBgData.dataUrl), pageWidth - fw, pageHeight - fh, fw, fh);
    // Overlay half
    doc.setFillColor(21, 41, 92);
    doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
    doc.rect(0, pageHeight - footerH, pageWidth * 0.55, footerH, "F");
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("LOGICON ENTERPRISE", margin, pageHeight - footerH + 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 235);
    doc.text("Safety Â· Quality Â· Excellence", margin, pageHeight - footerH + 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 160, 200);
    doc.text(`Document generated: ${new Date().toLocaleString()}`, margin, pageHeight - footerH + 68);
  }

  // â”€â”€ Page footers (all pages) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  drawFooters(ctx, `Logicon Enterprise Â· ${templateName} Â· ${reportDate}`);

  const safeDate = new Date().toISOString().slice(0, 10);
  doc.save(`Training_Report_${safeDate}.pdf`);
};

