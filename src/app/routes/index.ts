import { Router } from "express";
import { userRoutes } from "../modules/User/user.routes";
import { AuthRoutes } from "../modules/Auth/auth.route";
import { notificationRoutes } from "../modules/Notification/notification.route";
import { categoryRoutes } from "../modules/Category/category.route";
import { PrivacyRoutes } from "../modules/Settings/privacy/Privacy.route";
import { TermsRoutes } from "../modules/Settings/Terms/Terms.route";
import { AboutRoutes } from "../modules/Settings/About/About.route";
import { adminRoutes } from "../modules/Admin/admin.route";
import { productRoutes } from "../modules/Product/product.routes";
import { wishlistRoutes } from "../modules/Wishlist/wishlist.route";
import { cartRoutes } from "../modules/Cart/cart.routes";
import { couponRoutes } from "../modules/Coupon/coupon.routes";
import { blogRoutes } from "../modules/Settings/Blog/blog.routes";
import { faqRoutes } from "../modules/Settings/Faq/faq.routes";
import { certificationRoutes } from "../modules/Settings/Certification/certificate.routes";
import { disclaimerRoutes } from "../modules/Settings/Disclaimer/disclaimer.routes";
import { explorePurityRoutes } from "../modules/Settings/Explore Purity/explorePurity.routes";
import { DiscountRoutes } from "../modules/Discount/discount.routes";
import { paymentMethodRoutes } from "../modules/PaymentMethod/paymentMethod.routes";

const router = Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/notification",
    route: notificationRoutes,
  },
  {
    path: "/category",
    route: categoryRoutes,
  },
  {
    path: "/privacy",
    route: PrivacyRoutes,
  },
  {
    path: "/term",
    route: TermsRoutes,
  },
  {
    path: "/about",
    route: AboutRoutes,
  },
  {
    path: "/admin",
    route: adminRoutes,
  },
  {
    path: "/product",
    route: productRoutes,
  },
  {
    path: "/wishlist",
    route: wishlistRoutes,
  },
  {
    path: "/cart",
    route: cartRoutes,
  },
  {
    path: "/coupon",
    route: couponRoutes,
  },
  { path: "/blog", route: blogRoutes },
  { path: "/faq", route: faqRoutes },
  { path: "/certificate", route: certificationRoutes },
  { path: "/disclaimer", route: disclaimerRoutes },
  { path: "/explore-purity", route: explorePurityRoutes },
  { path: "/discount", route: DiscountRoutes },
  { path: "/payment-methods", route: paymentMethodRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route?.route));

export default router;
