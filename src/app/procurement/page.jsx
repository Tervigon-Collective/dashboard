import Breadcrumb from "@/components/Breadcrumb";
import ProcurementTableDataLayer from "@/components/ProcurementTableDataLayer";

export const metadata = {
  title: "Procurement - Admin Dashboard",
  description:
    "Procurement product management system for managing products, variants, and pricing.",
};

const Page = () => {
  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb title="Components / Procurement" />

      {/* ProcurementTableDataLayer */}
      <ProcurementTableDataLayer />
    </>
  );
};

export default Page;
