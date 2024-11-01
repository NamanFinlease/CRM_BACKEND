import asyncHandler from "./asyncHandler.js";
import jwt from "jsonwebtoken";
import Employees from "../models/Employees.js";

// Protected Routes
const protect = asyncHandler(async (req, res, next) => {
    let token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.employee = await Employees.findById(decoded.id).select(
                "-password"
            );
            if (!req.employee) {
                res.status(404);
                throw new Error("Employee not found");
            }
            const rolesHierarchy = {
                admin: ["admin"],
                supervisor: ["supervisor"],
                sanction: ["screener", "creditManager", "sanctionHead"],
                disbursal: ["disbursalManager", "disbursalHead"],
            };
            const empRoles = req.employee.empRole;
            req.roles = new Set();
            Object.values(rolesHierarchy).forEach((hierarchy) => {
                empRoles.forEach((role) => {
                    const roleIndex = hierarchy.indexOf(role);
                    if (roleIndex !== -1) {
                        // Add the role and all lower roles in the current hierarchy
                        hierarchy
                            .slice(0, roleIndex + 1)
                            .forEach((hierRole) => {
                                req.roles.add(hierRole);
                            });
                    }
                });
            });

            // const role = req.role;
            const requestedRole = req.query?.role;

            if (!requestedRole || !req.roles.has(requestedRole)) {
                res.status(403);
                throw new Error(
                    "You do not have the required permissions for this role"
                );
            }

            // Set active role for later use in controllers
            req.activeRole = requestedRole;

            next();
        } catch (error) {
            res.status(401);
            throw new Error("Not Authorized: Invalid token");
        }
    } else {
        res.status(403);
        throw new Error("Not Authorized!!! No token found");
    }
});

// Middleware to check for specific roles
// const   = (req, res, next) => {
//     // const requestedRole = req.query?.role;
//     // const userRole = req.roles.has(role);
//     // const hasAccess = requiredRoles.some((role) => req.roles.has(role));
//     // if (!hasAccess) {
//     //     res.status(403);
//     //     throw new Error("You do not have the required permissions");
//     // }
//     // next();

//     const requestedRole = req.query?.role;
//     const userRole = req.roles;

//     // Check if req.roles exists, and if not, handle the error
//     if (!userRole) {
//         res.status(500);
//         return next(
//             new Error(
//                 "User roles are undefined. Ensure roles are set in the request object."
//             )
//         );
//     }

//     // Check if userRole exists in role hierarchy and if it includes the requestedRole
//     // const hasAccess = roleHierarchy[userRole]?.has(requestedRole);

//     // if (!hasAccess) {
//     //     res.status(403);
//     //     return next(new Error("You do not have the required permissions"));
//     // }

//     // If access is granted, proceed to the next middleware
//     next();
// };

// Admin Route
const admin = (req, res, next) => {
    if (req.admin) {
        next();
    } else {
        res.status(401);
        throw new Error("Not Authorized as Admin!!");
    }
};

export { protect, admin };

// Middleware to verify JWT
// const authenticateToken = (req, res, next) => {
//     const token =
//         req.cookies.authToken ||
//         req.header("Authorization")?.replace("Bearer ", "");

//     if (!token) {
//         return res
//             .status(401)
//             .json({ message: "Access denied. No token provided." });
//     }

//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         req.user = decoded; // Add user info to request object
//         next(); // Proceed to the next middleware or route handler
//     } catch (err) {
//         return res.status(401).json({ message: "Invalid token." });
//     }
// };

// export { admin };
