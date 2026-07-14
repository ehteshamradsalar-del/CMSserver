const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const {
    generateAccessToken,
    issueRefreshToken,
    findValidRefreshToken,
    revokeRefreshToken,
} = require('../utils/tokens');

const router = express.Router();

router.post('/signup', asyncHandler(async (req, res) => {
    const { email, password, name, country } = req.body;

    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new ApiError(409, 'Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            role: 'artist',
            artist: {
                create: { country: country || null },
            },
        },
        include: { artist: true },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    res.status(201).json({
        token: accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name },
    });
}));

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
        where: { email },
        include: { artist: true },
    });

    if (!user) {
        throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.password) {
        throw new ApiError(401, 'This account has no password set.');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        throw new ApiError(401, 'Invalid email or password');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    res.json({
        token: accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name },
    });
}));

router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        throw new ApiError(400, 'Missing refresh token');
    }

    const tokenRow = await findValidRefreshToken(refreshToken);
    if (!tokenRow) {
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({
        where: { id: tokenRow.userId },
        include: { artist: true },
    });
    if (!user) {
        throw new ApiError(401, 'Invalid or expired refresh token');
    }

    await revokeRefreshToken(refreshToken);
    const newRefreshToken = await issueRefreshToken(user.id);
    const newAccessToken = generateAccessToken(user);

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
}));

router.post('/logout', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        await revokeRefreshToken(refreshToken);
    }

    res.status(204).send();
}));

module.exports = router;