import HttpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../../erros/AppError";
import { CategoryModel } from "../Category/category.model";
import { ICategory } from "../Category/category.interface";
import { IProduct, IProductVariant } from "../Product/product.interface";
import { sendFileToCloudinary } from "../../utils/sendImageToCloudinary";
import { ProductModel } from "../Product/product.model";
import QueryBuilder from "../../../builder/QueryBuilder";
import { CouponModel } from "../Coupon/coupon.model";
import { ICoupon } from "../Coupon/coupon.interface";

const createCategory = async (payload: ICategory) => {
  // Check duplicate name
  const isNameExist = await CategoryModel.isCategoryExistByName(payload.name);
  if (isNameExist) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "A category with this name already exists",
    );
  }

  const result = await CategoryModel.create(payload);

  if (!result) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Category creation failed");
  }

  return result;
};

const updateCategory = async (id: string, payload: Partial<ICategory>) => {
  const category = await CategoryModel.isCategoryExistById(id);

  if (!category) {
    throw new AppError(HttpStatus.NOT_FOUND, "Category not found");
  }

  // Check duplicate name (if changing)
  if (payload.name && payload.name !== category.name) {
    const isNameExist = await CategoryModel.isCategoryExistByName(payload.name);
    if (isNameExist) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        "A category with this name already exists",
      );
    }
  }

  // Prevent sensitive fields from being updated
  delete payload.isDeleted;

  const updated = await CategoryModel.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: payload },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Category update failed");
  }

  return updated;
};

const deleteCategory = async (id: string) => {
  const category = await CategoryModel.isCategoryExistById(id);

  if (!category) {
    throw new AppError(HttpStatus.NOT_FOUND, "Category not found");
  }

  const result = await CategoryModel.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: { isDeleted: true, isActive: false } },
    { new: true },
  );

  if (!result) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Category deletion failed");
  }

  return result;
};

// ─── Product ───────────────────────────────────────

const createProduct = async (
  files: { mainImage?: Express.Multer.File[]; images?: Express.Multer.File[] },
  payload: IProduct,
) => {
  // Validate category exists
  if (!Types.ObjectId.isValid(payload.category)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid category id");
  }

  const categoryExists = await CategoryModel.isCategoryExistById(
    payload.category,
  );
  if (!categoryExists) {
    throw new AppError(HttpStatus.NOT_FOUND, "Category not found");
  }

  // Validate variants
  if (!payload.variants || payload.variants.length === 0) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "At least one variant is required",
    );
  }

  // Check for duplicate sizes in variants
  const sizes = payload.variants.map((v) => v.size.toLowerCase().trim());
  const uniqueSizes = new Set(sizes);
  if (sizes.length !== uniqueSizes.size) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Duplicate sizes found in variants. Each size must be unique.",
    );
  }

  // Main image is required
  if (!files?.mainImage || files.mainImage.length === 0) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Main image is required");
  }

  // Upload main image
  const mainImageUpload = await sendFileToCloudinary(
    files.mainImage[0].buffer,
    files.mainImage[0].originalname,
    files.mainImage[0].mimetype,
  );
  payload.mainImage = mainImageUpload.secure_url;

  // Upload gallery images if any
  if (files?.images && files.images.length > 0) {
    const galleryUploads = await Promise.all(
      files.images.map((file) =>
        sendFileToCloudinary(file.buffer, file.originalname, file.mimetype),
      ),
    );
    payload.images = galleryUploads.map((u) => u.secure_url);
  }

  // Auto-generate product code
  payload.productCode = await ProductModel.generateProductCode();

  // Normalize category to ObjectId
  payload.category = new Types.ObjectId(payload.category);

  const result = await ProductModel.create(payload);

  if (!result) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Product creation failed");
  }

  return result;
};

