export interface AuditRule {
  id: string;
  category: "Privacy" | "Security" | "Governance";
  title: string;
  description: string;
  // Used to retrieve relevant chunks for this rule via vector search.
  searchQuery: string;
}

export const AUDIT_RULES: AuditRule[] = [
  {
    id: "data-retention",
    category: "Governance",
    title: "Data Retention Schedule",
    description:
      "The policy defines how long different categories of data are kept and requires timely, secure disposal once retention periods expire.",
    searchQuery: "data retention period how long records are kept deletion disposal schedule",
  },
  {
    id: "data-subject-rights",
    category: "Privacy",
    title: "Data Subject Rights (Access, Correction, Deletion)",
    description:
      "The policy describes how individuals can request access to, correction of, or deletion of their personal data, consistent with GDPR/CCPA-style rights.",
    searchQuery: "individual rights access correction deletion request personal data subject",
  },
  {
    id: "breach-response",
    category: "Security",
    title: "Data Breach / Incident Response Plan",
    description:
      "The policy defines an incident response process, including detection, containment, and notification timelines for a data breach or security incident.",
    searchQuery: "data breach incident response notification containment security incident procedure",
  },
  {
    id: "access-control",
    category: "Security",
    title: "Access Control & Least Privilege",
    description:
      "The policy requires role-based or least-privilege access controls and periodic review of who can access sensitive systems and data.",
    searchQuery: "access control least privilege role based permissions authorization review",
  },
  {
    id: "encryption",
    category: "Security",
    title: "Encryption of Data at Rest and in Transit",
    description:
      "The policy requires encryption or an equivalent safeguard for sensitive data both while stored and while transmitted.",
    searchQuery: "encryption data at rest in transit cryptography protect sensitive data",
  },
  {
    id: "vendor-risk",
    category: "Governance",
    title: "Third-Party & Vendor Risk Management",
    description:
      "The policy addresses due diligence, contractual safeguards, and oversight of third-party vendors or processors who handle company data.",
    searchQuery: "third party vendor processor due diligence contract data sharing risk assessment",
  },
  {
    id: "training",
    category: "Governance",
    title: "Employee Training & Acknowledgment",
    description:
      "The policy requires employees to be trained on the policy and to formally acknowledge understanding and compliance.",
    searchQuery: "employee training awareness acknowledgment sign policy annual",
  },
  {
    id: "audit-logging",
    category: "Security",
    title: "Audit Logging & Monitoring",
    description:
      "The policy requires logging and monitoring of access to sensitive systems or data, and periodic review of those logs.",
    searchQuery: "audit log monitoring access logs review security events tracking",
  },
  {
    id: "regulatory-alignment",
    category: "Governance",
    title: "Regulatory Alignment",
    description:
      "The policy references applicable regulatory frameworks (e.g. GDPR, CCPA, HIPAA, SOC 2, ISO 27001) it is designed to comply with.",
    searchQuery: "GDPR CCPA HIPAA SOC 2 ISO 27001 compliance regulatory requirement law",
  },
  {
    id: "policy-ownership",
    category: "Governance",
    title: "Policy Ownership & Review Cadence",
    description:
      "The policy names an owner or responsible team and defines how often the policy itself is reviewed and updated.",
    searchQuery: "policy owner responsible team review cadence annually updated version",
  },
];
