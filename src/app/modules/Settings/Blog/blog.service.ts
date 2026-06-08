import HttpStatus from "http-status";
import { Types } from "mongoose";
import { BlogModel } from "./blog.model";
import AppError from "../../../erros/AppError";
import QueryBuilder from "../../../../builder/QueryBuilder";

const getAllBlogs = async (query: Record<string, unknown>) => {
  const blogQuery = new QueryBuilder(
    BlogModel.find({ isDeleted: false, isActive: true }),
    query,
  )
    .search(["title", "content"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await blogQuery.countTotal();
  const result = await blogQuery.modelQuery;

  return { meta, result };
};

const getSingleBlog = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid blog id");
  }

  const blog = await BlogModel.findOne({
    _id: id,
    isDeleted: false,
    isActive: true,
  });

  if (!blog) {
    throw new AppError(HttpStatus.NOT_FOUND, "Blog not found");
  }

  return blog;
};

export const blogServices = {
  getAllBlogs,
  getSingleBlog,
};
