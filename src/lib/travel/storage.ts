"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { searchFields } from "./model";
import { cardIdSchema } from "./cards";
const hotel = z.object({
  imageUrl: z
    .url()
    .regex(/^https:\/\//)
    .optional(),
  hotelId: z.string(),
  name: z.string(),
  cityCode: z.string(),
  address: z.string().optional(),
  rating: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  distance: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
const propertyFee = z.object({
  amount: z.number().finite().nonnegative(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  description: z.string(),
});
const offer = z.object({
  isEstimate: z.boolean().optional(),
  additionalFees: z.array(propertyFee).optional(),
  payAtProperty: z.array(propertyFee).optional(),
  offerId: z.string(),
  hotelId: z.string(),
  hotelName: z.string(),
  price: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    total: z.string().regex(/^\d+(\.\d+)?$/),
    base: z.string().optional(),
  }),
  room: z
    .object({
      type: z.string(),
      description: z.string().optional(),
      bedType: z.string().optional(),
    })
    .optional(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  adults: z.number(),
  cancellable: z.boolean().optional(),
  boardType: z.string().optional(),
});
export const workspaceSchema = z.object({
  version: z.literal(1),
  cards: z.array(cardIdSchema).max(4).default([]),
  trips: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      folder: z.string(),
      pinned: z.boolean(),
      updatedAt: z.string(),
      search: searchFields,
      messages: z.array(
        z.object({
          id: z.string(),
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      ),
      activities: z.array(
        z.object({
          id: z.string(),
          day: z.number().int().min(1).max(30),
          time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          title: z.string(),
          notes: z.string(),
        }),
      ),
    }),
  ),
  saved: z.array(
    z.object({
      id: z.string(),
      hotel,
      offer: offer.optional(),
      search: searchFields,
      isMock: z.boolean(),
      source: z.enum(["sample", "sandbox", "live"]).optional(),
      provider: z.literal("liteapi").optional(),
      savedAt: z.string(),
    }),
  ),
  folders: z.array(z.string()),
});
export type Workspace = z.infer<typeof workspaceSchema>;
const empty: Workspace = {
  version: 1,
  cards: [],
  trips: [],
  saved: [],
  folders: ["Dream trips"],
};
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(empty);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("goniva.workspace.v1");
      if (raw) {
        const result = workspaceSchema.safeParse(JSON.parse(raw));
        if (result.success) setWorkspace(result.data);
        else
          setStorageError(
            "Saved data could not be read. Export a backup before making changes.",
          );
      }
    } catch {
      setStorageError(
        "Browser storage is unavailable. Changes will last for this session only.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    try {
      localStorage.setItem("goniva.workspace.v1", JSON.stringify(workspace));
    } catch {
      setStorageError(
        "Your browser couldn’t save these changes. Export your trips to keep a backup.",
      );
    }
  }, [workspace, ready, storageError]);
  return {
    workspace,
    setWorkspace,
    ready,
    storageError,
    clearStorageError: () => setStorageError(""),
  };
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
