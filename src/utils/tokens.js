const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const REFRESH_TOKEN_BYTES = 40;
const REFRESH_TOKEN_TTL_DAYS = 30;
const ACCESS_TOKEN_TTL = '15m';

function generateAccessToken(user) {
    return jwt.sign(
        { userId: user.id, artistId: user.artist?.id ?? user.artistId, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function issueRefreshToken(userId) {
    const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
        data: { tokenHash, userId, expiresAt },
    });

    return rawToken;
}

async function findValidRefreshToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!row) return null;
    if (row.revokedAt) return null;
    if (row.expiresAt < new Date()) return null;

    return row;
}

async function revokeRefreshToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}

module.exports = {
    generateAccessToken,
    issueRefreshToken,
    findValidRefreshToken,
    revokeRefreshToken,
    hashToken,
};