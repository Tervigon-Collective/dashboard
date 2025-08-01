"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import CreateUserLayer from "@/components/CreateUserLayer";
import RoleGuard from "@/components/RoleGuard";
import { Icon } from "@iconify/react/dist/iconify.js";

const CreateUserPage = () => {
  return (
    <>
      <RoleGuard requiredRole={["admin", "super_admin"]}>
        <MasterLayout>
          <Breadcrumb title='Create New User' />
          
          <div className="row">
            <div className="col-12">
              <CreateUserLayer />
            </div>
          </div>

         

        </MasterLayout>
      </RoleGuard>
    </>
  );
};

export default CreateUserPage; 