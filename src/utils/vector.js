function toPgVector(vector) {
    return `[${vector.join(",")}]`;
}

module.exports = {
    toPgVector,
};