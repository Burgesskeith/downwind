import Stripe from "stripe";

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Please connect the Stripe integration to your project."
    );
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}
