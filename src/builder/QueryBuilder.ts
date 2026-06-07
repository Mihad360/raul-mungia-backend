import { Query, QueryFilter } from "mongoose";

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchableFields: string[]) {
    const searchTerm = this?.query.searchTerm;
    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(
          (field) =>
            ({
              [field]: { $regex: searchTerm, $options: "i" },
            }) as QueryFilter<T>,
        ),
      });
    }
    return this;
  }

  filter() {
    const queryObj = { ...this.query };
    const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);

    const mongoQuery: Record<string, unknown> = {};

    for (const key in queryObj) {
      const value = queryObj[key];

      // ✅ handle range like age=20-30
      if (typeof value === "string" && value.includes("-")) {
        const [min, max] = value.split("-").map(Number);

        if (!isNaN(min) && !isNaN(max)) {
          mongoQuery[key] = { $gte: min, $lte: max };
          continue;
        }
      }

      // default behavior
      mongoQuery[key] = value;
    }

    this.modelQuery = this.modelQuery.find(mongoQuery as QueryFilter<T>);
    return this;
  }

  sort() {
    const sort = this.query.sort || "-createdAt";
    this.modelQuery = this.modelQuery.sort(sort as string);
    return this;
  }

  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields() {
    const fields =
      (this.query.fields as string)?.split(",")?.join(" ") || "-__v";
    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  async countTotal() {
    const totalQueries = this.modelQuery.getFilter();
    const total = await this.modelQuery.model.countDocuments(totalQueries);
    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 10;
    const totalPage = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPage,
    };
  }
}

export default QueryBuilder;
