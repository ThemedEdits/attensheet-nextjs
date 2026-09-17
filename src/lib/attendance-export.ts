import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportStudent {
  uid: string;
  seatNumber?: string;
  fullName?: string;
  fatherName?: string;
}

export interface ExportAttendanceRecord {
  studentUid: string;
  date: string; // YYYY-MM-DD
  present: boolean;
}

export interface ExportMetadata {
  className: string;
  subjectName: string;
  university?: string;
  department?: string;
  section?: string;
  semester?: string;
  teacherName?: string;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

export function buildAttendanceFileName(
  className: string,
  subjectName: string,
  ext: "xlsx" | "pdf"
): string {
  const cleanClass = sanitizeFileName(className || "Class");
  const cleanSubject = sanitizeFileName(subjectName || "Subject");
  return `${cleanClass} - ${cleanSubject} - Attendance.${ext}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [, month, day] = parts;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${months[mIdx] || month}`;
  }
  return dateStr;
}

export function exportAttendanceToExcel({
  metadata,
  students,
  attendanceRecords,
}: {
  metadata: ExportMetadata;
  students: ExportStudent[];
  attendanceRecords: ExportAttendanceRecord[];
}) {
  const fileName = buildAttendanceFileName(metadata.className, metadata.subjectName, "xlsx");

  // Distinct sorted lecture dates
  const dates = Array.from(new Set(attendanceRecords.map((r) => r.date))).sort();

  // Sort students by seat number
  const sortedStudents = [...students].sort((a, b) => {
    const seatA = (a.seatNumber || "").toUpperCase();
    const seatB = (b.seatNumber || "").toUpperCase();
    return seatA.localeCompare(seatB, undefined, { numeric: true, sensitivity: "base" });
  });

  // Fast lookup map: key = `${studentUid}_${date}` => boolean
  const recordMap = new Map<string, boolean>();
  for (const r of attendanceRecords) {
    recordMap.set(`${r.studentUid}_${r.date}`, r.present);
  }

  // Build rows for SheetJS
  const rows: (string | number)[][] = [];

  // Header metadata rows
  rows.push([`${metadata.university || "University"} - Department of ${metadata.department || "Academic Department"}`]);
  rows.push([`COURSE ATTENDANCE REGISTER: ${metadata.subjectName.toUpperCase()}`]);
  rows.push([
    `Class: ${metadata.className || "N/A"}${metadata.section ? ` (Sec ${metadata.section})` : ""}${
      metadata.semester ? ` | ${metadata.semester}` : ""
    } | Instructor: ${metadata.teacherName || "Not Assigned"} | Generated: ${new Date().toLocaleDateString()}`,
  ]);
  rows.push([]); // blank separator

  // Table Column Headers
  const headerRow: string[] = [
    "S.No",
    "Seat Number",
    "Student Name",
    "Father Name",
    ...dates.map((d) => formatDisplayDate(d)),
    "Held",
    "Present",
    "Absent",
    "Percentage",
  ];
  rows.push(headerRow);

  // Student rows
  const datePresentTotals: number[] = new Array(dates.length).fill(0);
  let grandPresentCount = 0;
  let grandTotalClasses = 0;

  sortedStudents.forEach((student, index) => {
    let presentCount = 0;
    let recordedClasses = 0;

    const dateStatuses = dates.map((date, dateIdx) => {
      const key = `${student.uid}_${date}`;
      const hasRecord = recordMap.has(key);
      if (hasRecord) {
        recordedClasses++;
        const isPresent = recordMap.get(key) === true;
        if (isPresent) {
          presentCount++;
          datePresentTotals[dateIdx] = (datePresentTotals[dateIdx] || 0) + 1;
          return "P";
        }
        return "A";
      }
      return "—";
    });

    const totalLectures = dates.length || recordedClasses;
    const absentCount = totalLectures - presentCount;
    const percentage = totalLectures > 0 ? Math.round((presentCount / totalLectures) * 100) : 100;

    grandPresentCount += presentCount;
    grandTotalClasses += totalLectures;

    rows.push([
      index + 1,
      student.seatNumber || "—",
      student.fullName || "Unnamed Student",
      student.fatherName || "—",
      ...dateStatuses,
      totalLectures,
      presentCount,
      absentCount,
      `${percentage}%`,
    ]);
  });

  // Summary Row
  if (sortedStudents.length > 0) {
    const overallPercentage =
      grandTotalClasses > 0 ? `${Math.round((grandPresentCount / grandTotalClasses) * 100)}%` : "100%";
    const summaryRow: (string | number)[] = [
      "Total",
      `Students: ${sortedStudents.length}`,
      "",
      "",
      ...datePresentTotals.map((p) => `${p} P`),
      grandTotalClasses,
      grandPresentCount,
      grandTotalClasses - grandPresentCount,
      overallPercentage,
    ];
    rows.push([]);
    rows.push(summaryRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 6 }, // S.No
    { wch: 16 }, // Seat Number
    { wch: 28 }, // Full Name
    { wch: 24 }, // Father Name
    ...dates.map(() => ({ wch: 10 })), // Date columns
    { wch: 8 }, // Held
    { wch: 9 }, // Present
    { wch: 9 }, // Absent
    { wch: 14 }, // Percentage
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, fileName);
}