const updateProduct = async (
  id: string,
  files:
    | { mainImage?: Express.Multer.File[]; images?: Express.Multer.File[] }
    | undefined,
  payload: Partial<IProduct> & {
    removeImages?: string[];
    addVariants?: IProductVariant[];
    removeVariants?: string[];
    updateVariant?: {
      size: string;
      price?: number;
      originalPrice?: number | null;
      stock?: number;
    };
    clearFields?: string[];
  },
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  const product = await ProductModel.findOne({ _id: id, isDeleted: false });
  if (!product) {
    throw new AppError(HttpStatus.NOT_FOUND, "Product not found");
  }

  // ─── Validate category if changing ─────────────────────────────────
  if (payload.category) {
    if (!Types.ObjectId.isValid(payload.category)) {
      throw new AppError(HttpStatus.BAD_REQUEST, "Invalid category id");
    }
    const categoryExists = await CategoryModel.isCategoryExistById(
      payload.category,
    );
    if (!categoryExists) {
      throw new AppError(HttpStatus.NOT_FOUND, "Category not found");
    }
    payload.category = new Types.ObjectId(payload.category);
  }

  // ─── Upload new main image if provided ─────────────────────────────
  if (files?.mainImage && files.mainImage.length > 0) {
    const upload = await sendFileToCloudinary(
      files.mainImage[0].buffer,
      files.mainImage[0].originalname,
      files.mainImage[0].mimetype,
    );
    payload.mainImage = upload.secure_url;
  }

  // ─── Upload new gallery images if provided ─────────────────────────
  let newGalleryUrls: string[] = [];
  if (files?.images && files.images.length > 0) {
    const galleryUploads = await Promise.all(
      files.images.map((file) =>
        sendFileToCloudinary(file.buffer, file.originalname, file.mimetype),
      ),
    );
    newGalleryUrls = galleryUploads.map((u) => u.secure_url);
  }

  // ─── Pull out operator-driven fields ───────────────────────────────
  const {
    removeImages,
    addVariants,
    removeVariants,
    updateVariant,
    clearFields,
    ...restPayload
  } = payload;

  // ─── Prevent sensitive/auto fields from being updated ──────────────
  delete restPayload.productCode;
  delete restPayload.isDeleted;
  delete restPayload._id;
  delete restPayload.createdAt;
  delete restPayload.updatedAt;

  // ─── Conflict detection ────────────────────────────────────────────
  if (
    restPayload.variants &&
    (addVariants?.length || removeVariants?.length || updateVariant)
  ) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot use 'variants' replacement together with 'addVariants', 'removeVariants', or 'updateVariant'.",
    );
  }

  if (restPayload.images && removeImages?.length) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot use 'images' replacement together with 'removeImages'.",
    );
  }

  // ─── Validate addVariants don't duplicate existing sizes ───────────
  if (addVariants && addVariants.length > 0) {
    const existingSizes = product.variants.map((v) =>
      v.size.toLowerCase().trim(),
    );
    const newSizes = addVariants.map((v) => v.size.toLowerCase().trim());

    if (new Set(newSizes).size !== newSizes.length) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        "Duplicate sizes found in addVariants",
      );
    }

    // Exclude sizes that will be removed in this same request
    const removedSet = new Set(
      (removeVariants || []).map((s) => s.toLowerCase().trim()),
    );
    const effectiveExisting = existingSizes.filter((s) => !removedSet.has(s));
    const conflicts = newSizes.filter((s) => effectiveExisting.includes(s));
    if (conflicts.length > 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        `These sizes already exist: ${conflicts.join(", ")}. Use 'updateVariant' to modify them.`,
      );
    }
  }

  // ─── Validate updateVariant size exists ────────────────────────────
  if (updateVariant) {
    const exists = product.variants.some(
      (v) =>
        v.size.toLowerCase().trim() === updateVariant.size.toLowerCase().trim(),
    );
    if (!exists) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        `Variant with size '${updateVariant.size}' not found`,
      );
    }

    // Also: cannot update a variant that's being removed in same request
    if (removeVariants && removeVariants.length > 0) {
      const removingSet = new Set(
        removeVariants.map((s) => s.toLowerCase().trim()),
      );
      if (removingSet.has(updateVariant.size.toLowerCase().trim())) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          `Cannot update variant '${updateVariant.size}' because it's also being removed in this request`,
        );
      }
    }
  }

  // ─── Validate replacement variants don't have duplicates ───────────
  if (restPayload.variants && restPayload.variants.length > 0) {
    const sizes = restPayload.variants.map((v) => v.size.toLowerCase().trim());
    if (new Set(sizes).size !== sizes.length) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        "Duplicate sizes found in variants",
      );
    }
  }

  let hasUpdate = false;

  // ─── STEP 1: $pull operations (remove first) ───────────────────────
  const pullTargets: Record<string, unknown> = {};

  if (removeImages && removeImages.length > 0) {
    pullTargets.images = { $in: removeImages };
  }

  if (removeVariants && removeVariants.length > 0) {
    pullTargets.variants = { size: { $in: removeVariants } };
  }

  if (Object.keys(pullTargets).length > 0) {
    await ProductModel.findByIdAndUpdate(new Types.ObjectId(id), {
      $pull: pullTargets,
    });
    hasUpdate = true;
  }

  // ─── STEP 2: $set with arrayFilters (updateVariant) ────────────────
  if (updateVariant) {
    const variantSetObj: Record<string, unknown> = {};
    if (updateVariant.price !== undefined) {
      variantSetObj["variants.$[elem].price"] = updateVariant.price;
    }
    if (updateVariant.originalPrice !== undefined) {
      variantSetObj["variants.$[elem].originalPrice"] =
        updateVariant.originalPrice;
    }
    if (updateVariant.stock !== undefined) {
      variantSetObj["variants.$[elem].stock"] = updateVariant.stock;
    }

    if (Object.keys(variantSetObj).length > 0) {
      await ProductModel.findByIdAndUpdate(
        new Types.ObjectId(id),
        { $set: variantSetObj },
        {
          arrayFilters: [
            {
              "elem.size": {
                $regex: new RegExp(`^${updateVariant.size}$`, "i"),
              },
            },
          ],
        },
      );
      hasUpdate = true;
    }
  }

  // ─── STEP 3: $push operations (add variants/images) ────────────────
  const pushTargets: Record<string, unknown> = {};

  if (newGalleryUrls.length > 0) {
    pushTargets.images = { $each: newGalleryUrls };
  }

  if (addVariants && addVariants.length > 0) {
    pushTargets.variants = { $each: addVariants };
  }

  if (Object.keys(pushTargets).length > 0) {
    await ProductModel.findByIdAndUpdate(new Types.ObjectId(id), {
      $push: pushTargets,
    });
    hasUpdate = true;
  }

  // ─── STEP 4: $set / $unset of regular fields ───────────────────────
  const finalOps: Record<string, unknown> = {};

  if (Object.keys(restPayload).length > 0) {
    finalOps.$set = restPayload;
  }

  if (clearFields && clearFields.length > 0) {
    const allowedClearable = ["additionalInformation", "compliance"];
    const unsetObj: Record<string, 1> = {};
    for (const field of clearFields) {
      if (allowedClearable.includes(field)) {
        unsetObj[field] = 1;
      }
    }
    if (Object.keys(unsetObj).length > 0) {
      finalOps.$unset = unsetObj;
    }
  }

  if (Object.keys(finalOps).length > 0) {
    await ProductModel.findByIdAndUpdate(new Types.ObjectId(id), finalOps, {
      runValidators: true,
    });
    hasUpdate = true;
  }

  // ─── Validate nothing was actually requested ───────────────────────
  if (!hasUpdate) {
    throw new AppError(HttpStatus.BAD_REQUEST, "No update fields provided");
  }

  // ─── Fetch final updated product ───────────────────────────────────
  const updated = await ProductModel.findById(new Types.ObjectId(id)).populate(
    "category",
    "name description",
  );

  if (!updated) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Product update failed");
  }

  // ─── Ensure at least one variant remains ───────────────────────────
  if (updated.variants.length === 0) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot leave product with zero variants. Add at least one variant.",
    );
  }

  return updated;
};

