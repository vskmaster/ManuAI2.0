import { useState, useEffect } from "react";
const API_BASE = import.meta.env.VITE_API_URL ?? "";
const apiUrl = (p: string) => { const base = API_BASE.replace(/\/$/, ""); return `${base}${p.startsWith("/") ? p : `/${p}`}`; };
import { Search, Calendar, FileText, ArrowDownToLine, Trash2, Eye, ExternalLink, Clock, FolderGit2 } from "lucide-react";
import { GeneratedDocument } from "../types";

interface ComplaintHistoryProps {
  onSelectComplaint: (complaint: any) => void;
}

export default function ComplaintHistory({ onSelectComplaint }: ComplaintHistoryProps) {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/complaints"));
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      }
    } catch (e) {
      console.error("Error fetching complaints history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    const searchLower = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(searchLower) ||
      c.subject?.toLowerCase().includes(searchLower) ||
      c.templateId?.toLowerCase().includes(searchLower)
    );
  });

  const downloadFile = async (complaint: any, type: "pdf" | "docx") => {
    try {
      const response = await fetch(apiUrl(`/api/generate-${type}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
                templateId: complaint.templateId || "",
                title: complaint.title,
                subject: complaint.subject,
                body: complaint.body,
                profile: complaint.profile,
                date: new Date(complaint.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" }),
                evidenceImages: complaint.evidenceImages || [],
              }),
            });

      if (!response.ok) throw new Error(`Failed to generate ${type}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MANU_AI_${complaint.title.replace(/\s+/g, "_")}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div id="complaint-history-module" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 text-xl">
            Citizen Grievance Records
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View, review, and download historically generated legal complaint drafts.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-3" />
          <p className="text-sm">Accessing regional ledger archives...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="mx-auto bg-slate-100 dark:bg-slate-800 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-3">
            <FolderGit2 className="h-5 w-5 text-slate-400" />
          </div>
          <h4 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
            No Records Found
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {search ? "No matches found for your filter." : "You haven't generated any complaints yet. Start dictating a petition in the Generator."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredComplaints.map((c) => {
            const dateStr = new Date(c.createdAt).toLocaleDateString("en-IN", {
              dateStyle: "medium",
            });
            const timeStr = new Date(c.createdAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-100 dark:border-indigo-900">
                      {c.templateId}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{dateStr}</span>
                      <Clock className="h-3.5 w-3.5 ml-1" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base mb-1 truncate">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic leading-relaxed">
                    "{c.subject}"
                  </p>
                  
                  {c.evidenceImages && c.evidenceImages.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{c.evidenceImages.length} Supporting Image(s) attached</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800/60 md:border-t-0 pt-3 md:pt-0">
                  <button
                    type="button"
                    onClick={() => onSelectComplaint(c)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Review Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadFile(c, "pdf")}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadFile(c, "docx")}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg transition-colors"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    <span>DOCX</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
