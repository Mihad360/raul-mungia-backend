import HttpStatus from "http-status";
import { explorePurityServices } from "./explorePurity.service";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";

const getExplorePurity = catchAsync(async (req, res) => {
  const result = await explorePurityServices.getExplorePurity();

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Explore Purity retrieved successfully",
    data: result,
  });
});

export const explorePurityControllers = {
  getExplorePurity,
};