const deleteProduct = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  const product = await ProductModel.findOne({ _id: id, isDeleted: false });
  if (!product) {
    throw new AppError(HttpStatus.NOT_FOUND, "Product not found");
  }

  const result = await ProductModel.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: { isDeleted: true, isActive: false } },
    { new: true },
  );

  if (!result) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Product deletion failed");
  }

  return result;
};

const getAllProductsAdmin = async (query: Record<string, unknown>) => {
  // Admin sees ALL products including inactive ones (but not soft-deleted)
  const productQuery = new QueryBuilder(
    ProductModel.find({ isDeleted: false }).populate(
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

// ─── Coupon ───────────────────────────────────────

const createCoupon = async (payload: ICoupon) => {
  // Normalize code
  payload.code = payload.code.toUpperCase().trim();

  // Check if a non-deleted coupon with this code already exists
  const isCodeExist = await CouponModel.isCouponExistByCode(payload.code);
  if (isCodeExist) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "An active coupon with this code already exists. Delete the existing one first to reuse this code.",
    );
  }

  // Convert expiryDate string to Date
  if (typeof payload.expiryDate === "string") {
    payload.expiryDate = new Date(payload.expiryDate);
  }

  // Reject past dates
  if (payload.expiryDate < new Date()) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Expiry date must be in the future",
    );
  }

  const result = await CouponModel.create(payload);

  if (!result) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Coupon creation failed");
  }

  return result;
};

