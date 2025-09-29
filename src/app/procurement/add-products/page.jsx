import Breadcrumb from "@/components/Breadcrumb";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";

export const metadata = {
  title: "Add Product - Procurement",
  description: "Add new product to procurement system",
};

const AddProductPage = () => {
  return (
    <>
      <Breadcrumb title="Procurement / Add Product" />

      {/* Back Button */}
      <div className="mb-3 d-flex justify-content-end">
        <Link href="/procurement" className="btn btn-outline-secondary">
          <i className="icon-arrow-left me-2"></i>
          Back to Procurement
        </Link>
      </div>

      <ProductForm mode="add" />
    </>
  );
};

export default AddProductPage;
