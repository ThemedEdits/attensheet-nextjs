"use client";

import { useState } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  ExternalLink, 
  Download, 
  Loader2, 
  X, 
  GraduationCap, 
  Calendar,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authHeaders } from "@/lib/client-auth";
import { readApiResponse } from "@/lib/client-response";
import { useToast } from "@/components/ToastProvider";
import { 
  exportAttendanceToExcel, 
  exportAttendanceToPdf, 
  type ExportStudent, 
  type ExportAttendanceRecord, 
  type ExportMetadata 
} from "@/lib/attendance-export";

export interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: {
    id: string;
    name: string;
    teacherName?: string;
    googleSheetTabId?: number | string;
  };
  classRecord: {
    id: string;
    className?: string;
    university?: string;
    department?: string;
    section?: string;
    semester?: string;
    spreadsheetId?: string;
  };
  preloadedData?: {
    students: ExportStudent[];
    attendance: ExportAttendanceRecord[];
  };
}

export function DownloadAttendanceModal({
  isOpen,
  onClose,
  subject,
  classRecord,
  preloadedData,
}: DownloadModalProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<"excel" | "pdf" | null>(null);
  const toast = useToast();

  if (!isOpen) return null;

  async function fetchExportData(): Promise<{
    students: ExportStudent[];
    attendance: ExportAttendanceRecord[];
  }> {
    if (preloadedData) {
      return preloadedData;
    }

    const response = await fetch(
      `/api/attendance?classId=${encodeURIComponent(classRecord.id)}&subjectId=${encodeURIComponent(
        subject.id
      )}&all=true`,
      { headers: await authHeaders() }
    );
    const result = await readApiResponse(response);
    if (!response.ok) {
      throw new Error(String(result.error ?? "Failed to load attendance records."));
    }

    return {
      students: (result.students ?? []) as ExportStudent[],
      attendance: (result.attendance ?? []) as ExportAttendanceRecord[],
    };
  }

  const metadata: ExportMetadata = {
    className: classRecord.className || "Class",
    subjectName: subject.name,
    university: classRecord.university,
    department: classRecord.department,
    section: classRecord.section,
    semester: classRecord.semester,
    teacherName: subject.teacherName,
  };

  async function handleDownloadExcel() {
    setDownloadingFormat("excel");
    try {
      const data = await fetchExportData();
      exportAttendanceToExcel({
        metadata,
        students: data.students,
        attendanceRecords: data.attendance,
      });
      toast("Excel attendance sheet downloaded successfully!", "success");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate Excel sheet.", "error");
    } finally {
      setDownloadingFormat(null);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingFormat("pdf");
    try {
      const data = await fetchExportData();
      exportAttendanceToPdf({
        metadata,
        students: data.students,
        attendanceRecords: data.attendance,
      });
      toast("PDF attendance sheet generated and downloaded!", "success");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate PDF document.", "error");
    } finally {
      setDownloadingFormat(null);
    }
  }

  function handleOpenGoogleSheet() {
    if (!classRecord.spreadsheetId) {
      toast("Google Sheet is not yet connected for this class.", "error");
      return;
    }
    const tabId = subject.googleSheetTabId ?? 0;
    const url = `https://docs.google.com/spreadsheets/d/${classRecord.spreadsheetId}/edit#gid=${tabId}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast("Opening Google Sheet tab...", "info");
    onClose();
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-lg rounded-2xl border border-[var(--border-hover)] bg-[var(--surface)] p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 pb-4 sm:pb-5 border-b border-[var(--border)] pr-8 flex-none">
          <div className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)] flex-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                Export Attendance
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">{subject.name}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
              {classRecord.className || "Class"}
              {classRecord.section ? ` (Sec ${classRecord.section})` : ""}
              {classRecord.semester ? ` • ${classRecord.semester}` : ""}
            </p>
          </div>
        </div>

        {/* Options List */}
        <div className="mt-4 sm:mt-5 space-y-3 overflow-y-auto flex-1 pr-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Choose your preferred export format:
          </p>

          {/* Option 1: Excel */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 sm:p-4 hover:border-[var(--border-hover)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm hover:shadow-lg hover:shadow-black/20">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-none mt-0.5 sm:mt-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <FileSpreadsheet className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-white leading-snug">Excel Spreadsheet (.xlsx)</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  Complete attendance ledger with lecture dates, student roster, and totals.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={handleDownloadExcel}
              className="button-secondary text-xs px-3.5 py-2.5 sm:py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto flex-none text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 cursor-pointer shadow-sm"
            >
              {downloadingFormat === "excel" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>

          {/* Option 2: PDF */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 sm:p-4 hover:border-[var(--border-hover)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm hover:shadow-lg hover:shadow-black/20">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-none mt-0.5 sm:mt-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <FileText className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-white leading-snug">PDF Document (.pdf)</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  Clean printable document styled with institutional headers and statistics.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={handleDownloadPdf}
              className="button-secondary text-xs px-3.5 py-2.5 sm:py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto flex-none text-rose-400 hover:text-rose-300 hover:border-rose-500/40 cursor-pointer shadow-sm"
            >
              {downloadingFormat === "pdf" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>

          {/* Option 3: Google Sheets */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 sm:p-4 hover:border-[var(--border-hover)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm hover:shadow-lg hover:shadow-black/20">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex-none mt-0.5 sm:mt-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <ExternalLink className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-white leading-snug">Google Sheet</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  Open live synchronized cloud sheet in Google Sheets tab.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={Boolean(downloadingFormat)}
              onClick={handleOpenGoogleSheet}
              className="button-secondary text-xs px-3.5 py-2.5 sm:py-2 flex items-center justify-center gap-1.5 w-full sm:w-auto flex-none text-sky-400 hover:text-sky-300 hover:border-sky-500/40 cursor-pointer shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Sheet</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-[var(--text-muted)] flex-none">
          <span className="truncate max-w-full text-[11px] sm:text-xs">
            File: {classRecord.className || "Class"} - {subject.name} - Attendance
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors self-end sm:self-auto cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
