import { RequestHandler } from "express";
import { z } from "zod";
import {
  initializeFirebaseAdmin,
  FirebaseAdminService,
} from "../lib/firebase-admin";

// Initialize on first use
initializeFirebaseAdmin();

// Validation schemas with strict constraints
const VerifyAdminSchema = z.object({
  idToken: z
    .string()
    .min(10)
    .max(3000)
    .regex(/^[A-Za-z0-9_\-\.]+$/, "Invalid token format"),
});

const BanUserSchema = z.object({
  idToken: z
    .string()
    .min(10)
    .max(3000)
    .regex(/^[A-Za-z0-9_\-\.]+$/, "Invalid token format"),
  userId: z.string().min(10).max(100),
  reason: z.string().min(5).max(500).trim(),
  duration: z.number().int().min(1).max(36500),
});

const CreateLicenseSchema = z.object({
  idToken: z
    .string()
    .min(10)
    .max(3000)
    .regex(/^[A-Za-z0-9_\-\.]+$/, "Invalid token format"),
  plan: z.enum(["Free", "Classic", "Pro"]),
  validityDays: z.number().int().min(1).max(3650),
});

const BanIPSchema = z.object({
  idToken: z
    .string()
    .min(10)
    .max(3000)
    .regex(/^[A-Za-z0-9_\-\.]+$/, "Invalid token format"),
  ipAddress: z
    .string()
    .ip({ version: "v4" })
    .or(z.string().ip({ version: "v6" })),
  reason: z.string().min(5).max(500).trim(),
  duration: z.number().int().min(1).max(36500),
});

// Endpoint: Verify admin status
export const handleVerifyAdmin: RequestHandler = async (req, res) => {
  try {
    const validated = VerifyAdminSchema.parse(req.body);
    const adminUid = await FirebaseAdminService.verifyAdmin(validated.idToken);
    res.json({ success: true, adminUid });
  } catch (error) {
    console.error("Admin verification error:", error);
    const status = error instanceof z.ZodError ? 400 : 401;
    res.status(status).json({
      error: "Unauthorized",
      message:
        error instanceof Error ? error.message : "Verification failed",
    });
  }
};

// Endpoint: Ban user (admin only)
export const handleBanUser: RequestHandler = async (req, res) => {
  try {
    const validated = BanUserSchema.parse(req.body);
    const adminUid = await FirebaseAdminService.verifyAdmin(
      validated.idToken,
    );

    const banId = await FirebaseAdminService.banUser(
      adminUid,
      validated.userId,
      validated.reason,
      validated.duration,
    );

    res.json({ success: true, banId });
  } catch (error) {
    console.error("Ban user error:", error);
    const status =
      error instanceof z.ZodError ||
      (error instanceof Error && error.message === "User not found")
        ? 400
        : 401;
    res.status(status).json({
      error: "Failed to ban user",
      message: error instanceof Error ? error.message : "Operation failed",
    });
  }
};

// Endpoint: Get all users (admin only)
export const handleGetAllUsers: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header");
    }

    const idToken = authHeader.slice(7).trim();
    if (!idToken || idToken.length < 10 || idToken.length > 3000) {
      throw new Error("Invalid token format");
    }

    await FirebaseAdminService.verifyAdmin(idToken);
    const users = await FirebaseAdminService.getAllUsers();

    res.json({ success: true, users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(401).json({
      error: "Unauthorized",
      message: error instanceof Error ? error.message : "Operation failed",
    });
  }
};

// Endpoint: Create license (admin only)
export const handleCreateLicense: RequestHandler = async (req, res) => {
  try {
    const validated = CreateLicenseSchema.parse(req.body);
    const adminUid = await FirebaseAdminService.verifyAdmin(
      validated.idToken,
    );

    const licenseKey = await FirebaseAdminService.createLicense(
      adminUid,
      validated.plan,
      validated.validityDays,
    );

    res.json({ success: true, licenseKey });
  } catch (error) {
    console.error("Create license error:", error);
    const status = error instanceof z.ZodError ? 400 : 401;
    res.status(status).json({
      error: "Failed to create license",
      message: error instanceof Error ? error.message : "Operation failed",
    });
  }
};

// Endpoint: Ban IP (admin only)
export const handleBanIP: RequestHandler = async (req, res) => {
  try {
    const validated = BanIPSchema.parse(req.body);
    const adminUid = await FirebaseAdminService.verifyAdmin(
      validated.idToken,
    );

    const banId = await FirebaseAdminService.banIP(
      adminUid,
      validated.ipAddress,
      validated.reason,
      validated.duration,
    );

    res.json({ success: true, banId });
  } catch (error) {
    console.error("Ban IP error:", error);
    const status = error instanceof z.ZodError ? 400 : 401;
    res.status(status).json({
      error: "Failed to ban IP",
      message: error instanceof Error ? error.message : "Operation failed",
    });
  }
};

// Endpoint: Delete user (admin only)
export const handleDeleteUser: RequestHandler = async (req, res) => {
  try {
    const validated = z
      .object({
        idToken: z
          .string()
          .min(10)
          .max(3000)
          .regex(/^[A-Za-z0-9_\-\.]+$/),
        userId: z.string().min(10).max(100),
      })
      .parse(req.body);

    const adminUid = await FirebaseAdminService.verifyAdmin(
      validated.idToken,
    );

    await FirebaseAdminService.deleteUser(adminUid, validated.userId);

    res.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    const status = error instanceof z.ZodError ? 400 : 401;
    res.status(status).json({
      error: "Failed to delete user",
      message: error instanceof Error ? error.message : "Operation failed",
    });
  }
};
