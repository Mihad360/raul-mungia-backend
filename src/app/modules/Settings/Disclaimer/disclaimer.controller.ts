import HttpStatus from "http-status";
import { disclaimerServices } from "./disclaimer.service";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";

const getDisclaimer = catchAsync(async (req, res) => {
  const result = await disclaimerServices.getDisclaimer();

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Disclaimer retrieved successfully",
    data: result,
  });
});

export const disclaimerControllers = {
  getDisclaimer,
};
