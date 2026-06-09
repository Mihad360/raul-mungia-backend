import { Discount } from "./discount.model";
import { IDiscountCalculation, IDiscountTier } from "./discount.interface";

const getActiveDiscountFromDB = async () => {
  const activeDiscount = await Discount.findOne({
    isActive: true,
    isDeleted: false,
  });

  if (!activeDiscount) {
    return null;
  }

  // Sort tiers by minQuantity ascending for consistent display
  const sortedTiers = [...activeDiscount.tiers].sort(
    (a, b) => a.minQuantity - b.minQuantity,
  );

  return {
    ...activeDiscount.toObject(),
    tiers: sortedTiers,
  };
};

const findApplicableTier = (
  itemsCount: number,
  tiers: IDiscountTier[],
): IDiscountTier | null => {
  // Find the highest tier where customer qualifies
  // Sort by minQuantity descending to find highest applicable tier first
  const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);

  for (const tier of sortedTiers) {
    const meetsMin = itemsCount >= tier.minQuantity;
    const meetsMax =
      tier.maxQuantity === null || itemsCount <= tier.maxQuantity;

    if (meetsMin && meetsMax) {
      return tier;
    }
  }

  return null;
};

const calculateDiscountForItems = async (
  itemsCount: number,
  subtotalAfterCoupon: number,
): Promise<IDiscountCalculation> => {
  const emptyCalculation: IDiscountCalculation = {
    discountId: null,
    tierUsed: null,
    itemsCount,
    discountPercent: 0,
    discountAmount: 0,
  };

  if (itemsCount <= 0 || subtotalAfterCoupon <= 0) {
    return emptyCalculation;
  }

  const activeDiscount = await getActiveDiscountFromDB();

  if (!activeDiscount || !activeDiscount.tiers.length) {
    return emptyCalculation;
  }

  const applicableTier = findApplicableTier(itemsCount, activeDiscount.tiers);

  if (!applicableTier) {
    return emptyCalculation;
  }

  // Calculate discount amount based on subtotal AFTER coupon
  const discountAmount = Number(
    ((subtotalAfterCoupon * applicableTier.discountPercent) / 100).toFixed(2),
  );

  return {
    discountId: activeDiscount._id!,
    tierUsed: applicableTier,
    itemsCount,
    discountPercent: applicableTier.discountPercent,
    discountAmount,
  };
};

export const DiscountServices = {
  getActiveDiscountFromDB,
  calculateDiscountForItems,
};
