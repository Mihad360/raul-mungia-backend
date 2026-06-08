import HttpStatus from "http-status";
import QueryBuilder from "../../../../builder/QueryBuilder";
import { CertificationModel } from "./certificate.model";
import AppError from "../../../erros/AppError";
import { Types } from "mongoose";

const getAllCertifications = async (query: Record<string, unknown>) => {
  const certQuery = new QueryBuilder(
    CertificationModel.find({ isDeleted: false, isActive: true }),
    query,
  )
    .search(["title", "size"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await certQuery.countTotal();
  const result = await certQuery.modelQuery;

  return { meta, result };
};

const getSingleCertification = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid certification id");
  }

  const cert = await CertificationModel.findOne({
    _id: id,
    isDeleted: false,
    isActive: true,
  });

  if (!cert) {
    throw new AppError(HttpStatus.NOT_FOUND, "Certification not found");
  }

  return cert;
};

export const certificationServices = {
  getAllCertifications,
  getSingleCertification,
};
