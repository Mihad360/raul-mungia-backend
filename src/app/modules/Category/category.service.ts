import HttpStatus from "http-status";
import AppError from "../../erros/AppError";
import QueryBuilder from "../../../builder/QueryBuilder";
import { CategoryModel } from "./category.model";

const getAllCategories = async (query: Record<string, unknown>) => {
  const categoryQuery = new QueryBuilder(
    CategoryModel.find({ isDeleted: false }),
    query,
  )
    .search(["name", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await categoryQuery.countTotal();
  const result = await categoryQuery.modelQuery;

  return { meta, result };
};

const getSingleCategory = async (id: string) => {
  const category = await CategoryModel.isCategoryExistById(id);

  if (!category) {
    throw new AppError(HttpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

export const categoryServices = {
  getAllCategories,
  getSingleCategory,
};
