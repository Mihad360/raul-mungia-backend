import HttpStatus from "http-status";
import { faqServices } from "./faq.service";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";

const getAllFaqs = catchAsync(async (req, res) => {
  const result = await faqServices.getAllFaqs(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Faqs retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleFaq = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await faqServices.getSingleFaq(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Faq retrieved successfully",
    data: result,
  });
});

export const faqControllers = {
  getAllFaqs,
  getSingleFaq,
};
