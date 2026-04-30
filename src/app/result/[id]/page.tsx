import type { Metadata } from "next";
import { generateResultMetadata, ResultPageContent } from "@/components/pages/ResultPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  return generateResultMetadata({ id: params.id, searchParams, requestedLocale: null });
}

export default async function ResultPage({ params }: { params: { id: string } }) {
  return ResultPageContent({ id: params.id, requestedLocale: null });
}
