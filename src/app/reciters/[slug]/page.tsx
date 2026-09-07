import { listReciterSlugs } from "@/infrastructure/di/static-params";
import { ReciterDetail } from "./reciter-detail";

/**
 * Server shell for the reciter page.
 *
 * The page itself is fully client-rendered; this wrapper exists only so the
 * route can export `generateStaticParams`, which a client component cannot.
 * That is what lets the whole app ship as a static export with a real
 * `index.html` per reciter.
 */
export async function generateStaticParams() {
  const slugs = await listReciterSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ReciterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ReciterDetail slug={slug} />;
}
