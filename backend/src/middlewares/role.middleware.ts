import type { Request, Response, NextFunction } from "express";
import Role from "../models/role.model.ts";
type ReqWithUser = Request & { user?: any };

/**
 * Ensure the authenticated user has one of the allowed roles.
 * Usage: router.use(requireRole('doctor'))
 */
export function requireRole(...allowed: string[]) {
  return async (req: ReqWithUser, res: Response, next: NextFunction) => {
    try {
      const u = req.user;
      if (!u) return res.status(401).json({ message: "Unauthorized" });

      let roleName: string | undefined;
      if (u.role && typeof u.role === "object" && "name" in u.role) {
        roleName = u.role.name as string;
      } else if (u.role) {
        const roleDoc = (await Role.findOne({ _id: u.role })
          .select("name")
          .lean()) as any;
        roleName = roleDoc?.name as string | undefined;
      }

      if (
        !roleName ||
        !allowed.map((r) => r.toLowerCase()).includes(roleName.toLowerCase())
      ) {
        return res
          .status(403)
          .json({ message: "Forbidden: insufficient role" });
      }
      return next();
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
