// src/services/subscription.service.ts
import { prisma } from "../config";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";

interface SubscriptionInput {
  tier: SubscriptionTier;
  endDate: Date;
}

export const createSubscription = async (
  merchantId: string,
  input: SubscriptionInput
) => {
  return await prisma.subscription.create({
    data: {
      merchantId,
      tier: input.tier,
      endDate: input.endDate,
      status: SubscriptionStatus.ACTIVE,
    },
  });
};

export const getSubscription = async (merchantId: string) => {
  return await prisma.subscription.findUnique({
    where: { merchantId },
  });
};

export const updateSubscription = async (
  merchantId: string,
  input: Partial<SubscriptionInput>
) => {
  return await prisma.subscription.update({
    where: { merchantId },
    data: input,
  });
};

export const cancelSubscription = async (merchantId: string) => {
  return await prisma.subscription.update({
    where: { merchantId },
    data: { status: SubscriptionStatus.CANCELLED },
  });
};
