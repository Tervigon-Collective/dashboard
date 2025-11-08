import QrDetailPageClient from "./QrDetailPageClient";
import qrStaticParams from "@/config/qrStaticParams";

const QrDetailPage = ({ params, searchParams }) => {
  return <QrDetailPageClient params={params} searchParams={searchParams} />;
};

export default QrDetailPage;

export async function generateStaticParams() {
  if (!Array.isArray(qrStaticParams) || qrStaticParams.length === 0) {
    return [{ slug: [] }];
  }

  const mappedParams = qrStaticParams
    .map(({ requestId, itemId, token }) => {
      if (!requestId || !itemId || !token) {
        return null;
      }

      return {
        slug: [String(requestId), String(itemId), String(token)],
      };
    })
    .filter(Boolean);

  if (mappedParams.length === 0) {
    return [{ slug: [] }];
  }

  return [...mappedParams, { slug: [] }];
}

export const dynamic = "force-static";
