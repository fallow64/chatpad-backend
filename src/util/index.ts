import { User } from "@prisma/client";

/**
 * The secret for the access JWT. If not found, exits process.
 */
export const JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ??
    (() => {
        console.error(
            "JWT_ACCESS_SECRET not provided in environment variables"
        );
        process.exit(1);
    })();

/**
 * The secret for the refresh JWT. If not found, exits process.
 */
export const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ??
    (() => {
        console.error(
            "JWT_REFRESH_SECRET not provided in environment variables"
        );
        process.exit(1);
    })();

/**
 * Duration of the access JWT in string form
 */
export const JWT_ACCESS_DURATION = "10m";
/**
 * Duration of the access JWT in seconds form
 */
export const JWT_ACCESS_DURATION_SECONDS = 10 * 60; // 10 minutes
/**
 * Duration of the refresh JWT in string form
 */
export const JWT_REFRESH_DURATION = "20160m";
/**
 * Duration of the refresh JWT in seconds form
 */
export const JWT_REFRESH_DURATION_SECONDS = 2 * 7 * 24 * 60 * 60; // 2 weeks

/**
 * Sanitizes a user object, so that any confidential information is removed.
 * @param user user object to be sanitized
 * @returns a sanitized user object
 */
export function sanitizeUser(user: User) {
    return {
        id: user.id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        username: user.username,
    };
}
