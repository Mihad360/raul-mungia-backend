import HttpStatus from "http-status";
import { blogServices } from "./blog.service";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";

const getAllBlogs = catchAsync(async (req, res) => {
  const result = await blogServices.getAllBlogs(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Blogs retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleBlog = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await blogServices.getSingleBlog(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Blog retrieved successfully",
    data: result,
  });
});

export const blogControllers = {
  getAllBlogs,
  getSingleBlog,
};
