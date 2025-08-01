import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import UserRoleInfo from "@/components/UserRoleInfo";

export const metadata = {
  title: "User Role Information - Admin Dashboard",
  description: "View your current role and permissions in the system",
};

const UserRoleInfoPage = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title='User Role Information' />
        <UserRoleInfo />
      </MasterLayout>
    </>
  );
};

export default UserRoleInfoPage; 