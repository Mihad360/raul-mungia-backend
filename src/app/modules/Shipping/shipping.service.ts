import { Types } from "mongoose";
import HttpStatus from "http-status";
import AppError from "../../erros/AppError";
import { JwtPayload } from "../../interface/global";

import { CartModel } from "../Cart/cart.model";
import {
  IGetRatesPayload,
  IValidateAddressPayload,
  IShippingOption,
} from "./shipping.interface";
import { fedexClient } from "../../utils/fedex/fedex.client";
import config from "../../config";
import { cartServices } from "../Cart/cart.service";

/**
 * Calculate total package weight from user's cart
 * Sums (variant weight × quantity) for all cart items
 *
 * Returns 1 lb minimum (FedEx requirement) if cart is empty or items have no weight
 */
const calculateCartWeight = async (userId: Types.ObjectId): Promise<number> => {
  const cart = await CartModel.findOne({ user: userId }).populate({
    path: "items.product",
    select: "variants",
    match: { isDeleted: false, isActive: true },
  });

  if (!cart || cart.items.length === 0) {
    return 0;
  }

  let totalWeight = 0;

  for (const item of cart.items) {
    if (!item.product || typeof item.product === "string") continue;

    const product = item.product as unknown as {
      variants: { size: string; weight: number }[];
    };

    const variant = product.variants.find(
      (v) => v.size.toLowerCase() === item.size.toLowerCase(),
    );

    if (variant && variant.weight) {
      totalWeight += variant.weight * item.quantity;
    }
  }

  // FedEx requires minimum 1 lb
  return Math.max(totalWeight, 1);
};

/**
 * Get shipping rates for user's current cart
 * Called from checkout page after customer enters shipping address
 *
 * Returns array of shipping options sorted by price (cheapest first)
 * Each option includes "isCheapest" and "isFastest" flags for UI highlighting
 */
const getShippingRatesFromFedEx = async (
  user: JwtPayload,
  payload: IGetRatesPayload,
): Promise<IShippingOption[]> => {
  const userId = new Types.ObjectId(user.user);

  // Validate recipient address
  if (!payload.recipientAddress) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Recipient address is required");
  }

  const { recipientAddress } = payload;

  if (
    !recipientAddress.streetLines ||
    !Array.isArray(recipientAddress.streetLines) ||
    recipientAddress.streetLines.length === 0
  ) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Street address is required");
  }

  if (!recipientAddress.city || !recipientAddress.city.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "City is required");
  }

  if (
    !recipientAddress.stateOrProvinceCode ||
    !recipientAddress.stateOrProvinceCode.trim()
  ) {
    throw new AppError(HttpStatus.BAD_REQUEST, "State/Province is required");
  }

  if (!recipientAddress.postalCode || !recipientAddress.postalCode.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Postal code is required");
  }

  if (!recipientAddress.countryCode || !recipientAddress.countryCode.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Country code is required");
  }

  // Calculate total cart weight
  const packageWeight = await calculateCartWeight(userId);

  if (packageWeight <= 0) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Your cart is empty. Add items before checking shipping rates.",
    );
  }

  // Get cart subtotal for free shipping eligibility check
  const cartSummary = await cartServices.getCartSummary(user);
  const qualifiesForFreeShipping =
    config.FREE_SHIPPING_ENABLED &&
    cartSummary.subtotal >= config.FREE_SHIPPING_THRESHOLD;

  // Call FedEx for actual rates
  const rates = await fedexClient.getRates({
    recipientAddress,
    packageWeight,
  });

  if (rates.length === 0) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "No shipping options available for this destination",
    );
  }

  // Find the rate of the "free" service (used as shipping credit value)
  const freeServiceRate = rates.find(
    (r) => r.serviceType === config.FREE_SHIPPING_SERVICE,
  );
  const shippingCredit =
    qualifiesForFreeShipping && freeServiceRate ? freeServiceRate.totalCost : 0;

  // Service type rankings for "fastest" determination (lower = faster)
  const serviceSpeedRank: Record<string, number> = {
    FIRST_OVERNIGHT: 1,
    PRIORITY_OVERNIGHT: 2,
    STANDARD_OVERNIGHT: 3,
    FEDEX_2_DAY_AM: 4,
    FEDEX_2_DAY: 5,
    FEDEX_EXPRESS_SAVER: 6,
    FEDEX_GROUND: 7,
  };

  const fastestRate = [...rates].sort(
    (a, b) =>
      (serviceSpeedRank[a.serviceType] || 99) -
      (serviceSpeedRank[b.serviceType] || 99),
  )[0];

  // Build options with free shipping logic
  const options: IShippingOption[] = rates.map((rate) => {
    const isFreeService = rate.serviceType === config.FREE_SHIPPING_SERVICE;
    const customerPays = qualifiesForFreeShipping
      ? Math.max(rate.totalCost - shippingCredit, 0)
      : rate.totalCost;

    return {
      serviceType: rate.serviceType,
      serviceName: rate.serviceName,
      totalCost: Number(rate.totalCost.toFixed(2)),
      customerPays: Number(customerPays.toFixed(2)),
      freeShippingApplied: qualifiesForFreeShipping && isFreeService,
      savings: Number((rate.totalCost - customerPays).toFixed(2)),
      currency: rate.currency,
      transitDays: rate.transitDays,
      deliveryDay: rate.deliveryDay,
      isCheapest: false,
      isFastest: rate.serviceType === fastestRate.serviceType,
    };
  });

  // Set isCheapest based on customerPays (not raw totalCost)
  const cheapestCustomerCost = Math.min(...options.map((o) => o.customerPays));
  options.forEach((o) => {
    o.isCheapest = o.customerPays === cheapestCustomerCost;
  });

  return options;
};

/**
 * Validate a shipping address via FedEx
 * Used at checkout to give customer a warning if address looks wrong
 *
 * Per our design decision: This is OPTIONAL/WARNING only
 * Does NOT block checkout if invalid — just informs the customer
 */
const validateShippingAddress = async (payload: IValidateAddressPayload) => {
  // Basic input validation
  if (
    !payload.streetLines ||
    !Array.isArray(payload.streetLines) ||
    payload.streetLines.length === 0
  ) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Street address is required");
  }

  if (!payload.city || !payload.city.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "City is required");
  }

  if (!payload.stateOrProvinceCode || !payload.stateOrProvinceCode.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "State/Province is required");
  }

  if (!payload.postalCode || !payload.postalCode.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Postal code is required");
  }

  if (!payload.countryCode || !payload.countryCode.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Country code is required");
  }

  // Call FedEx
  const result = await fedexClient.validateAddress({
    streetLines: payload.streetLines,
    city: payload.city,
    stateOrProvinceCode: payload.stateOrProvinceCode,
    postalCode: payload.postalCode,
    countryCode: payload.countryCode,
  });

  return result;
};

/**
 * Track a shipment by tracking number
 *
 * Per our design decision: Auth required
 * The route layer enforces auth — this function trusts the caller is authorized
 */
const trackShipmentFromFedEx = async (trackingNumber: string) => {
  if (!trackingNumber || !trackingNumber.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Tracking number is required");
  }

  const result = await fedexClient.trackShipment(trackingNumber.trim());

  return result;
};

export const shippingServices = {
  calculateCartWeight,
  getShippingRatesFromFedEx,
  validateShippingAddress,
  trackShipmentFromFedEx,
};
