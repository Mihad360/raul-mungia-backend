import HttpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync";
import { certificationServices } from "./certificate.service";
import sendResponse from "../../../utils/sendResponse";

const getAllCertifications = catchAsync(async (req, res) => {
  const result = await certificationServices.getAllCertifications(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Certifications retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleCertification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await certificationServices.getSingleCertification(
    id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Certification retrieved successfully",
    data: result,
  });
});

export const certificationControllers = {
  getAllCertifications,
  getSingleCertification,
};