const updateCoupon = async (id: string, payload: Partial<ICoupon>) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid coupon id");
  }

  const coupon = await CouponModel.isCouponExistById(id);
  if (!coupon) {
    throw new AppError(HttpStatus.NOT_FOUND, "Coupon not found");
  }

  // Check duplicate code if changing
  if (payload.code) {
    payload.code = payload.code.toUpperCase().trim();
    if (payload.code !== coupon.code) {
      const isCodeExist = await CouponModel.isCouponExistByCode(payload.code);
      if (isCodeExist) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          "An active coupon with this code already exists",
        );
      }
    }
  }

  // Convert expiryDate if string
  if (payload.expiryDate && typeof payload.expiryDate === "string") {
    payload.expiryDate = new Date(payload.expiryDate);
  }

  // Strip protected fields
  delete payload._id;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.isDeleted;

  if (Object.keys(payload).length === 0) {
    throw new AppError(HttpStatus.BAD_REQUEST, "No update fields provided");
  }

  const updated = await CouponModel.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: payload },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Coupon update failed");
  }

  return updated;
};

const deleteCoupon = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid coupon id");
  }

  const coupon = await CouponModel.isCouponExistById(id);
  if (!coupon) {
    throw new AppError(HttpStatus.NOT_FOUND, "Coupon not found");
  }

  const result = await CouponModel.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: { isDeleted: true, isActive: false } },
    { new: true },
  );

  if (!result) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Coupon deletion failed");
  }

  return result;
};

const getAllCouponsAdmin = async (query: Record<string, unknown>) => {
  // Admin sees all non-deleted coupons (active + inactive + expired)
  const couponQuery = new QueryBuilder(
    CouponModel.find({ isDeleted: false }),
    query,
  )
    .search(["code"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await couponQuery.countTotal();
  const result = await couponQuery.modelQuery;

  return { meta, result };
};

const getSingleCouponAdmin = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid coupon id");
  }

  const coupon = await CouponModel.isCouponExistById(id);
  if (!coupon) {
    throw new AppError(HttpStatus.NOT_FOUND, "Coupon not found");
  }

  return coupon;
};

export const adminServices = {
  // Category
  createCategory,
  updateCategory,
  deleteCategory,
  // Product
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  // Coupon
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAllCouponsAdmin,
  getSingleCouponAdmin,
};
