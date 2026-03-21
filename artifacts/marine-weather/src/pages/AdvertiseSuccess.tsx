import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { CheckCircle, Upload, ArrowLeft, ExternalLink } from "lucide-react";

type Step = "verifying" | "upload" | "done" | "error";

export default function AdvertiseSuccess() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id") ?? "";

  const [step, setStep] = useState<Step>("verifying");
  const [adId, setAdId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 1: verify payment on mount
  useEffect(() => {
    if (!sessionId) {
      setErrorMsg("Missing session ID in URL.");
      setStep("error");
      return;
    }
    fetch(`${import.meta.env.BASE_URL}api/ads/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.verified) {
          setAdId(data.adId);
          if (data.active) {
            setStep("done");
          } else {
            setStep("upload");
          }
        } else {
          setErrorMsg(data.error ?? "Payment not confirmed.");
          setStep("error");
        }
      })
      .catch(() => {
        setErrorMsg("Could not reach server. Please try again.");
        setStep("error");
      });
  }, [sessionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512_000) {
      setUploadError("Image must be under 500 KB.");
      return;
    }
    setImageFile(file);
    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) { setUploadError("Please select a banner image."); return; }
    if (!linkUrl || linkUrl === "https://") { setUploadError("Please enter a destination URL."); return; }
    try { new URL(linkUrl); } catch { setUploadError("Please enter a valid URL."); return; }

    setUploading(true);
    setUploadError("");

    try {
      // 1. Request presigned upload URL
      const urlRes = await fetch(`${import.meta.env.BASE_URL}api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: imageFile.name, size: imageFile.size, contentType: imageFile.type }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlData.error ?? "Could not get upload URL");

      // 2. PUT image to presigned URL
      const putRes = await fetch(urlData.uploadURL, {
        method: "PUT",
        body: imageFile,
        headers: { "Content-Type": imageFile.type },
      });
      if (!putRes.ok) throw new Error("Image upload failed");

      // 3. Save object path + link URL
      const saveRes = await fetch(`${import.meta.env.BASE_URL}api/ads/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, imagePath: urlData.objectPath, linkUrl }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error ?? "Could not activate ad");

      setStep("done");
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to forecast
        </Link>

        {step === "verifying" && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Confirming your payment…</p>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-20">
            <p className="text-rose-500 font-semibold mb-2">Something went wrong</p>
            <p className="text-muted-foreground mb-6">{errorMsg}</p>
            <Link href="/advertise" className="text-primary underline underline-offset-4">Try again</Link>
          </div>
        )}

        {step === "upload" && (
          <>
            <div className="flex items-center gap-3 mb-8">
              <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
              <div>
                <h1 className="font-display text-2xl font-black">Payment confirmed</h1>
                <p className="text-muted-foreground text-sm">Now upload your banner to go live.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Banner image <span className="text-muted-foreground font-normal">(320×100 px, JPG/PNG, max 500 KB)</span>
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors min-h-[120px]"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-[100px] rounded-xl" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to select file</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Link URL */}
              <div>
                <label htmlFor="linkUrl" className="block text-sm font-semibold mb-2">
                  Click-through URL
                </label>
                <div className="relative">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="linkUrl"
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://yoursite.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:outline-none text-sm"
                  />
                </div>
              </div>

              {uploadError && (
                <p className="text-rose-500 text-sm px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  {uploadError}
                </p>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading…" : "Publish my ad"}
              </button>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="text-center py-20">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="font-display text-3xl font-black mb-2">Your ad is live!</h1>
            <p className="text-muted-foreground mb-8">
              Your banner is now showing on Paddle Planner after today's forecast.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 py-3 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
              View your ad on the forecast
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
