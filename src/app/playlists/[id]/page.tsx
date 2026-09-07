import { listPlaylistIds } from "@/infrastructure/di/static-params";
import { PlaylistDetail } from "./playlist-detail";

/**
 * Server shell for a curated playlist. See the reciter route for why the
 * split exists.
 */
export function generateStaticParams() {
  return listPlaylistIds().map((id) => ({ id }));
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlaylistDetail id={id} />;
}
