import { IFedExAddress } from "../../utils/fedex/fedex.client";

/**
 * Payload from frontend when fetching shipping rates at checkout
 * Cart weight is calculated server-side from user's cart
 */
export interface IGetRatesPayload {
  recipientAddress: IFedExAddress;
}

/**
 * Payload for address validation
 */
export interface IValidateAddressPayload {
  streetLines: string[];
  city: string;
  stateOrProvinceCode: string;
  postalCode: string;
  countryCode: string;
}

/**
 * Shipping option as shown to customer on frontend
 */
export interface IShippingOption {
  serviceType: string;
  serviceName: string;
  totalCost: number;          // Existing — actual FedEx rate
  customerPays: number;       // NEW — what customer actually pays
  freeShippingApplied: boolean; // NEW
  savings: number;            // NEW — totalCost - customerPays
  currency: string;
  transitDays?: string;
  deliveryDay?: string;
  isCheapest: boolean;
  isFastest: boolean;
}
