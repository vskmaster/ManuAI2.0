from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class UserProfileSchema(BaseModel):
    name: str = Field(..., description="Full Name of the citizen")
    fatherName: str = Field(..., description="Father or Spouse Name")
    dob: str = Field(..., description="Date of birth in YYYY-MM-DD")
    gender: str = Field(..., description="Gender identity")
    address: str = Field(..., description="Full permanent residential address")
    district: str = Field(..., description="District or county")
    state: str = Field(..., description="State name")
    pincode: str = Field(..., description="6-digit postal pincode")
    phone: str = Field(..., description="10-digit mobile number")
    email: EmailStr = Field(..., description="Active email address")

class ComplaintGenerationRequest(BaseModel):
    rawInput: str = Field(..., description="Raw text description or transcribed audio speech")
    templateName: str = Field(..., description="Name of chosen official document template")
    profile: Optional[UserProfileSchema] = None
    language: str = Field("English", description="Target language: English or Tamil")

class ComplaintSaveRequest(BaseModel):
    templateId: str
    title: str
    subject: str
    body: str
    profile: Optional[UserProfileSchema] = None
    evidenceImages: Optional[List[str]] = []
    problemImages: Optional[List[str]] = []

class ComplaintResponse(BaseModel):
    id: str
    templateId: str
    title: str
    subject: str
    body: str
    profile: Optional[UserProfileSchema] = None
    evidenceImages: List[str]
    problemImages: Optional[List[str]] = []
    createdAt: datetime
