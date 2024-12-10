import asyncHandler from "./asyncHandler.js";
import jwt from "jsonwebtoken";
import Employees from "../models/Employees.js";
import Lead from "../models/Leads.js";

// Protected Routes
const protect = asyncHandler(async (req, res, next) => {
    let token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.employee = await Employees.findById(decoded.id).select(
                "-password"
            );

            console.log(req.employee);

            if (!req.employee) {
                res.status(404);
                throw new Error("Employee not found");
            }

            if (!req.employee.isActive) {
                res.status(401);
                throw new Error("Your account is deactivated");
            }

            const rolesHierarchy = {
                admin: ["admin"],
                supervisor: ["supervisor"],
                sanction: ["screener", "creditManager", "sanctionHead"],
                disbursal: ["disbursalManager", "disbursalHead"],
                collection: ["collectionExecutive", "collectionHead"],
                account: ["accountExecutive", "accountHead"],
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

const aadhaarMiddleware = asyncHandler(async (req, res, next) => {
    const { id } = req.params; // Extract the token (ID) from the request parameters

    if (!id) {
        // Return an error if no token is provided
        res.status(401);
        throw new Error("Not Authorized! No token found");
    }

    try {
        // Decode the token using the secret
        const decoded = jwt.verify(id, process.env.AADHAAR_LINK_SECRET);

        // Fetch the user lead using the decoded token's `_id`
        const userLead = await Lead.findById(decoded._id);

        if (!userLead) {
            res.status(404);
            throw new Error("User lead not found");
        }

        // Attach the lead ID to the `req` object for downstream use
        req.userLeadId = userLead._id;

        // Call the next middleware or route handler
        next();
    } catch (error) {
        res.status(401);
        throw new Error("Not Authorized! Invalid token");
    }
});

// Admin Route
const admin = (req, res, next) => {
    if (req.activeRole !== "admin") {
        res.status(401);
        throw new Error("Not Authorized as Admin!!");
    }
    next();
};

export { protect, admin, aadhaarMiddleware };
