import { ExplorePurityModel } from "./explorePurity.model";

const getExplorePurity = async () => {
  const explorePurity = await ExplorePurityModel.find().sort({
    createdAt: -1,
  });
  return explorePurity[0] || null;
};

export const explorePurityServices = {
  getExplorePurity,
};
