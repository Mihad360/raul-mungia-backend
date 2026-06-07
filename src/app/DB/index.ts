import config from "../config";
import { AboutModel } from "../modules/Settings/About/About.model";
import { PrivacyModel } from "../modules/Settings/privacy/Privacy.model";
import { TermsModel } from "../modules/Settings/Terms/Terms.model";
import { UserModel } from "../modules/User/user.model";

const dummyPrivacy = {
  description: "dummy privacy and policy",
};
const dummyAbout = {
  description: "dummy about us",
};
const dummyTerms = {
  description: "dummy terms and conditions",
};
const admin = {
  email: config.ADMIN_EMAIL as string,
  password: config.ADMIN_PASS as string,
  role: "admin" as const,
  isVerified: true,
};
const superAdmin = {
  email: config.SUPER_ADMIN_EMAIL as string,
  password: config.SUPER_ADMIN_PASS as string,
  role: "super_admin" as const,
  isVerified: true,
};

export const seedAdmin = async () => {
  try {
    const isSuperAdminExist = await UserModel.findOne({ email: admin.email });
    if (!isSuperAdminExist) {
      await UserModel.create(admin);
      console.log("Admin created successfully.");
    } else {
      console.log("Admin already exists.");
    }
  } catch (error) {
    console.error("Error seeding Admin:", error);
    // Optionally: throw error or handle differently
  }
};

export const seedSuperAdmin = async () => {
  try {
    const isSuperAdminExist = await UserModel.findOne({
      email: superAdmin.email,
    });
    if (!isSuperAdminExist) {
      await UserModel.create(superAdmin);
      console.log("Super admin created successfully.");
    } else {
      console.log("Super admin already exists.");
    }
  } catch (error) {
    console.error("Error seeding super admin:", error);
    // Optionally: throw error or handle differently
  }
};

export const seedPrivacy = async () => {
  try {
    const privacy = await PrivacyModel.findOne();
    if (!privacy) {
      await PrivacyModel.create(dummyPrivacy);
      console.log("Privacy policy seeded successfully.");
    } else {
      console.log("Privacy policy already exists.");
    }
  } catch (error) {
    console.error("Error seeding privacy policy:", error);
  }
};

export const seedTerms = async () => {
  try {
    const terms = await TermsModel.findOne();
    if (!terms) {
      await TermsModel.create(dummyTerms);
      console.log("Terms and conditions seeded successfully.");
    } else {
      console.log("Terms and conditions already exist.");
    }
  } catch (error) {
    console.error("Error seeding terms and conditions:", error);
  }
};

export const seedAbout = async () => {
  try {
    const about = await AboutModel.findOne();
    if (!about) {
      await AboutModel.create(dummyAbout);
      console.log("About us seeded successfully.");
    } else {
      console.log("About us already exists.");
    }
  } catch (error) {
    console.error("Error seeding about us:", error);
  }
};
