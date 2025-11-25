import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";

export const metadata = {
  title: "Video Generator - Content Generator Suite",
  description: "AI-powered video generation with custom styles and effects",
};

const Page = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb
          title="Video Generator"
          rootLabel="Content Craft"
          rootIcon="solar:magic-stick-3-bold"
          rootBreadcrumbLabel="Dashboard"
        />

        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body text-center py-5">
                  <div className="mb-4">
                    <i
                      className="ri-video-line text-primary"
                      style={{ fontSize: "4rem" }}
                    ></i>
                  </div>
                  <h4 className="mb-3">Video Generator</h4>
                  <p className="text-muted mb-4">
                    AI-powered video generation coming soon!
                  </p>
                  <p className="text-muted">
                    Create engaging video content with AI assistance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MasterLayout>
    </>
  );
};

export default Page;
