export interface UserProfile {
  name: string;
  fatherName: string;
  dob: string;
  gender: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  placeholders: string[];
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  title: string;
  subject: string;
  body: string;
  createdAt: string;
  evidenceCount: number;
}
