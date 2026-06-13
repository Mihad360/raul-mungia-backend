import axios, { AxiosError } from "axios";
import HttpStatus from "http-status";
import AppError from "../../erros/AppError";
import config from "../../config";

/* ============================================================
 * TYPES — Input parameters for FedEx APIs
 * ============================================================ */

export interface IFedExAddress {
  streetLines: string[]; // ["123 Main St", "Apt 4B"]
  city: string;
  stateOrProvinceCode: string; // "CA"
  postalCode: string;
  countryCode: string; // "US"
}

export interface IFedExPackage {
  weight: number; // In pounds (LB)
  // Optional dimensions (we use defaults for peptide boxes)
  length?: number; // In inches
  width?: number;
  height?: number;
}

export interface IGetRatesParams {
  recipientAddress: IFedExAddress;
  packageWeight: number; // Total weight in pounds
}

export interface ICreateShipmentParams {
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  recipientCompany?: string;
  recipientAddress: IFedExAddress;
  serviceType: string; // e.g., "FEDEX_GROUND"
  packageWeight: number; // In pounds
  customerReference?: string; // Usually order number
}

export interface IValidateAddressParams {
  streetLines: string[];
  city: string;
  stateOrProvinceCode: string;
  postalCode: string;
  countryCode: string;
}

/* ============================================================
 * TYPES — Cleaned output we return to services
 * ============================================================ */

export interface IFedExRate {
  serviceType: string; // "FEDEX_GROUND"
  serviceName: string; // "FedEx Ground®"
  totalCost: number; // Final cost in USD
  currency: string; // "USD"
  transitDays?: string; // "5 days" if available
  deliveryDay?: string; // Day name if available
}

export interface IFedExShipmentResult {
  trackingNumber: string;
  labelUrl: string; // Base64 or URL to PDF label
  shipDate: string; // ISO date
  serviceType: string;
}

export interface IFedExTrackingResult {
  trackingNumber: string;
  status: string; // "DELIVERED", "IN_TRANSIT", etc.
  statusDescription: string; // Human readable
  estimatedDeliveryDate?: string;
  events: {
    timestamp: string;
    description: string;
    location?: string;
  }[];
}

export interface IFedExAddressValidationResult {
  isValid: boolean;
  classification?: string; // "BUSINESS" | "RESIDENTIAL" | "MIXED"
  suggestedAddress?: IFedExAddress;
  warnings?: string[];
}

/* ============================================================
 * TOKEN CACHE — In-memory storage
 * ============================================================ */

interface ITokenCache {
  accessToken: string;
  expiresAt: number;
}

// Cache for SHIPPING APIs (rates, ship, address validation)
let shippingTokenCache: ITokenCache | null = null;

// Cache for TRACK API (separate project, different credentials)
let trackTokenCache: ITokenCache | null = null;

/**
 * Get a valid OAuth2 access token
 * Uses in-memory cache; refreshes 60 seconds before expiry
 */
/**
 * Get a valid OAuth2 access token
 * Uses separate caches for shipping vs track APIs
 *
 * @param scope - 'shipping' (rates/ship/address) or 'track' (tracking)
 */
