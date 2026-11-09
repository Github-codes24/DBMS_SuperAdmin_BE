import express from 'express';
import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} from './userController.js';
import { protectSuperAdmin } from '../Authentication/authMiddleware.js';

const router = express.Router();

//Create User & Get Users List (Pagination, Search, Filters & Sort)
router
    .route('/')
    .post(protectSuperAdmin, createUser)
    .get(protectSuperAdmin, getUsers);

//Get User By ID, Update User, Delete User (Soft Delete)
router
    .route('/:userId')
    .get(protectSuperAdmin, getUserById)
    .patch(protectSuperAdmin, updateUser)
    .delete(protectSuperAdmin, deleteUser);

export default router;
