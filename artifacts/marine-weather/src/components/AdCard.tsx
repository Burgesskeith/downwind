import { useGetCurrentAd } from "@workspace/api-client-react";

export function AdCard() {
  const { data, isLoading } = useGetCurrentAd({
    query: { staleTime: 1000 * 60 * 5, retry: 0 },
  });

  if (isLoading || !data?.ad) return null;

  const ad = data.ad;
  const imageUrl = `${import.meta.env.BASE_URL}api/storage/public-objects/${ad.imagePath.replace(/^\//, "")}`;

  return (
    <div className="col-span-full flex justify-center my-2">
      <a
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl overflow-hidden border border-border/50 hover:border-primary/40 transition-all duration-300 shadow hover:shadow-primary/10 hover:shadow-lg group"
        title="Advertisement"
        aria-label="Sponsored advertisement"
      >
        <div className="relative">
          <img
            src={imageUrl}
            alt="Advertisement"
            width={320}
            height={100}
            className="block w-[320px] h-[100px] object-cover"
          />
          <span className="absolute top-1 right-1 bg-black/60 text-white text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold">
            Ad
          </span>
        </div>
      </a>
    </div>
  );
}
