import Shield from "lucide-react/dist/esm/icons/shield";
import Users from "lucide-react/dist/esm/icons/users";
import FileText from "lucide-react/dist/esm/icons/file-text";
import CalendarOff from "lucide-react/dist/esm/icons/calendar-off";
import UserMinus from "lucide-react/dist/esm/icons/user-minus";
import HeartCrack from "lucide-react/dist/esm/icons/heart-crack";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { DocumentTemplate } from "../types";

export const templates: DocumentTemplate[] = [
  {
    id: "police",
    name: "Police Complaint",
    icon: "Shield",
    description: "Legal complaint filed with local law enforcement.",
    placeholders: ["{{name}}", "{{address}}", "{{phone}}", "{{subject}}", "{{body}}", "{{date}}"],
  },
  {
    id: "public",
    name: "Public Grievance",
    icon: "Users",
    description: "Official public petition filed with district administration.",
    placeholders: ["{{name}}", "{{address}}", "{{phone}}", "{{subject}}", "{{body}}", "{{date}}"],
  },
  {
    id: "general",
    name: "General Complaint",
    icon: "FileText",
    description: "A standard legal petition to private corporations or service providers.",
    placeholders: ["{{name}}", "{{address}}", "{{phone}}", "{{subject}}", "{{body}}", "{{date}}"],
  },
  {
    id: "leave",
    name: "Leave Letter",
    icon: "CalendarOff",
    description: "Formal job/school leave application due to illness or  emergency.",
    placeholders: ["{{name}}", "{{phone}}", "{{subject}}", "{{body}}", "{{date}}"],
  },
  {
    id: "resignation",
    name: "Resignation Letter",
    icon: "UserMinus",
    description: "A professional resignation notice adhering to standard official exit policies.",
    placeholders: ["{{name}}", "{{phone}}", "{{subject}}", "{{body}}", "{{date}}"],
  },
  {
    id: "divorce",
    name: "Divorce Notice",
    icon: "HeartCrack",
    description: "Official pre-litigation legal notification sent regarding legal separation.",
    placeholders: ["{{name}}", "{{address}}", "{{phone}}", "{{subject}}", "{{body}}", "{{date}}"],
  },
];

interface TemplateGridProps {
  selectedTemplateId: string | null;
  onSelect: (id: string) => void;
}

export default function TemplateGrid({ selectedTemplateId, onSelect }: TemplateGridProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Shield":
        return <Shield className="h-5 w-5 text-emerald-500" />;
      case "Users":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "FileText":
        return <FileText className="h-5 w-5 text-indigo-500" />;
      case "CalendarOff":
        return <CalendarOff className="h-5 w-5 text-amber-500" />;
      case "UserMinus":
        return <UserMinus className="h-5 w-5 text-rose-500" />;
      case "HeartCrack":
        return <HeartCrack className="h-5 w-5 text-purple-500" />;
      default:
        return <FileText className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
          Select Document Template
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          MANU AI will optimize writing style to suit the selected official category
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          return (
            <button
              id={`template-btn-${tpl.id}`}
              key={tpl.id}
              type="button"
              onClick={() => {
                console.log("Template selected in Grid:", tpl.id);
                onSelect(tpl.id);
              }}
              className={`flex items-start text-left p-4 rounded-xl border transition-all cursor-pointer select-none hover:shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                isSelected
                  ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 ring-1 ring-indigo-500 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg mr-4 shrink-0 shadow-sm border border-slate-200/50 dark:border-slate-700/50 pointer-events-none">
                {getIcon(tpl.icon)}
              </div>
              <div className="flex-1 min-w-0 pointer-events-none">
                <div className="flex items-center justify-between gap-1 mb-1 pointer-events-none">
                  <h4 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-sm truncate pointer-events-none">
                    {tpl.name}
                  </h4>
                  <ChevronRight className={`h-4 w-4 transition-transform pointer-events-none ${isSelected ? "text-indigo-500 translate-x-0.5" : "text-slate-400"}`} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed pointer-events-none">
                  {tpl.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
