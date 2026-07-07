import React, { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Calendar, Heart, Save, AlertCircle, ShieldCheck } from "lucide-react";
import { UserProfile } from "../types";

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  onProfileSave: (profile: UserProfile) => void;
}

export default function ProfileForm({ initialProfile, onProfileSave }: ProfileFormProps) {
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    fatherName: "",
    dob: "",
    gender: "Male",
    address: "",
    district: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!profile.name.trim()) return setError("Name is required");
    if (!profile.address.trim()) return setError("Full Address is required");
    if (!profile.district.trim()) return setError("District is required");
    if (!profile.state.trim()) return setError("State is required");
    if (!profile.pincode.trim() || !/^\d{6}$/.test(profile.pincode)) {
      return setError("Please provide a valid 6-digit Pincode");
    }
    if (!profile.phone.trim() || !/^\d{10}$/.test(profile.phone)) {
      return setError("Please provide a valid 10-digit Phone Number");
    }
    if (!profile.email.trim() || !/\S+@\S+\.\S+/.test(profile.email)) {
      return setError("Please provide a valid Email Address");
    }

    onProfileSave(profile);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 dark:bg-indigo-950 p-2.5 rounded-lg text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100 text-base">
              National Citizen Profile Database
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete once. These details will dynamically populate into official government templates.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs rounded-lg p-3 mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name (As in ID)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="e.g. Senthil Kumar"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Father/Spouse Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Father's or Spouse's Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="fatherName"
                value={profile.fatherName}
                onChange={handleChange}
                placeholder="e.g. Kumarasamy R"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* DOB */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                name="dob"
                value={profile.dob}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Gender</label>
            <div className="relative">
              <Heart className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select
                name="gender"
                value={profile.gender}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number (10 digits)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                name="phone"
                maxLength={10}
                value={profile.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                placeholder="e.g. senthil@example.com"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Address (Street, Door No., Locality)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                name="address"
                rows={2}
                value={profile.address}
                onChange={handleChange}
                placeholder="e.g. No. 15, Nehru Street, Gandhinagar"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">District</label>
            <input
              type="text"
              name="district"
              value={profile.district}
              onChange={handleChange}
              placeholder="e.g. Coimbatore"
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* State */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">State</label>
            <input
              type="text"
              name="state"
              value={profile.state}
              onChange={handleChange}
              placeholder="e.g. Tamil Nadu"
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Pincode */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pincode (6 digits)</label>
            <input
              type="text"
              name="pincode"
              maxLength={6}
              value={profile.pincode}
              onChange={handleChange}
              placeholder="e.g. 641012"
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg shadow-md active:scale-95 transition-all text-sm"
        >
          <Save className="h-4 w-4" />
          <span>{success ? "Saved Successfully" : "Save Citizen Profile"}</span>
        </button>
      </div>
    </form>
  );
}
