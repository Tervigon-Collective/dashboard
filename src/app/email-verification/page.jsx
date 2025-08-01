"use client";
import EmailVerificationLayer from "@/components/EmailVerificationLayer";
import RoleGuard from "@/components/RoleGuard";

export default function EmailVerificationPage() {
  return (
    <RoleGuard requiredRoles={['admin', 'super_admin']}>
      <EmailVerificationLayer />
    </RoleGuard>
  );
} 