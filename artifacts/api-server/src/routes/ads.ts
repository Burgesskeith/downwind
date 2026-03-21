import { Router, type IRouter, type Request, type Response } from "express";
import { query } from "../lib/db";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router: IRouter = Router();

interface Ad {
  id: string;
  stripe_session_id: string;
  image_path: string | null;
  link_url: string | null;
  active: boolean;
  advertiser_email: string | null;
  created_at: string;
  activated_at: string | null;
}

// POST /ads/checkout — create a Stripe Checkout session for a one-time ad purchase
router.post("/ads/checkout", async (req: Request, res: Response) => {
  try {
    const stripe = await getUncachableStripeClient();

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}${process.env.BASE_URL ?? "/"}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 1999, // $19.99
            product_data: {
              name: "Paddle Planner Ad Slot",
              description:
                "Display your 320×100 banner ad to surfers and paddlers after today's forecast for 30 days.",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}advertise/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}advertise`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: err.message ?? "Failed to create checkout session" });
  }
});

// GET /ads/verify — verify Stripe payment and record the ad slot
router.get("/ads/verify", async (req: Request, res: Response) => {
  const sessionId = req.query.session_id as string;
  if (!sessionId) {
    res.status(400).json({ error: "Missing session_id" });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      res.status(402).json({ error: "Payment not completed" });
      return;
    }

    // Upsert ad record — idempotent so safe to call multiple times
    await query(
      `INSERT INTO ads (stripe_session_id, advertiser_email)
       VALUES ($1, $2)
       ON CONFLICT (stripe_session_id) DO UPDATE SET advertiser_email = EXCLUDED.advertiser_email`,
      [sessionId, session.customer_details?.email ?? null]
    );

    const [ad] = await query<Ad>(
      "SELECT * FROM ads WHERE stripe_session_id = $1",
      [sessionId]
    );

    res.json({
      verified: true,
      adId: ad.id,
      hasImage: !!ad.image_path,
      hasLink: !!ad.link_url,
      active: ad.active,
    });
  } catch (err: any) {
    req.log.error({ err }, "Ad verify error");
    res.status(500).json({ error: err.message ?? "Verification failed" });
  }
});

// POST /ads/upload — save image path + link URL for a paid ad slot
router.post("/ads/upload", async (req: Request, res: Response) => {
  const { sessionId, imagePath, linkUrl } = req.body as {
    sessionId: string;
    imagePath: string;
    linkUrl: string;
  };

  if (!sessionId || !imagePath || !linkUrl) {
    res.status(400).json({ error: "sessionId, imagePath, and linkUrl are required" });
    return;
  }

  // Validate link URL
  try {
    new URL(linkUrl);
  } catch {
    res.status(400).json({ error: "linkUrl must be a valid URL" });
    return;
  }

  try {
    // Confirm payment is verified
    const [ad] = await query<Ad>(
      "SELECT * FROM ads WHERE stripe_session_id = $1",
      [sessionId]
    );
    if (!ad) {
      res.status(404).json({ error: "Ad not found — please verify payment first" });
      return;
    }

    // Deactivate any previous active ad
    await query("UPDATE ads SET active = false WHERE active = true AND id != $1", [ad.id]);

    // Save image + link and activate
    const [updated] = await query<Ad>(
      `UPDATE ads
       SET image_path = $1, link_url = $2, active = true, activated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [imagePath, linkUrl, ad.id]
    );

    res.json({ success: true, ad: { id: updated.id, active: updated.active } });
  } catch (err: any) {
    req.log.error({ err }, "Ad upload error");
    res.status(500).json({ error: err.message ?? "Upload failed" });
  }
});

// GET /ads/current — return the currently active ad
router.get("/ads/current", async (_req: Request, res: Response) => {
  try {
    const [ad] = await query<Ad>(
      "SELECT * FROM ads WHERE active = true ORDER BY activated_at DESC LIMIT 1"
    );
    if (!ad || !ad.image_path || !ad.link_url) {
      res.json({ ad: null });
      return;
    }
    res.json({
      ad: {
        id: ad.id,
        imagePath: ad.image_path,
        linkUrl: ad.link_url,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch ad" });
  }
});

export default router;
