import { useEffect, useState } from "react";
import { useApiClient } from "@workspace/api-client-react";

interface AdData {
  id: string;
  imagePath: string;
  linkUrl: string;
}

export function AdCard() {
  const { client } = useApiClient();
  const [ad, setAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .getCurrentAd()
      .then((res) => {
        setAd(res.data.ad as AdData | null);
      })
      .catch(() => {
        setAd(null);
      })
      .finally(() => setLoading(false));
  }, [client]);

  if (loading || !ad) return null;

  const imageUrl = `${import.meta.env.BASE_URL}api/storage/public-objects/${ad.imagePath.replace(/^\//, "")}`;

  return (
    <div className="col-span-full flex justify-center my-2">
      <a
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl overflow-hidden border border-border/50 hover:border-primary/40 transition-all duration-300 shadow hover:shadow-primary/10 hover:shadow-lg"
        title="Advertisement"
        aria-label="Sponsored advertisement"
      >
        <img
          src={imageUrl}
          alt="Advertisement"
          width={320}
          height={100}
          className="block w-[320px] h-[100px] object-cover"
        />
      </a>
    </div>
  );
}
