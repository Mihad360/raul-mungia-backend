import HttpStatus from "http-status";
import { Types } from "mongoose";
import { FaqModel } from "./faq.model";
import QueryBuilder from "../../../../builder/QueryBuilder";
import AppError from "../../../erros/AppError";

const getAllFaqs = async (query: Record<string, unknown>) => {
  const faqQuery = new QueryBuilder(
    FaqModel.find({ isDeleted: false, isActive: true }),
    query,
  )
    .search(["question", "answer"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await faqQuery.countTotal();
  const result = await faqQuery.modelQuery;

  return { meta, result };
};

const getSingleFaq = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid faq id");
  }

  const faq = await FaqModel.findOne({
    _id: id,
    isDeleted: false,
    isActive: true,
  });

  if (!faq) {
    throw new AppError(HttpStatus.NOT_FOUND, "Faq not found");
  }

  return faq;
};

export const faqServices = {
  getAllFaqs,
  getSingleFaq,
};