const getAccessToken = async (
  scope: "shipping" | "track" = "shipping",
): Promise<string> => {
  // Pick the right cache and credentials based on scope
  const cache = scope === "track" ? trackTokenCache : shippingTokenCache;
  const clientId =
    scope === "track"
      ? (config.FEDEX_TRACK_CLIENT_ID as string)
      : (config.FEDEX_CLIENT_ID as string);
  const clientSecret =
    scope === "track"
      ? (config.FEDEX_TRACK_CLIENT_SECRET as string)
      : (config.FEDEX_CLIENT_SECRET as string);

  // Return cached token if still valid (with 60s buffer)
  if (cache && cache.expiresAt > Date.now() + 60 * 1000) {
    return cache.accessToken;
  }

  if (!clientId || !clientSecret) {
    throw new AppError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      `FedEx credentials not configured for ${scope} scope`,
    );
  }

  try {
    const response = await axios.post(
      `${config.FEDEX_API_BASE}/oauth/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      },
    );

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "FedEx authentication failed — no access token returned",
      );
    }

    // Cache the token in the right slot
    const newCache: ITokenCache = {
      accessToken: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    if (scope === "track") {
      trackTokenCache = newCache;
    } else {
      shippingTokenCache = newCache;
    }

    return access_token;
  } catch (error) {
    console.error(`FedEx ${scope} auth error:`, error);
    if (error instanceof AxiosError) {
      console.error("FedEx auth response:", error.response?.data);
    }
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Unable to connect to FedEx. Please try again later.",
    );
  }
};

/**
 * Build standard headers used for all FedEx API calls
 */
const buildHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "X-locale": "en_US",
});

/* ============================================================
 * SHIPPER INFO — Built from .env once per call
 * ============================================================ */

const getShipperInfo = () => ({
  contact: {
    personName: config.SHIPPER_NAME as string,
    companyName: config.SHIPPER_COMPANY as string,
    phoneNumber: config.SHIPPER_PHONE as string,
    emailAddress: config.SHIPPER_EMAIL as string,
  },
  address: {
    streetLines: [config.SHIPPER_STREET as string],
    city: config.SHIPPER_CITY as string,
    stateOrProvinceCode: config.SHIPPER_STATE as string,
    postalCode: config.SHIPPER_POSTAL_CODE as string,
    countryCode: config.SHIPPER_COUNTRY as string,
  },
});

/* ============================================================
 * API 1 — GET SHIPPING RATES
 * Returns available shipping options with prices and transit times
 * ============================================================ */

const getRates = async (params: IGetRatesParams): Promise<IFedExRate[]> => {
  const token = await getAccessToken();
  const shipper = getShipperInfo();
  console.log(token);
  console.log(shipper);
  // FedEx minimum billing weight is 1 lb
  const weight = Math.max(params.packageWeight, 1);

  const payload = {
    accountNumber: {
      value: config.FEDEX_ACCOUNT_NUMBER as string,
    },
    requestedShipment: {
      shipper: {
        address: shipper.address,
      },
      recipient: {
        address: {
          streetLines: params.recipientAddress.streetLines,
          city: params.recipientAddress.city,
          stateOrProvinceCode: params.recipientAddress.stateOrProvinceCode,
          postalCode: params.recipientAddress.postalCode,
          countryCode: params.recipientAddress.countryCode,
        },
      },
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      rateRequestType: ["ACCOUNT", "LIST"],
      requestedPackageLineItems: [
        {
          weight: {
            units: "LB",
            value: weight,
          },
        },
      ],
    },
  };

  try {
    const response = await axios.post(
      `${config.FEDEX_API_BASE}/rate/v1/rates/quotes`,
      payload,
      {
        headers: buildHeaders(token),
        timeout: 15000,
      },
    );

    const rateDetails = response.data?.output?.rateReplyDetails || [];
    console.log(rateDetails);
    // Transform FedEx response into clean format
    const rates: IFedExRate[] = rateDetails.map(
      (rate: Record<string, unknown>) => {
        const ratedDetails =
          (rate.ratedShipmentDetails as Array<Record<string, unknown>>) || [];

        // Prefer ACCOUNT rate (lower) over LIST rate
        const accountRate = ratedDetails.find((r) => r.rateType === "ACCOUNT");
        const chosenRate = accountRate || ratedDetails[0];

        const commit = rate.commit as Record<string, unknown> | undefined;

        return {
          serviceType: rate.serviceType as string,
          serviceName: rate.serviceName as string,
          totalCost: Number(chosenRate?.totalNetCharge) || 0,
          currency: (chosenRate?.currency as string) || "USD",
          transitDays: (commit?.transitTime as string) || undefined,
          deliveryDay: (commit?.dayOfWeek as string) || undefined,
        };
      },
    );

    // Sort by price ascending
    rates.sort((a, b) => a.totalCost - b.totalCost);

    return rates;
  } catch (error) {
    console.error("FedEx Rates API error:", error);
    if (error instanceof AxiosError) {
      console.error("FedEx response:", error.response?.data);
      const errorMessage =
        (error.response?.data as Record<string, unknown>)?.errors ||
        "FedEx rate calculation failed";
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        `Unable to calculate shipping rates: ${JSON.stringify(errorMessage)}`,
      );
    }
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Unable to calculate shipping rates. Please try again.",
    );
  }
};

/* ============================================================
 * API 2 — VALIDATE ADDRESS
 * Verifies if an address is deliverable
 * ============================================================ */

const validateAddress = async (
  params: IValidateAddressParams,
): Promise<IFedExAddressValidationResult> => {
  const token = await getAccessToken();
  console.log(token);
  const payload = {
    addressesToValidate: [
      {
        address: {
          streetLines: params.streetLines,
          city: params.city,
          stateOrProvinceCode: params.stateOrProvinceCode,
          postalCode: params.postalCode,
          countryCode: params.countryCode,
        },
      },
    ],
  };

  try {
    const response = await axios.post(
      `${config.FEDEX_API_BASE}/address/v1/addresses/resolve`,
      payload,
      {
        headers: buildHeaders(token),
        timeout: 10000,
      },
    );

    const resolvedAddresses = response.data?.output?.resolvedAddresses || [];
    const first = resolvedAddresses[0];

    if (!first) {
      return {
        isValid: false,
        warnings: ["Unable to validate address"],
      };
    }

    // FedEx classifications
    const classification = first.classification as string | undefined;
    const attributes = first.attributes || {};

    // Address is valid if it's not in any of these states:
    const isValid = attributes.Resolved === "true" || attributes.DPV === "true";

    const result: IFedExAddressValidationResult = {
      isValid,
      classification,
    };

    // If FedEx suggests a different address, include it
    if (first.streetLinesToken || first.city) {
      result.suggestedAddress = {
        streetLines: first.streetLinesToken || params.streetLines,
        city: first.city || params.city,
        stateOrProvinceCode:
          first.stateOrProvinceCode || params.stateOrProvinceCode,
        postalCode: first.postalCode || params.postalCode,
        countryCode: first.countryCode || params.countryCode,
      };
    }

    // Collect any warnings
    const warnings: string[] = [];
    if (attributes.MissingOrAmbiguousDirectional === "true") {
      warnings.push("Address may have ambiguous directional");
    }
    if (attributes.MultipleMatches === "true") {
      warnings.push("Multiple matches found");
    }
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return result;
  } catch (error) {
    console.error("FedEx Address Validation error:", error);
    // Don't block the user if validation API fails — just warn
    return {
      isValid: true,
      warnings: ["Address validation service unavailable"],
    };
  }
};

/* ============================================================
 * API 3 — CREATE SHIPMENT (Generate Label + Tracking Number)
 * ============================================================ */

const createShipment = async (
  params: ICreateShipmentParams,
): Promise<IFedExShipmentResult> => {
  const token = await getAccessToken();
  const shipper = getShipperInfo();

  const weight = Math.max(params.packageWeight, 1);

  const payload = {
    labelResponseOptions: "URL_ONLY",
    accountNumber: {
      value: config.FEDEX_ACCOUNT_NUMBER as string,
    },
    requestedShipment: {
      shipper: {
        contact: shipper.contact,
        address: shipper.address,
      },
      recipients: [
        {
          contact: {
            personName: params.recipientName,
            phoneNumber: params.recipientPhone,
            emailAddress: params.recipientEmail || "",
            companyName: params.recipientCompany || "",
          },
          address: {
            streetLines: params.recipientAddress.streetLines,
            city: params.recipientAddress.city,
            stateOrProvinceCode: params.recipientAddress.stateOrProvinceCode,
            postalCode: params.recipientAddress.postalCode,
            countryCode: params.recipientAddress.countryCode,
          },
        },
      ],
      shipDatestamp: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      serviceType: params.serviceType,
      packagingType: "YOUR_PACKAGING",
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: {
              value: config.FEDEX_ACCOUNT_NUMBER as string,
            },
          },
        },
      },
      labelSpecification: {
        imageType: "PDF",
        labelStockType: "PAPER_85X11_TOP_HALF_LABEL",
      },
      requestedPackageLineItems: [
        {
          weight: {
            units: "LB",
            value: weight,
          },
          customerReferences: params.customerReference
            ? [
                {
                  customerReferenceType: "CUSTOMER_REFERENCE",
                  value: params.customerReference,
                },
              ]
            : [],
        },
      ],
    },
  };

  try {
    const response = await axios.post(
      `${config.FEDEX_API_BASE}/ship/v1/shipments`,
      payload,
      {
        headers: buildHeaders(token),
        timeout: 30000,
      },
    );

    const output = response.data?.output;
    const transactionShipments = output?.transactionShipments || [];
    const shipment = transactionShipments[0];

    if (!shipment) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "FedEx returned no shipment data",
      );
    }

    const trackingNumber = shipment.masterTrackingNumber as string;
    const pieceResponses = shipment.pieceResponses || [];
    const firstPiece = pieceResponses[0];

    const packageDocuments = firstPiece?.packageDocuments || [];
    const labelDoc = packageDocuments[0];
    const labelUrl = (labelDoc?.url as string) || "";

    if (!trackingNumber) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "FedEx did not return a tracking number",
      );
    }

    return {
      trackingNumber,
      labelUrl,
      shipDate: new Date().toISOString(),
      serviceType: params.serviceType,
    };
  } catch (error) {
    console.error("FedEx Ship API error:", error);
    if (error instanceof AxiosError) {
      console.error("FedEx response:", error.response?.data);
      const errorMessage =
        (error.response?.data as Record<string, unknown>)?.errors ||
        "Failed to generate shipping label";
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        `Unable to create shipment: ${JSON.stringify(errorMessage)}`,
      );
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Unable to create shipping label. Please try again.",
    );
  }
};

/* ============================================================
 * API 4 — TRACK SHIPMENT
 * Get delivery status for a tracking number
 * ============================================================ */

const trackShipment = async (
  trackingNumber: string,
): Promise<IFedExTrackingResult> => {
  if (!trackingNumber || !trackingNumber.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Tracking number is required");
  }

  const token = await getAccessToken("track");

  const payload = {
    includeDetailedScans: true,
    trackingInfo: [
      {
        trackingNumberInfo: {
          trackingNumber: trackingNumber.trim(),
        },
      },
    ],
  };

  try {
    const response = await axios.post(
      `${config.FEDEX_API_BASE}/track/v1/trackingnumbers`,
      payload,
      {
        headers: buildHeaders(token),
        timeout: 15000,
      },
    );

    const output = response.data?.output;
    const completeTrackResults = output?.completeTrackResults || [];
    const firstResult = completeTrackResults[0];
    const trackResults = firstResult?.trackResults || [];
    const trackInfo = trackResults[0];

    if (!trackInfo) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        "No tracking information found for this number",
      );
    }

    const latestStatusDetail = trackInfo.latestStatusDetail || {};
    const scanEvents =
      (trackInfo.scanEvents as Array<Record<string, unknown>>) || [];

    const events = scanEvents.map((event) => {
      const scanLocation = event.scanLocation as Record<string, unknown>;
      return {
        timestamp: (event.date as string) || "",
        description: (event.eventDescription as string) || "",
        location: scanLocation
          ? `${scanLocation.city || ""}, ${scanLocation.stateOrProvinceCode || ""}`
              .trim()
              .replace(/^,\s*/, "")
          : undefined,
      };
    });

    return {
      trackingNumber,
      status: (latestStatusDetail.code as string) || "UNKNOWN",
      statusDescription:
        (latestStatusDetail.description as string) || "No status available",
      estimatedDeliveryDate: (
        trackInfo.estimatedDeliveryTimeWindow as Record<string, unknown>
      )?.window as string | undefined,
      events,
    };
  } catch (error) {
    console.error("FedEx Tracking API error:", error);
    if (error instanceof AxiosError) {
      console.error("FedEx response:", error.response?.data);
      const errorMessage =
        (error.response?.data as Record<string, unknown>)?.errors ||
        "Tracking lookup failed";
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        `Unable to track shipment: ${JSON.stringify(errorMessage)}`,
      );
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Unable to track shipment. Please try again.",
    );
  }
};

/* ============================================================
 * EXPORT
 * ============================================================ */

export const fedexClient = {
  getAccessToken, // Exposed for debugging/testing
  getRates,
  validateAddress,
  createShipment,
  trackShipment,
};
