import { PaymentMethodModel } from "./paymentMethod.model";

const getActivePaymentMethodsFromDB = async () => {
  const result = await PaymentMethodModel.find({
    isActive: true,
    isDeleted: false,
  }).sort({ displayOrder: 1, createdAt: 1 });

  return result;
};

export const paymentMethodServices = {
  getActivePaymentMethodsFromDB,
};
