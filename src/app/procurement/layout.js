import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "Procurement - Dashboard",
  description: "Procurement Product Management Dashboard",
};

export default function ProcurementLayout({ children }) {
  return <MasterLayout>{children}</MasterLayout>;
}
