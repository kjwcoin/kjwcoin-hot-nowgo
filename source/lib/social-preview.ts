import type { Metadata } from "next";
import cards from "@/config/social-previews.json";

// Approved sharing copy and artwork. Change only at the owner's request.
export function socialMetadata(variant: keyof typeof cards): Metadata {
  const card = cards[variant];
  const image = { url: `${card.origin}${card.image}`, width: 1200, height: 630, alt: card.title };
  return {
    metadataBase: new URL(card.origin),
    openGraph: { type: "website", locale: "ko_KR", siteName: card.siteName,
      url: `${card.origin}/`, title: card.title, description: card.description, images: [image] },
    twitter: { card: "summary_large_image", title: card.title, description: card.description, images: [image] },
  };
}