export function exportAttendanceToPdf({
  metadata,
  students,
  attendanceRecords,
}: {
  metadata: ExportMetadata;
  students: ExportStudent[];
  attendanceRecords: ExportAttendanceRecord[];
}) {
  const fileName = buildAttendanceFileName(metadata.className, metadata.subjectName, "pdf");

  // Distinct sorted lecture dates
  const dates = Array.from(new Set(attendanceRecords.map((r) => r.date))).sort();

  // Sort students by seat number
  const sortedStudents = [...students].sort((a, b) => {
    const seatA = (a.seatNumber || "").toUpperCase();
    const seatB = (b.seatNumber || "").toUpperCase();
    return seatA.localeCompare(seatB, undefined, { numeric: true, sensitivity: "base" });
  });

  // Fast lookup map
  const recordMap = new Map<string, boolean>();
  for (const r of attendanceRecords) {
    recordMap.set(`${r.studentUid}_${r.date}`, r.present);
  }

  // Use landscape orientation for attendance tables
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${metadata.subjectName.toUpperCase()} — ATTENDANCE REGISTER`, 14, 11);

  // Subtitle / Institution
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  const institution = [metadata.university, metadata.department].filter(Boolean).join(" • ");
  doc.text(institution || "University Attendance Management", 14, 18);

  // Class & Teacher details
  const classDetails = [
    metadata.className ? `Class: ${metadata.className}` : "",
    metadata.section ? `Sec: ${metadata.section}` : "",
    metadata.semester ? `Sem: ${metadata.semester}` : "",
    metadata.teacherName ? `Instructor: Prof. ${metadata.teacherName}` : "Instructor: Unassigned",
    `Exported: ${new Date().toLocaleDateString()}`,
  ]
    .filter(Boolean)
    .join("  |  ");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(classDetails, 14, 24);

  // Prepare table headers
  const head = [
    [
      "#",
      "Seat No",
      "Student Name",
      "Father Name",
      ...dates.map((d) => formatDisplayDate(d)),
      "Total",
      "P",
      "A",
      "%",
    ],
  ];

  // Prepare table body
  const datePresentTotals: number[] = new Array(dates.length).fill(0);
  let grandPresentCount = 0;
  let grandTotalClasses = 0;

  const body = sortedStudents.map((student, index) => {
    let presentCount = 0;

    const dateStatuses = dates.map((date, dateIdx) => {
      const key = `${student.uid}_${date}`;
      const hasRecord = recordMap.has(key);
      if (hasRecord) {
        const isPresent = recordMap.get(key) === true;
        if (isPresent) {
          presentCount++;
          datePresentTotals[dateIdx] = (datePresentTotals[dateIdx] || 0) + 1;
          return "P";
        }
        return "A";
      }
      return "—";
    });

    const totalLectures = dates.length;
    const absentCount = totalLectures - presentCount;
    const percentage = totalLectures > 0 ? Math.round((presentCount / totalLectures) * 100) : 100;

    grandPresentCount += presentCount;
    grandTotalClasses += totalLectures;

    return [
      String(index + 1),
      student.seatNumber || "—",
      student.fullName || "Unnamed",
      student.fatherName || "—",
      ...dateStatuses,
      String(totalLectures),
      String(presentCount),
      String(absentCount),
      `${percentage}%`,
    ];
  });

  // Table Footer
  const overallPercentage =
    grandTotalClasses > 0 ? `${Math.round((grandPresentCount / grandTotalClasses) * 100)}%` : "100%";
  const foot = [
    [
      "",
      `Total: ${sortedStudents.length}`,
      "",
      "",
      ...datePresentTotals.map((p) => `${p} P`),
      String(grandTotalClasses),
      String(grandPresentCount),
      String(grandTotalClasses - grandPresentCount),
      overallPercentage,
    ],
  ];

  // Render Table
  autoTable(doc, {
    head,
    body,
    foot: sortedStudents.length > 0 ? foot : undefined,
    startY: 32,
    margin: { left: 10, right: 10, bottom: 16 },
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 }, // #
      1: { halign: "center", cellWidth: 20 }, // Seat No
      2: { cellWidth: 32 }, // Name
      3: { cellWidth: 28 }, // Father Name
    },
    didParseCell: (data) => {
      // Style Present 'P' as emerald and Absent 'A' as rose
      if (data.section === "body") {
        if (data.cell.raw === "P") {
          data.cell.styles.textColor = [16, 185, 129]; // emerald-500
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        } else if (data.cell.raw === "A") {
          data.cell.styles.textColor = [239, 68, 68]; // red-500
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        } else if (data.cell.raw === "—") {
          data.cell.styles.textColor = [148, 163, 184];
          data.cell.styles.halign = "center";
        }
      }
    },
    didDrawPage: (data) => {
      // Footer text on each page
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        "AttenSheet • University Attendance Management Platform",
        10,
        pageHeight - 6
      );
      const pageNumberStr = `Page ${data.pageNumber}`;
      doc.text(pageNumberStr, pageWidth - 20, pageHeight - 6);
    },
  });

  doc.save(fileName);
}
