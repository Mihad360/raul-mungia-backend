import HttpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../../erros/AppError";
import QueryBuilder from "../../../builder/QueryBuilder";
import { ProductModel } from "./product.model";

const getAllProducts = async (query: Record<string, unknown>) => {
  const productQuery = new QueryBuilder(
    ProductModel.find({ isDeleted: false, isActive: true }).populate(
      "category",
      "name description",
    ),
    query,
  )
    .search(["title", "productCode", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await productQuery.countTotal();
  const result = await productQuery.modelQuery;

  return { meta, result };
};

const getSingleProduct = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  const product = await ProductModel.findOne({
    _id: id,
    isDeleted: false,
  }).populate("category", "name description");

  if (!product) {
    throw new AppError(HttpStatus.NOT_FOUND, "Product not found");
  }

  return product;
};

const getRelatedProducts = async (id: string, limit: number = 4) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  const product = await ProductModel.findOne({ _id: id, isDeleted: false });

  if (!product) {
    throw new AppError(HttpStatus.NOT_FOUND, "Product not found");
  }

  const related = await ProductModel.find({
    _id: { $ne: product._id },
    category: product.category,
    isDeleted: false,
    isActive: true,
  })
    .limit(limit)
    .populate("category", "name");

  return related;
};

const getProductsByCategory = async (
  categoryId: string,
  query: Record<string, unknown>,
) => {
  if (!Types.ObjectId.isValid(categoryId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid category id");
  }

  const productQuery = new QueryBuilder(
    ProductModel.find({
      category: new Types.ObjectId(categoryId),
      isDeleted: false,
      isActive: true,
    }).populate("category", "name description"),
    query,
  )
    .search(["title", "productCode", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await productQuery.countTotal();
  const result = await productQuery.modelQuery;

  return { meta, result };
};

export const productServices = {
  getAllProducts,
  getSingleProduct,
  getRelatedProducts,
  getProductsByCategory,
};
