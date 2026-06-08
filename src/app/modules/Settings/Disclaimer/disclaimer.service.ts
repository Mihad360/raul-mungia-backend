import { DisclaimerModel } from "./disclaimer.model";

const getDisclaimer = async () => {
  const disclaimer = await DisclaimerModel.find().sort({ createdAt: -1 });
  return disclaimer[0] || null;
};

export const disclaimerServices = {
  getDisclaimer,
};
