export interface FallbackComplaintOutput {
  title: string;
  subject: string;
  body: string;
}

export interface MissingFieldSuggestion {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "date";
}

function normalizeText(value: string): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function createSummary(rawInput: string): string {
  const normalized = normalizeText(rawInput);
  if (!normalized) {
    return "the matter described by the applicant";
  }

  const sentence = normalized.split(/[.!?]+/).map((part) => part.trim()).find(Boolean) || normalized;
  return sentence.length > 180 ? `${sentence.slice(0, 177)}...` : sentence;
}

function formatProfileLine(profile: any): string {
  const parts: string[] = [];
  if (profile?.name) parts.push(`Applicant Name: ${profile.name}`);
  if (profile?.address) parts.push(`Address: ${profile.address}`);
  if (profile?.district || profile?.state) parts.push(`Location: ${[profile?.district, profile?.state].filter(Boolean).join(", ")}`);
  if (profile?.phone) parts.push(`Phone: ${profile.phone}`);
  if (profile?.email) parts.push(`Email: ${profile.email}`);
  return parts.join("; ");
}

export function buildFallbackComplaint(rawInput: string, templateName: string, profile: any, language = "English"): FallbackComplaintOutput {
  const summary = createSummary(rawInput);
  const templateLabel = normalizeText(templateName) || "General Complaint";
  const profileLine = formatProfileLine(profile);
  const titlePrefix = templateLabel.includes("Police")
    ? "Official Complaint"
    : templateLabel.includes("Grievance")
      ? "Public Grievance"
      : "Formal Complaint";

  if ((language || "").toLowerCase().includes("tamil")) {
    return {
      title: `${titlePrefix} - ${templateLabel}`,
      subject: "அரசு துறையின் தலையீடு மற்றும் உரிய நடவடிக்கை கோரிக்கை",
      body: [
        `அன்புள்ள அதிகாரிகள்,`,
        `நான் ${profile?.name || "விண்ணப்பதாரர்"} என்பவர், இந்த மனுவை ${templateLabel} தொடர்பாக சமர்ப்பிக்கிறேன்.`,
        `விண்ணப்பதாரர் தெரிவித்த விவரம் இதோ: ${summary}.`,
        profileLine ? `விண்ணப்பதாரரின் விவரங்கள்: ${profileLine}.` : "",
        "இந்த விஷயத்தை பரிசீலித்து உரிய நிர்வாக அல்லது சட்ட நடவடிக்கை எடுக்குமாறு கேட்டுக் கொள்கிறேன்."
      ].filter(Boolean).join("\n\n"),
    };
  }

  return {
    title: `${titlePrefix} Regarding ${templateLabel}`,
    subject: `Request for administrative review and appropriate action regarding the reported matter`,
    body: [
      `To the concerned authority,`,
      `I, ${profile?.name || "the applicant"}, hereby submit this ${templateLabel.toLowerCase()} for your consideration.`,
      `The matter reported by the applicant is as follows: ${summary}.`,
      profileLine ? `Applicant details provided for record: ${profileLine}.` : "",
      "The applicant respectfully requests that the matter be examined and appropriate administrative or legal action be taken without undue delay."
    ].filter(Boolean).join("\n\n"),
  };
}

export function analyzeMissingFieldsFallback(rawInput: string, templateName: string): { needsMoreDetails: boolean; missingFields: MissingFieldSuggestion[]; reason: string } {
  const normalized = normalizeText(rawInput).toLowerCase();
  const template = normalizeText(templateName).toLowerCase();
  const missingFields: MissingFieldSuggestion[] = [];

  if (template.includes("police")) {
    if (!/(date|time|incident|occurred|on|at|during)/.test(normalized)) {
      missingFields.push({
        key: "incidentDate",
        label: "Incident Date and Time",
        placeholder: "e.g., 12 June 2026 at 7:30 PM",
        type: "text"
      });
    }
    if (!/(location|place|address|near|at)/.test(normalized)) {
      missingFields.push({
        key: "incidentLocation",
        label: "Incident Location",
        placeholder: "e.g., Main Road, Near Market",
        type: "text"
      });
    }
  }

  if (template.includes("grievance") || template.includes("public")) {
    if (!/(ward|municipality|locality|department|office|authority)/.test(normalized)) {
      missingFields.push({
        key: "departmentName",
        label: "Department or Office Name",
        placeholder: "e.g., Municipal Office",
        type: "text"
      });
    }
  }

  if (template.includes("leave")) {
    if (!/(from|to|start|end|date|duration)/.test(normalized)) {
      missingFields.push({
        key: "leaveDuration",
        label: "Leave Duration",
        placeholder: "e.g., 10 June 2026 to 12 June 2026",
        type: "text"
      });
    }
  }

  return {
    needsMoreDetails: missingFields.length > 0,
    missingFields,
    reason: missingFields.length > 0
      ? "Additional administrative details would help structure the complaint more precisely."
      : "The provided input appears sufficient for drafting the complaint."
  };
}
